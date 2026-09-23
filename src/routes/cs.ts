// ============================================
// Djuniors - CS Link & Tracking Routes
// ============================================
// GET /api/cs/overview
// Statistik ringkas untuk dashboard CS (dan admin yang melihat per-CS
// dengan ?ref=KODE). Termasuk kode ref + jumlah antrian verifikasi milik CS.

import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { adminAuthMiddleware, getStaffRefCode, isCSRole } from '../middleware/auth';
import { getFonnteToken, sendWAFonnte } from '../utils/fonnte';
import {
    getCsWaSettings,
    saveCsWaSettings,
    serializeCsWaSettings,
    findAccountByRef,
    renderCsWaMessage,
    CS_WA_DEFAULT_TPL_REGISTRATION,
    CS_WA_DEFAULT_TPL_PAYMENT,
    CS_WA_PLACEHOLDERS,
} from '../utils/cs-wa';

const cs = new Hono<{ Bindings: Bindings; Variables: Variables }>();

type WaAccount = { id: string; name: string; ref_code: string | null };
type WaAccountErr = { status: number; error: string; message: string };
function isWaErr(v: WaAccount | WaAccountErr): v is WaAccountErr {
    return 'status' in v;
}

/**
 * Resolusi akun CS yang menjadi pemilik setelan WhatsApp.
 * CS: selalu akunnya sendiri. Admin: wajib ?ref=KODE atau ?account_id=.
 */
async function resolveWaAccount(c: any, payload: any): Promise<WaAccount | WaAccountErr> {
    if (isCSRole(payload)) {
        const acc = await c.env.DB.prepare(
            'SELECT id, name, ref_code FROM admin_accounts WHERE id = ?'
        ).bind(payload.userId).first();
        if (!acc) return { status: 403, error: 'Forbidden', message: 'Akun CS tidak ditemukan' };
        return acc as WaAccount;
    }
    const ref = (c.req.query('ref') || '').trim();
    const accountId = (c.req.query('account_id') || '').trim();
    let acc: WaAccount | null = null;
    if (ref) acc = await findAccountByRef(c.env.DB, ref);
    else if (accountId) {
        acc = await c.env.DB.prepare(
            'SELECT id, name, ref_code FROM admin_accounts WHERE id = ?'
        ).bind(accountId).first();
    }
    if (!acc) {
        return {
            status: 400,
            error: 'Missing ref',
            message: 'Tentukan CS dengan ?ref=KODE (atau ?account_id=)',
        };
    }
    return acc;
}

async function logWaManual(
    db: any,
    type: string,
    title: string,
    message: string,
    ok: boolean
): Promise<void> {
    await db.prepare(
        `INSERT INTO notifications (id, user_id, type, channel, title, message, status)
         VALUES (?, NULL, ?, 'wa', ?, ?, ?)`
    ).bind(crypto.randomUUID(), type, title, message, ok ? 'sent' : 'failed').run();
}

cs.get('/overview', adminAuthMiddleware, async (c) => {
    const payload = c.get('jwtPayload');

    let refCode: string | null;
    if (payload.role === 'cs') {
        refCode = await getStaffRefCode(c);
        if (!refCode) {
            return c.json({
                error: 'No ref code',
                message: 'Akun CS Anda belum memiliki kode link. Hubungi administrator.',
            }, 403);
        }
    } else {
        // Admin: ?ref=KODE → per-CS; tanpa ref → agregat semua CS.
        refCode = (c.req.query('ref') || '').trim() || null;
    }

    const where = refCode ? 'WHERE ref_code = ?' : '';
    const binds = refCode ? [refCode] : [];

    const stats = await c.env.DB.prepare(`
        SELECT COUNT(*) AS total,
               COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END), 0) AS paid,
               COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN final_amount ELSE 0 END), 0) AS revenue,
               COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END), 0) AS verifying
        FROM registrations
        ${where}
    `).bind(...binds).first();

    const queue = await c.env.DB.prepare(`
        SELECT COUNT(*) AS n
        FROM payment_tracking pt
        LEFT JOIN registrations r
            ON (pt.registration_id = r.id OR pt.registration_number = r.registration_number)
        ${refCode ? 'WHERE r.ref_code = ? AND' : 'WHERE'} pt.status = 'pending'
          AND pt.proof_url IS NOT NULL AND pt.proof_url != ''
    `).bind(...(refCode ? [refCode] : [])).first();

    return c.json({
        success: true,
        ref_code: refCode,
        total: Number(stats?.total) || 0,
        paid: Number(stats?.paid) || 0,
        revenue: Number(stats?.revenue) || 0,
        verifying: Number(stats?.verifying) || 0,
        pending_verification: Number(queue?.n) || 0,
    });
});

