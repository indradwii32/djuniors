// ============================================
// Djuniors - Notifikasi WhatsApp per-CS (Fonnte)
// ============================================
// Setelan disimpan di tabel cs_wa_settings (satu baris per akun CS):
// token Fonnte pribadi + template pesan kustom + sakelar kirim-otomatis.
// Token kosong = fallback ke token global (settings.fonnte_token / env).
// Pengiriman otomatis terjadi saat: (a) pendaftaran lewat link CS,
// (b) pembayaran dikonfirmasi lewat menu Verifikasi.
// Pesan dirender dengan formatWATemplate — placeholder SATU kurung {nama}.

import { D1Database } from '@cloudflare/workers-types';
import { sendWAFonnte, getFonnteToken } from './fonnte';
import { formatWATemplate } from '../routes/notifications';

export type CsWaEvent = 'registration' | 'payment';

export interface CsWaSettingsRow {
    admin_account_id: string;
    fonnte_token: string;
    tpl_registration: string;
    tpl_payment: string;
    auto_registration: number;
    auto_payment: number;
    updated_at?: string;
}

export interface CsWaSendResult {
    status: 'sent' | 'failed' | 'skipped' | 'error';
    detail?: string;
}

// Template bawaan — dipakai saat CS belum pernah menyimpan setelan.
export const CS_WA_DEFAULT_TPL_REGISTRATION =
    'Halo {nama_orang_tua}! 👋\n\n' +
    'Terima kasih, pendaftaran D\'Juniors untuk {nama_anak} (kelas {kelas}, jadwal {jadwal}) ' +
    'dengan nomor pendaftaran {nomor_pendaftaran} sudah kami terima.\n\n' +
    'Untuk menyelesaikan pendaftaran, silakan transfer sesuai instruksi dan kirim bukti pembayaran ' +
    'melalui halaman lacak berikut:\n{link_pembayaran}\n\n' +
    'Salam,\n{cs_name} - D\'Juniors';

export const CS_WA_DEFAULT_TPL_PAYMENT =
    'Halo {nama_orang_tua}! ✅\n\n' +
    'Pembayaran pendaftaran D\'Juniors (no. {nomor_pendaftaran}, kelas {kelas}) sebesar {nominal} ' +
    'sudah kami konfirmasi.\n\n' +
    'Status: Lunas. Kelas siap diikuti — jadwal akan dikonfirmasi oleh tim kami.\n\n' +
    'Salam,\n{cs_name} - D\'Juniors';

/** Placeholder yang tersedia di template (untuk ditampilkan di UI). */
export const CS_WA_PLACEHOLDERS = [
    '{nama_orang_tua}',
    '{nama_anak}',
    '{kelas}',
    '{jadwal}',
    '{nomor_pendaftaran}',
    '{nominal}',
    '{link_pembayaran}',
    '{kota}',
    '{cs_name}',
];

export function maskToken(token: string): string {
    if (!token) return '';
    if (token.length > 8) {
        return token.slice(0, 4) + '•'.repeat(Math.min(token.length - 8, 12)) + token.slice(-4);
    }
    return '••••••••';
}

/** Cari akun CS berdasarkan kode ref-nya. */
export async function findAccountByRef(
    db: D1Database,
    refCode: string
): Promise<{ id: string; name: string; ref_code: string } | null> {
    return db
        .prepare('SELECT id, name, ref_code FROM admin_accounts WHERE ref_code = ?')
        .bind(refCode)
        .first();
}

/** Ambil setelan CS; null bila CS belum pernah menyimpan (→ pakai default). */
export async function getCsWaSettings(
    db: D1Database,
    accountId: string
): Promise<CsWaSettingsRow | null> {
    return db
        .prepare('SELECT * FROM cs_wa_settings WHERE admin_account_id = ?')
        .bind(accountId)
        .first<CsWaSettingsRow>();
}

/**
 * Payload settings untuk API: gabungan row + default.
 * Token dikembalikan dalam bentuk masked (tidak pernah utuh via GET).
 */
export function serializeCsWaSettings(row: CsWaSettingsRow | null) {
    const storedToken = (row?.fonnte_token || '').trim();
    return {
        fonnte_token_masked: maskToken(storedToken),
        fonnte_token_set: storedToken.length > 0,
        tpl_registration: row?.tpl_registration || CS_WA_DEFAULT_TPL_REGISTRATION,
        tpl_payment: row?.tpl_payment || CS_WA_DEFAULT_TPL_PAYMENT,
        auto_registration: row ? Boolean(row.auto_registration) : true,
        auto_payment: row ? Boolean(row.auto_payment) : true,
        is_default: !row,
        updated_at: row?.updated_at || null,
    };
}

