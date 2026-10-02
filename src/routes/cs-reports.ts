// ============================================================
// Djuniors - Laporan Harian CS
// ============================================================
// Menu "Laporan" untuk role CS. Isi laporan per tanggal:
//
//   * chat_masuk       — diisi MANUAL oleh CS (jumlah chat masuk hari itu).
//   * total_pendaftar  — dihitung server dari registrations (tanggal daftar).
//   * total_closing    — dihitung server dari registrations lunas (paid_at).
//   * persen_closing   — closing / pendaftar untuk tanggal itu.
//
// Hanya chat_masuk yang diinput manual. Angka lain sengaja dihitung server
// supaya tidak mungkin menyimpang dari data pendaftaran.
//
// Aturan yang dipegang kode ini:
//   * Tidak ada endpoint DELETE. Laporan hanya dibuat/diperbarui (UPSERT pada
//     UNIQUE(cs_account_id, report_date)) — tidak bisa dihapus.
//   * CS hanya boleh melihat/mengubah laporannya sendiri.
//   * Admin boleh melihat semua CS lewat ?ref=KODE, atau agregat semua tanpa ref.
//   * report_date boleh lampau (backfill), tapi tidak boleh masa depan.

import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { adminAuthMiddleware, getStaffRefCode, isCSRole } from '../middleware/auth';
import { resolveAccountDisplayName } from '../utils/cs-wa';

const reports = new Hono<{ Bindings: Bindings; Variables: Variables }>();

type CsAccount = { id: string; name: string; display_name?: string | null; ref_code: string | null };

/** Batas hari ke depan: 0 = laporan hanya untuk hari ini atau lampau. */
const MAX_DAYS_AHEAD = 0;
/** Batas backfill: berapa hari ke belakang CS boleh mengisi laporan. */
const MAX_DAYS_PAST = 400;
/** Panjang maksimum catatan bebas. */
const MAX_NOTE_LEN = 500;
/** Batas jumlah baris yang dikembalikan per request. */
const MAX_ROWS = 200;

type OwnerResult =
    | { ok: true; account: CsAccount | null; refCode: string | null }
    | { ok: false; status: number; error: string; message: string };