// ============================================================
// Setelan Fonnte + pesan WhatsApp per-CS
// ============================================================

/** GET /api/cs/wa-settings — ambil setelan (token selalu masked). */
cs.get('/wa-settings', adminAuthMiddleware, async (c) => {
    const payload = c.get('jwtPayload');
    const account = await resolveWaAccount(c, payload);
    if (isWaErr(account)) return c.json({ error: account.error, message: account.message }, account.status as 400);

    const row = await getCsWaSettings(c.env.DB, account.id);
    const globalToken = (await getFonnteToken(c.env)).trim();

    return c.json({
        success: true,
        account: { id: account.id, name: account.name, ref_code: account.ref_code },
        settings: serializeCsWaSettings(row),
        placeholders: CS_WA_PLACEHOLDERS,
        global_token_set: globalToken.length > 0,
    });
});

/** PUT /api/cs/wa-settings — simpan setelan Fonnte + template milik satu CS. */
cs.put('/wa-settings', adminAuthMiddleware, async (c) => {
    const payload = c.get('jwtPayload');
    const account = await resolveWaAccount(c, payload);
    if (isWaErr(account)) return c.json({ error: account.error, message: account.message }, account.status as 400);

    const body = await c.req.json() as any;

    for (const key of ['tpl_registration', 'tpl_payment'] as const) {
        if (body[key] !== undefined && typeof body[key] === 'string' && body[key].length > 3000) {
            return c.json({ error: 'Template too long', message: `Template ${key} maksimal 3000 karakter` }, 400);
        }
    }

    await saveCsWaSettings(c.env.DB, account.id, {
        fonnte_token: typeof body.fonnte_token === 'string' ? body.fonnte_token : undefined,
        clear_token: body.clear_token === true,
        tpl_registration: typeof body.tpl_registration === 'string' ? body.tpl_registration : undefined,
        tpl_payment: typeof body.tpl_payment === 'string' ? body.tpl_payment : undefined,
        auto_registration: typeof body.auto_registration === 'boolean' ? body.auto_registration : undefined,
        auto_payment: typeof body.auto_payment === 'boolean' ? body.auto_payment : undefined,
    });

    const row = await getCsWaSettings(c.env.DB, account.id);
    return c.json({ success: true, settings: serializeCsWaSettings(row) });
});

/** Registrasi + akun CS-nya (untuk preview & kirim manual, dengan scoping). */
async function loadScopedRegistration(c: any, payload: any) {
    const registrationId = (c.req.query('registration_id') || (await c.req.json?.() ?? {}).registration_id || '').trim();
    if (!registrationId) return { err: { status: 400, error: 'Missing registration_id' } as const };

    const reg = await c.env.DB.prepare('SELECT * FROM registrations WHERE id = ?')
        .bind(registrationId).first();
    if (!reg) return { err: { status: 404, error: 'Registration not found' } as const };

    let csAccount: WaAccount | null = null;
    if (reg.ref_code) {
        csAccount = await findAccountByRef(c.env.DB, reg.ref_code as string);
    }
    if (isCSRole(payload)) {
        const ownRef = await getStaffRefCode(c);
        if (!ownRef || reg.ref_code !== ownRef) {
            return { err: { status: 403, error: 'Forbidden', message: 'Hanya pendaftaran dari link Anda' } as const };
        }
        if (!csAccount) {
            const own = await c.env.DB.prepare(
                'SELECT id, name, ref_code FROM admin_accounts WHERE id = ?'
            ).bind(payload.userId).first();
            csAccount = own as WaAccount | null;
        }
    }
    return { reg, csAccount };
}

/** GET /api/cs/wa-preview?registration_id=&event= — isi-awal pesan sebelum kirim manual. */
cs.get('/wa-preview', adminAuthMiddleware, async (c) => {
    const payload = c.get('jwtPayload');
    const event = c.req.query('event') === 'registration' ? 'registration' : 'payment';

    const loaded = await loadScopedRegistration(c, payload);
    if ('err' in loaded && loaded.err) {
        const e = loaded.err;
        return c.json({ error: e.error, message: (e as any).message || e.error }, e.status as 400);
    }
    const { reg, csAccount } = loaded as { reg: any; csAccount: WaAccount | null };

    let tpl = event === 'registration' ? CS_WA_DEFAULT_TPL_REGISTRATION : CS_WA_DEFAULT_TPL_PAYMENT;
    if (csAccount) {
        const row = await getCsWaSettings(c.env.DB, csAccount.id);
        const stored = (event === 'registration' ? row?.tpl_registration : row?.tpl_payment) || '';
        if (stored.trim()) tpl = stored;
    }

    const baseUrl = (c.env as any).BASE_URL || new URL(c.req.url).origin;
    const message = renderCsWaMessage(tpl, reg, csAccount?.name || 'CS D\'Juniors', baseUrl);

    return c.json({
        success: true,
        phone: reg.parent_phone,
        message,
        ref_code: reg.ref_code || null,
        event,
    });
});