/** Simpan (upsert) setelan milik satu akun CS. Token: '' = biarkan; clear_token = hapus. */
export async function saveCsWaSettings(
    db: D1Database,
    accountId: string,
    patch: {
        fonnte_token?: string;
        clear_token?: boolean;
        tpl_registration?: string;
        tpl_payment?: string;
        auto_registration?: boolean;
        auto_payment?: boolean;
    }
): Promise<void> {
    const existing = await getCsWaSettings(db, accountId);

    let token = existing?.fonnte_token || '';
    if (patch.clear_token) token = '';
    else if (typeof patch.fonnte_token === 'string' && patch.fonnte_token.trim() !== '') {
        token = patch.fonnte_token.trim();
    }

    const tplReg =
        typeof patch.tpl_registration === 'string'
            ? patch.tpl_registration
            : existing?.tpl_registration || CS_WA_DEFAULT_TPL_REGISTRATION;
    const tplPay =
        typeof patch.tpl_payment === 'string'
            ? patch.tpl_payment
            : existing?.tpl_payment || CS_WA_DEFAULT_TPL_PAYMENT;
    const autoReg =
        typeof patch.auto_registration === 'boolean'
            ? patch.auto_registration
            : existing
              ? Boolean(existing.auto_registration)
              : true;
    const autoPay =
        typeof patch.auto_payment === 'boolean'
            ? patch.auto_payment
            : existing
              ? Boolean(existing.auto_payment)
              : true;

    await db
        .prepare(
            `INSERT INTO cs_wa_settings (admin_account_id, fonnte_token, tpl_registration, tpl_payment, auto_registration, auto_payment, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(admin_account_id) DO UPDATE SET
                fonnte_token = excluded.fonnte_token,
                tpl_registration = excluded.tpl_registration,
                tpl_payment = excluded.tpl_payment,
                auto_registration = excluded.auto_registration,
                auto_payment = excluded.auto_payment,
                updated_at = CURRENT_TIMESTAMP`
        )
        .bind(accountId, token, tplReg, tplPay, autoReg ? 1 : 0, autoPay ? 1 : 0)
        .run();
}

/** Render template dengan data registrasi (+ nama CS sebagai {cs_name}). */
export function renderCsWaMessage(
    template: string,
    registration: Record<string, unknown>,
    csName: string,
    baseUrl?: string
): string {
    return formatWATemplate(template, { ...registration, cs_name: csName }, { baseUrl });
}

async function logWa(
    db: D1Database,
    type: string,
    title: string,
    message: string,
    status: 'sent' | 'failed'
): Promise<void> {
    await db
        .prepare(
            `INSERT INTO notifications (id, user_id, type, channel, title, message, status)
             VALUES (?, NULL, ?, 'wa', ?, ?, ?)`
        )
        .bind(crypto.randomUUID(), type, title, message, status)
        .run();
}

/**
 * Kirim notifikasi WhatsApp otomatis untuk sebuah pendaftaran memakai
 * setelan milik CS pemilik link (ref_code). Selalu aman dipanggil:
 * kegagalan tidak pernah melempar exception — hasil dikembalikan sebagai
 * { status: sent | failed | skipped | error } dan log ditulis ke tabel
 * notifications (kecuali skipped).
 */
export async function sendCsWaAuto(
    env: { DB: D1Database; WA_FONNTE_TOKEN?: string; BASE_URL?: string },
    registration: Record<string, unknown> & {
        ref_code?: string | null;
        parent_phone?: string;
        registration_number?: string;
    },
    event: CsWaEvent,
    opts?: { baseUrl?: string; csName?: string }
): Promise<CsWaSendResult> {
    try {
        const refCode = registration.ref_code;
        if (!refCode) return { status: 'skipped', detail: 'tanpa_ref_cs' };
        if (!registration.parent_phone) return { status: 'skipped', detail: 'tanpa_nomor' };

        const account = await findAccountByRef(env.DB, refCode);
        if (!account) return { status: 'skipped', detail: 'cs_tidak_ditemukan' };

        const settings = await getCsWaSettings(env.DB, account.id);
        if (!settings) return { status: 'skipped', detail: 'cs_belum_setelan' };

        const autoOn = event === 'registration' ? settings.auto_registration : settings.auto_payment;
        if (!autoOn) return { status: 'skipped', detail: 'otomatis_dimatikan' };

        const template =
            (event === 'registration' ? settings.tpl_registration : settings.tpl_payment) ||
            (event === 'registration'
                ? CS_WA_DEFAULT_TPL_REGISTRATION
                : CS_WA_DEFAULT_TPL_PAYMENT);

        const token = (settings.fonnte_token || '').trim() || (await getFonnteToken(env));
        if (!token) return { status: 'skipped', detail: 'token_kosong' };

        const message = renderCsWaMessage(
            template,
            registration,
            opts?.csName || account.name || 'CS D\'Juniors',
            opts?.baseUrl || env.BASE_URL
        );
        if (!message.trim()) return { status: 'skipped', detail: 'pesan_kosong' };

        const result = await sendWAFonnte({ token }, registration.parent_phone, message, {
            typing: true,
            delay: 0,
        });

        await logWa(
            env.DB,
            `cs_${event}`,
            `${event === 'registration' ? 'Pendaftaran' : 'Pembayaran'} → ${registration.registration_number}`,
            message,
            result.status ? 'sent' : 'failed'
        );

        return {
            status: result.status ? 'sent' : 'failed',
            detail: result.message || (result.status ? 'ok' : 'gagal_dari_fonnte'),
        };
    } catch (err) {
        console.error('[cs-wa] auto send error:', err);
        return { status: 'error', detail: err instanceof Error ? err.message : 'unknown' };
    }
}