/** Tanggal hari ini dalam zona WIB (UTC+7) sebagai YYYY-MM-DD. */
function todayWib(): string {
    return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function addDays(isoDate: string, delta: number): string {
    const d = new Date(`${isoDate}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
}

function isIsoDate(v: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * Validasi tanggal YYYY-MM-DD yang benar-benar ada di kalender (tolak
 * 2026-02-31) lalu cek rentangnya terhadap hari ini WIB.
 */
function validateReportDate(input: unknown): { date: string } | { error: string } {
    const date = String(input ?? '').trim();
    if (!isIsoDate(date)) {
        return { error: 'Tanggal tidak valid — format harus YYYY-MM-DD' };
    }
    // Diurai sebagai UTC tengah malam supaya perbandingan tidak meleset
    // karena offset zona waktu server.
    const parsed = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
        return { error: 'Tanggal tidak valid' };
    }
    if (parsed.toISOString().slice(0, 10) !== date) {
        return { error: 'Tanggal tidak ada di kalender' };
    }

    const today = todayWib();
    if (date > addDays(today, MAX_DAYS_AHEAD)) {
        return { error: 'Tanggal laporan tidak boleh di masa depan' };
    }
    if (date < addDays(today, -MAX_DAYS_PAST)) {
        return { error: `Tidak bisa mengisi laporan lebih dari ${MAX_DAYS_PAST} hari ke belakang` };
    }
    return { date };
}

/**
 * Resolusi akun CS pemilik laporan.
 *   CS    → selalu akunnya sendiri; tidak bisa diarahkan ke CS lain.
 *   Admin → ?ref=KODE / ?account_id= wajib bila requireExplicit; tanpa itu
 *           dikembalikan account=null (agregat semua CS).
 */
async function resolveOwner(
    c: any,
    payload: any,
    requireExplicit: boolean
): Promise<OwnerResult> {
    if (isCSRole(payload)) {
        const refCode = await getStaffRefCode(c);
        if (!refCode) {
            return {
                ok: false,
                status: 403,
                error: 'No ref code',
                message: 'Akun CS Anda belum memiliki kode link. Hubungi administrator.',
            };
        }
        // Kalau CS mengirim ?ref= yang menunjuk CS lain, tolak alih-alih
        // diam-diam mengabaikannya — menulis diam-diam ke akun sendiri
        // sementara admin mengira sudah tercatat untuk CS lain lebih berbahaya
        // daripada error yang jelas.
        const askedRef = (c.req.query('ref') || '').trim();
        const askedAccount = (c.req.query('account_id') || '').trim();
        if (askedRef && askedRef !== refCode) {
            return {
                ok: false,
                status: 403,
                error: 'Forbidden',
                message: 'Anda hanya dapat menulis laporan untuk CS Anda sendiri',
            };
        }
        const acc = await c.env.DB.prepare(
            'SELECT id, name, display_name, ref_code FROM admin_accounts WHERE id = ?'
        ).bind(payload.userId).first();
        if (!acc) {
            return { ok: false, status: 403, error: 'Forbidden', message: 'Akun CS tidak ditemukan' };
        }
        // account_id juga harus milik CS itu sendiri bila dikirim.
        if (askedAccount && askedAccount !== (acc.id as string)) {
            return {
                ok: false,
                status: 403,
                error: 'Forbidden',
                message: 'Anda hanya dapat menulis laporan untuk CS Anda sendiri',
            };
        }
        return { ok: true, account: acc as CsAccount, refCode };
    }

    const ref = (c.req.query('ref') || '').trim();
    const accountId = (c.req.query('account_id') || '').trim();

    if (!ref && !accountId) {
        if (requireExplicit) {
            return {
                ok: false,
                status: 400,
                error: 'Missing ref',
                message: 'Tentukan CS dengan ?ref=KODE (atau ?account_id=)',
            };
        }
        return { ok: true, account: null, refCode: null };
    }

    const acc = ref
        ? await c.env.DB.prepare(
              'SELECT id, name, display_name, ref_code FROM admin_accounts WHERE ref_code = ?'
          ).bind(ref).first()
        : await c.env.DB.prepare(
              'SELECT id, name, display_name, ref_code FROM admin_accounts WHERE id = ?'
          ).bind(accountId).first();

    if (!acc) {
        return { ok: false, status: 404, error: 'Not found', message: 'Akun CS tidak ditemukan' };
    }
    return { ok: true, account: acc as CsAccount, refCode: (acc.ref_code as string) || null };
}

/** Hitung persen closing; 0 bila tidak ada pendaftar (bukan NaN/∞). */
function persen(closing: number, total: number): number {
    return total > 0 ? Math.round((closing / total) * 1000) / 10 : 0;
}

/**
 * GET /api/cs/reports
 * Daftar laporan + rekap pendaftar/closing per tanggal.
 *   CS    → laporannya sendiri.
 *   Admin → ?ref=KODE untuk satu CS; tanpa ref untuk semua CS.
 * Filter: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
reports.get('/reports', adminAuthMiddleware, async (c) => {
    const payload = c.get('jwtPayload');
    const owner = await resolveOwner(c, payload, false);
    if (!owner.ok) {
        return c.json({ error: owner.error, message: owner.message }, owner.status as 400);
    }
    const refCode = owner.refCode;

    const from = (c.req.query('from') || '').trim();
    const to = (c.req.query('to') || '').trim();
    if (from && !isIsoDate(from)) {
        return c.json({ error: 'Invalid from', message: 'Format from harus YYYY-MM-DD' }, 400);
    }
    if (to && !isIsoDate(to)) {
        return c.json({ error: 'Invalid to', message: 'Format to harus YYYY-MM-DD' }, 400);
    }
    if (from && to && from > to) {
        return c.json({ error: 'Invalid range', message: 'from tidak boleh melewati to' }, 400);
    }

    // Placeholder `?` harus diisi berurutan sesuai kemunculannya di SQL:
    //   1) ref di subquery pendaftaran, 2) ref di subquery closing,
    //   3) ref di WHERE utama, 4) filter tanggal, 5) limit/offset.
    const binds: any[] = [];
    if (refCode) binds.push(refCode, refCode, refCode);
    if (from) binds.push(from);
    if (to) binds.push(to);
    binds.push(MAX_ROWS, 0);

    const refInReg = refCode ? 'AND ref_code = ?' : '';
    const refInWhere = refCode ? 'AND d.cs_account_id IN (SELECT id FROM admin_accounts WHERE ref_code = ?)' : '';
    const dateSql = `${from ? 'AND d.report_date >= ?' : ''}${to ? 'AND d.report_date <= ?' : ''}`;

    const rows = await c.env.DB.prepare(`
        SELECT
            d.report_date,
            d.cs_account_id,
            COALESCE(NULLIF(TRIM(a.display_name), ''), a.name) AS cs_name,
            a.ref_code,
            d.chat_masuk,
            d.catatan,
            d.created_at,
            d.updated_at,
            COALESCE(p.total_pendaftar, 0) AS total_pendaftar,
            COALESCE(cl.total_closing, 0)   AS total_closing
        FROM cs_daily_reports d
        JOIN admin_accounts a ON a.id = d.cs_account_id
        LEFT JOIN (
            SELECT date(created_at) AS day, COUNT(*) AS total_pendaftar
            FROM registrations
            WHERE 1=1 ${refInReg}
            GROUP BY date(created_at)
        ) p ON p.day = d.report_date
        LEFT JOIN (
            SELECT date(paid_at) AS day, COUNT(*) AS total_closing
            FROM registrations
            WHERE paid_at IS NOT NULL AND payment_status = 'paid' ${refInReg}
            GROUP BY date(paid_at)
        ) cl ON cl.day = d.report_date
        WHERE 1=1 ${refInWhere} ${dateSql}
        ORDER BY d.report_date DESC
        LIMIT ? OFFSET ?
    `).bind(...binds).all();

    return c.json({
        success: true,
        scope: refCode || 'all',
        data: (rows.results || []).map((r: any) => {
            const total = Number(r.total_pendaftar) || 0;
            const closing = Number(r.total_closing) || 0;
            return {
                report_date: r.report_date,
                cs_account_id: r.cs_account_id,
                cs_name: r.cs_name,
                ref_code: r.ref_code,
                chat_masuk: Number(r.chat_masuk) || 0,
                catatan: r.catatan || null,
                total_pendaftar: total,
                total_closing: closing,
                persen_closing: persen(closing, total),
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
        }),
    });
});

/**
 * GET /api/cs/reports/summary
 * Deret harian (default 30 hari terakhir) untuk tabel persentase.
 * Tanggal tanpa laporan manual tetap muncul selama ada pendaftaran atau
 * closing, jadi grafik tidak bolong hanya karena CS belum isi chat_masuk.
 */
reports.get('/reports/summary', adminAuthMiddleware, async (c) => {
    const payload = c.get('jwtPayload');
    const owner = await resolveOwner(c, payload, false);
    if (!owner.ok) {
        return c.json({ error: owner.error, message: owner.message }, owner.status as 400);
    }
    const refCode = owner.refCode;

    const from = (c.req.query('from') || '').trim() || addDays(todayWib(), -29);
    const to = (c.req.query('to') || '').trim() || todayWib();
    if (!isIsoDate(from)) {
        return c.json({ error: 'Invalid from', message: 'Format from harus YYYY-MM-DD' }, 400);
    }
    if (!isIsoDate(to)) {
        return c.json({ error: 'Invalid to', message: 'Format to harus YYYY-MM-DD' }, 400);
    }
    if (from > to) {
        return c.json({ error: 'Invalid range', message: 'from tidak boleh melewati to' }, 400);
    }

    const refFilter = refCode ? 'AND ref_code = ?' : '';
    // Saat ref_code ada, owner.account pasti terisi (lihat resolveOwner), jadi
    // join ke laporan bisa memakai id akun langsung — lebih jelas daripada
    // subquery dan tidak menambah placeholder.
    const accountId = owner.account?.id;
    const joinAccount = refCode ? 'AND dr.cs_account_id = ?' : '';

    // Urutan placeholder harus sama persis dengan kemunculannya di SQL:
    //   CTE pendaftaran : from, to, ref          (3)
    //   CTE closing     : from, to, ref          (3)
    //   LEFT JOIN laporan: id akun               (1, hanya bila refCode)
    //   WHERE           : from, to               (2)
    const binds: any[] = [from, to];
    if (refCode) binds.push(refCode);
    binds.push(from, to);
    if (refCode) binds.push(refCode);
    if (refCode) binds.push(accountId);
    binds.push(from, to);

    const rows = await c.env.DB.prepare(`
        WITH events AS (
            SELECT date(created_at) AS day, COUNT(*) AS n, 0 AS closed
            FROM registrations
            WHERE date(created_at) BETWEEN ? AND ? ${refFilter}
            GROUP BY date(created_at)
            UNION ALL
            SELECT date(paid_at) AS day, 0 AS n, COUNT(*) AS closed
            FROM registrations
            WHERE paid_at IS NOT NULL AND payment_status = 'paid'
              AND date(paid_at) BETWEEN ? AND ? ${refFilter}
            GROUP BY date(paid_at)
        ),
        agg AS (
            SELECT day, SUM(n) AS total_pendaftar, SUM(closed) AS total_closing
            FROM events
            GROUP BY day
        )
        SELECT
            agg.day AS report_date,
            agg.total_pendaftar,
            agg.total_closing,
            COALESCE(dr.chat_masuk, 0) AS chat_masuk
        FROM agg
        LEFT JOIN cs_daily_reports dr
            ON dr.report_date = agg.day ${joinAccount}
        WHERE agg.day BETWEEN ? AND ?
        ORDER BY agg.day ASC
    `).bind(...binds).all();

    const data = (rows.results || []).map((r: any) => {
        const total = Number(r.total_pendaftar) || 0;
        const closing = Number(r.total_closing) || 0;
        return {
            report_date: r.report_date,
            chat_masuk: Number(r.chat_masuk) || 0,
            total_pendaftar: total,
            total_closing: closing,
            persen_closing: persen(closing, total),
        };
    });

    const sumTotal = data.reduce((a, r) => a + r.total_pendaftar, 0);
    const sumClosing = data.reduce((a, r) => a + r.total_closing, 0);
    const sumChat = data.reduce((a, r) => a + r.chat_masuk, 0);

    return c.json({
        success: true,
        scope: refCode || 'all',
        from,
        to,
        data,
        totals: {
            total_pendaftar: sumTotal,
            total_closing: sumClosing,
            total_chat_masuk: sumChat,
            persen_closing: persen(sumClosing, sumTotal),
        },
    });
});

/**
 * PUT /api/cs/reports
 * Simpan laporan satu tanggal: buat bila belum ada, perbarui bila ada.
 * Tidak ada DELETE — data historis tidak bisa dihapus.
 * Body: { report_date, chat_masuk, catatan? }  (+ ?ref= untuk admin)
 */
reports.put('/reports', adminAuthMiddleware, async (c) => {
    const payload = c.get('jwtPayload');
    const owner = await resolveOwner(c, payload, true);
    if (!owner.ok) {
        return c.json({ error: owner.error, message: owner.message }, owner.status as 400);
    }
    if (!owner.account) {
        return c.json({ error: 'Missing ref', message: 'Tentukan CS dengan ?ref=KODE' }, 400);
    }

    const body = await c.req.json<any>();
    const dateCheck = validateReportDate(body?.report_date);
    if ('error' in dateCheck) {
        return c.json({ error: 'Invalid report_date', message: dateCheck.error }, 400);
    }

    // chat_masuk wajib diisi eksplisit. Tidak ada default 0 diam-diam supaya
    // tidak tercatat "0 chat" padahal CS sebenarnya belum mengisinya.
    const rawChat = body?.chat_masuk;
    if (rawChat === undefined || rawChat === null || rawChat === '') {
        return c.json({ error: 'Missing chat_masuk', message: 'Jumlah chat masuk wajib diisi' }, 400);
    }
    const chat = Number(rawChat);
    if (!Number.isInteger(chat) || chat < 0 || chat > 100000) {
        return c.json({
            error: 'Invalid chat_masuk',
            message: 'Jumlah chat harus bilangan bulat antara 0 dan 100000',
        }, 400);
    }

    const catatan =
        typeof body?.catatan === 'string' && body.catatan.trim() !== ''
            ? body.catatan.trim().slice(0, MAX_NOTE_LEN)
            : null;

    // UPSERT satu baris per (CS, tanggal). created_at sengaja tidak
    // di-overwrite supaya jejak "kapan pertama diisi" tetap utuh saat update.
    await c.env.DB.prepare(`
        INSERT INTO cs_daily_reports (id, cs_account_id, report_date, chat_masuk, catatan)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(cs_account_id, report_date) DO UPDATE SET
            chat_masuk = excluded.chat_masuk,
            catatan = excluded.catatan,
            updated_at = CURRENT_TIMESTAMP
    `).bind(crypto.randomUUID(), owner.account.id, dateCheck.date, chat, catatan).run();

    // Rekap dihitung ulang di server supaya angka yang tampil di UI berasal
    // dari data pendaftaran, bukan angka kiriman client.
    const refCode = owner.refCode;
    const refFilter = refCode ? 'AND ref_code = ?' : '';
    const binds = refCode
        ? [refCode, dateCheck.date, refCode, dateCheck.date]
        : [dateCheck.date, dateCheck.date];

    const stats = await c.env.DB.prepare(`
        SELECT
            (SELECT COUNT(*) FROM registrations
              WHERE date(created_at) = ? ${refFilter}) AS total_pendaftar,
            (SELECT COUNT(*) FROM registrations
              WHERE paid_at IS NOT NULL AND payment_status = 'paid'
                AND date(paid_at) = ? ${refFilter}) AS total_closing
    `).bind(...binds).first();

    const total = Number(stats?.total_pendaftar) || 0;
    const closing = Number(stats?.total_closing) || 0;

    return c.json({
        success: true,
        report: {
            report_date: dateCheck.date,
            cs_account_id: owner.account.id,
            cs_name: resolveAccountDisplayName(owner.account),
            ref_code: owner.account.ref_code,
            chat_masuk: chat,
            catatan,
            total_pendaftar: total,
            total_closing: closing,
            persen_closing: persen(closing, total),
        },
        message: 'Laporan tersimpan',
    });
});

export default reports;