/** POST /api/cs/wa-send { registration_id, message, phone? } — kirim manual ke pendaftar. */
cs.post('/wa-send', adminAuthMiddleware, async (c) => {
    const payload = c.get('jwtPayload');
    const body = await c.req.json() as any;

    const reg = await c.env.DB.prepare('SELECT * FROM registrations WHERE id = ?')
        .bind(String(body.registration_id || '')).first();
    if (!reg) return c.json({ error: 'Registration not found' }, 404);

    let csAccount: WaAccount | null = reg.ref_code
        ? await findAccountByRef(c.env.DB, reg.ref_code as string)
        : null;
    if (isCSRole(payload)) {
        const ownRef = await getStaffRefCode(c);
        if (!ownRef || reg.ref_code !== ownRef) {
            return c.json({ error: 'Forbidden', message: 'Hanya pendaftaran dari link Anda' }, 403);
        }
        if (!csAccount) {
            csAccount = (await c.env.DB.prepare(
                'SELECT id, name, ref_code FROM admin_accounts WHERE id = ?'
            ).bind(payload.userId).first()) as WaAccount | null;
        }
    }

    const message = String(body.message || '').trim();
    if (!message) return c.json({ error: 'Message required', message: 'Pesan wajib diisi' }, 400);
    if (message.length > 3000) return c.json({ error: 'Message too long', message: 'Pesan maksimal 3000 karakter' }, 400);

    const phone = String(body.phone || '').trim() || String(reg.parent_phone || '');
    if (!phone) return c.json({ error: 'Phone required', message: 'Nomor WhatsApp tidak tersedia' }, 400);

    let token = '';
    if (csAccount) {
        token = ((await getCsWaSettings(c.env.DB, csAccount.id))?.fonnte_token || '').trim();
    }
    if (!token) token = (await getFonnteToken(c.env)).trim();
    if (!token) {
        return c.json({
            error: 'No token',
            message: 'Token Fonnte belum diisi (setelan CS atau gateway global)',
        }, 400);
    }

    const result = await sendWAFonnte({ token }, phone, message, { typing: true, delay: 0 });
    await logWaManual(
        c.env.DB,
        'cs_manual',
        `Manual → ${reg.registration_number}`,
        message,
        result.status
    );

    return c.json({
        success: result.status,
        status: result.status ? 'sent' : 'failed',
        message: result.status ? 'Pesan terkirim' : `Gagal mengirim: ${result.message || 'error dari Fonnte'}`,
    }, result.status ? 200 : 502);
});

/** POST /api/cs/wa-test { phone, message? } — kirim pesan tes dengan token CS aktif. */
cs.post('/wa-test', adminAuthMiddleware, async (c) => {
    const payload = c.get('jwtPayload');
    const account = await resolveWaAccount(c, payload);
    if (isWaErr(account)) return c.json({ error: account.error, message: account.message }, account.status as 400);

    const body = await c.req.json() as any;
    const phone = String(body.phone || '').trim();
    if (!phone) return c.json({ error: 'Phone required', message: 'Nomor tujuan wajib diisi' }, 400);

    const message = String(body.message || '').trim() ||
        `✅ *Tes Notifikasi WhatsApp D'Juniors*\n\nHalo! Ini adalah pesan tes dari akun CS *${account.name}*.\nJika Anda menerima pesan ini, koneksi Fonnte aktif.`;

    let token = ((await getCsWaSettings(c.env.DB, account.id))?.fonnte_token || '').trim();
    if (!token) token = (await getFonnteToken(c.env)).trim();
    if (!token) {
        return c.json({ error: 'No token', message: 'Token Fonnte belum diisi (setelan CS atau gateway global)' }, 400);
    }

    const result = await sendWAFonnte({ token }, phone, message, { typing: false, delay: 0 });
    await logWaManual(c.env.DB, 'cs_test', `Tes → ${account.ref_code || account.id}`, message, result.status);

    return c.json({
        success: result.status,
        status: result.status ? 'sent' : 'failed',
        source: ((await getCsWaSettings(c.env.DB, account.id))?.fonnte_token || '').trim() ? 'cs_token' : 'global_token',
        message: result.status ? 'Pesan tes terkirim' : `Gagal: ${result.message || 'error dari Fonnte'}`,
    }, result.status ? 200 : 502);
});

export default cs;
