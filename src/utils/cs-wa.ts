// ============================================
// Djuniors - Notifikasi WhatsApp otomatis (Fonnte)
// ============================================
// Isi pesan diambil dari editor template (tabel wa_templates) — SATU sumber
// untuk semua role. Sebelumnya ada dua: editor + cs_wa_settings.tpl_*; dua
// sumber membuat pesan untuk event yang sama bisa berbeda, dan tidak ada cara
// tahu mana yang benar. Kolom tpl_* sudah tidak dipakai dan dibiarkan apa
// adanya (data lama tidak dibuang).
//
// Token: milik CS (cs_wa_settings.fonnte_token) = primary; token global
// (settings.fonnte_token / env) = cadangan, dipakai hanya bila primary kosong
// atau ditolak Fonnte, supaya notifikasi tetap terkirim.
//
// Saklar on/off: kolom wa_templates.is_enabled per template (event).
// Placeholder memakai satu kurung {nama}.

import { D1Database } from '@cloudflare/workers-types';
import { sendWaWithFallback, getFonnteToken } from './fonnte';
import { formatWATemplate } from '../routes/notifications';

/**
 * Event notifikasi otomatis + template yang dipakai. Satu event = satu baris
 * di editor template, jadi menyalakan/mematikan di dashboard langsung
 * menentukan apakah pesan terkirim.
 *
 * `enrollment` sengaja menyatu isi pendaftaran DAN instruksi pembayaran: dua
 * template terpisah untuk satu langkah (orang tua baru daftar, belum bayar)
 * hanya menghasilkan dua pesan yang mengulang hal yang sama. Yang dikirim
 * otomatis empat: daftar+instruksi, menunggu verifikasi, lunas, dan pengingat
 * belum bayar.
 */
export const CS_WA_EVENT_TEMPLATES = {
    registration: 'enrollment_confirmed',
    payment_received: 'payment_received',
    payment: 'payment_success',
    due_reminder: 'due_reminder',
} as const;

export type CsWaEvent = keyof typeof CS_WA_EVENT_TEMPLATES;

/**
 * Template yang TIDAK dikirim otomatis. Masih bisa dipakai untuk kirim manual,
 * tapi saklar aktifnya tidak punya arti otomatis — dimatikan supaya tidak
 * menyesatkan.
 */
export const CS_WA_MANUAL_ONLY_TEMPLATES = new Set([
    'welcome',
    'payment_instructions',
    'class_reminder',
    'promo',
]);

/** Nama template DEFAULT bila barisnya belum pernah dibuat di D1. */
export const CS_WA_FALLBACK_CONTENT: Record<CsWaEvent, string> = {
    registration:
        'Halo {nama_orang_tua}! 👋\n\n' +
        'Terima kasih, pendaftaran D\'Juniors untuk {nama_anak} (kelas {kelas}, jadwal {jadwal}) ' +
        'dengan nomor pendaftaran {nomor_pendaftaran} sudah kami terima.\n\n' +
        'Untuk menyelesaikan pendaftaran, silakan transfer sesuai instruksi dan kirim bukti pembayaran ' +
        'melalui halaman lacak berikut:\n{link_pembayaran}\n\n' +
        'Salam,\n{cs_name} - D\'Juniors',
    payment_received:
        'Halo {nama_orang_tua}! 🕐\n\n' +
        'Bukti pembayaran untuk pendaftaran {nomor_pendaftaran} sudah kami terima.\n' +
        'Pembayaran sedang kami verifikasi.\n\n' +
        'Salam,\n{cs_name} - D\'Juniors',
    payment:
        'Halo {nama_orang_tua}! ✅\n\n' +
        'Pembayaran pendaftaran D\'Juniors (no. {nomor_pendaftaran}, kelas {kelas}) sebesar {nominal} ' +
        'sudah kami konfirmasi.\n\n' +
        'Status: Lunas. Kelas siap diikuti — jadwal akan dikonfirmasi oleh tim kami.\n\n' +
        'Salam,\n{cs_name} - D\'Juniors',
    due_reminder:
        'Halo {nama_orang_tua}! ⏰\n\n' +
        'Pendaftaran {nomor_pendaftaran} ({kelas}) belum lunas.\n' +
        'Sisa waktu bayar: {sisa_hari} hari lagi.\n' +
        'Nominal: {total_transfer}\n\n' +
        'Transfer & upload bukti di: {link_pembayaran}\n\n' +
        'Salam,\n{cs_name} - D\'Juniors',
};

export interface CsWaSettingsRow {
    admin_account_id: string;
    fonnte_token: string;
    /** Nama pengirim untuk {cs_name}; '' = pakai nama akun (lihat migrasi 010). */
    wa_display_name?: string;
    updated_at?: string;
}

export interface CsWaSendResult {
    status: 'sent' | 'failed' | 'skipped' | 'error';
    detail?: string;
    /** Token mana yang berhasil mengirim (primary = CS, fallback = global/admin). */
    source?: 'primary' | 'fallback' | 'none';
}

/** Placeholder yang tersedia di template (untuk ditampilkan di UI). */
export const CS_WA_PLACEHOLDERS = [
    '{nama_orang_tua}',
    '{nama_anak}',
    '{kelas}',
    '{jadwal}',
    '{nomor_pendaftaran}',
    '{nominal}',
    '{metode_pembayaran}',
    '{nama_bank}',
    '{nomor_rekening}',
    '{nama_pemilik_rekening}',
    '{kode_unik}',
    '{total_transfer}',
    '{link_pembayaran}',
    '{kota}',
    '{cs_name}',
];

/**
 * Deskripsi placeholder untuk UI CS: label ramah + contoh isi, supaya CS tidak
 * perlu menebak arti tiap variabel saat menyusun template.
 */
export const CS_WA_PLACEHOLDER_HINTS: Record<string, { label: string; example: string }> = {
    '{nama_orang_tua}': { label: 'Nama orang tua/wali', example: 'Budi Santoso' },
    '{nama_anak}': { label: 'Nama anak', example: 'Rani' },
    '{kelas}': { label: 'Nama kelas', example: 'Matematika Gembira' },
    '{jadwal}': { label: 'Jam & jadwal kelas', example: 'Senin (15:00 - 16:00 WIB)' },
    '{nomor_pendaftaran}': { label: 'Nomor pendaftaran', example: 'DJN-20260923-AB12' },
    '{nominal}': { label: 'Nominal yang harus ditransfer', example: '150.123' },
    '{metode_pembayaran}': { label: 'Metode pembayaran dipilih pendaftar', example: 'Transfer Bank' },
    '{nama_bank}': { label: 'Nama bank / e-wallet / QRIS', example: 'BCA Syariah' },
    '{nomor_rekening}': { label: 'Nomor rekening / e-wallet', example: '8881016052' },
    '{nama_pemilik_rekening}': { label: 'Pemilik rekening', example: 'Wahyu Adi Syahputra' },
    '{kode_unik}': { label: 'Kode unik pembayaran', example: '123' },
    '{total_transfer}': { label: 'Total transfer (tagihan + kode unik)', example: '150.123' },
    '{link_pembayaran}': { label: 'Link lacak & unggah bukti', example: 'https://djuniorslc.com/lacak' },
    '{kota}': { label: 'Kota pendaftar', example: 'Kediri' },
    '{cs_name}': { label: 'Nama CS pengirim', example: 'CS Dua' },
};

export function maskToken(token: string): string {
    if (!token) return '';
    if (token.length > 8) {
        return token.slice(0, 4) + '•'.repeat(Math.min(token.length - 8, 12)) + token.slice(-4);
    }
    return '••••••••';
}

/**
 * Cari akun CS berdasarkan kode ref-nya.
 * `wa_name` = nama pengirim hasil resolusi (wa_display_name bila diisi, kalau
 * tidak nama akun) — inilah yang tampil sebagai {cs_name}.
 */
export async function findAccountByRef(
    db: D1Database,
    refCode: string
): Promise<{ id: string; name: string; ref_code: string; wa_name: string } | null> {
    return db
        .prepare(
            `SELECT a.id, a.name, a.ref_code,
                    COALESCE(NULLIF(TRIM(s.wa_display_name), ''), a.name) AS wa_name
             FROM admin_accounts a
             LEFT JOIN cs_wa_settings s ON s.admin_account_id = a.id
             WHERE a.ref_code = ?`
        )
        .bind(refCode)
        .first();
}

/**
 * Nama pengirim final untuk satu akun CS. Prioritas: wa_display_name (punya
 * CS sendiri, bisa diisi tanpa akses admin) → nama akun (dipakai admin).
 * Nama akun diambil ulang kalau baris setelannya belum ada.
 */
export async function resolveCsDisplayName(
    db: D1Database,
    account: { id: string; name: string } | null | undefined
): Promise<string> {
    if (!account) return 'Tim';
    const row = await db
        .prepare('SELECT wa_display_name FROM cs_wa_settings WHERE admin_account_id = ?')
        .bind(account.id)
        .first<{ wa_display_name: string | null }>();
    const custom = (row?.wa_display_name || '').trim();
    return custom || account.name || 'Tim';
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
        wa_display_name: (row?.wa_display_name || '').trim(),
        wa_display_name_set: (row?.wa_display_name || '').trim().length > 0,
        is_default: !row,
        updated_at: row?.updated_at || null,
    };
}

/**
 * Simpan (upsert) token milik satu akun CS. Isi template & saklar on/off
 * TIDAK lagi disimpan di sini — keduanya milik editor template (wa_templates)
 * dan dipakai bersama oleh admin dan CS. Token: '' = biarkan; clear_token = hapus.
 */
export async function saveCsWaSettings(
    db: D1Database,
    accountId: string,
    patch: {
        fonnte_token?: string;
        clear_token?: boolean;
        wa_display_name?: string;
    }
): Promise<void> {
    const existing = await getCsWaSettings(db, accountId);

    let token = existing?.fonnte_token || '';
    if (patch.clear_token) token = '';
    else if (typeof patch.fonnte_token === 'string' && patch.fonnte_token.trim() !== '') {
        token = patch.fonnte_token.trim();
    }

    // Nama pengirim: hanya ditulis bila dikirim. Tidak dikirim = biarkan yang
    // ada, supaya PartialUpdate dari form lama tidak diam-diam mengosongkan.
    let displayName = (existing?.wa_display_name || '').trim();
    if (typeof patch.wa_display_name === 'string') displayName = patch.wa_display_name.trim();

    await db
        .prepare(
            `INSERT INTO cs_wa_settings (admin_account_id, fonnte_token, wa_display_name, updated_at)
             VALUES (?, ?, ?, CURRENT_TIMESTAMP)
             ON CONFLICT(admin_account_id) DO UPDATE SET
                fonnte_token = excluded.fonnte_token,
                wa_display_name = excluded.wa_display_name,
                updated_at = CURRENT_TIMESTAMP`
        )
        .bind(accountId, token, displayName)
        .run();
}

/** Render template dengan data registrasi (+ nama CS sebagai {cs_name}). */
export function renderCsWaMessage(
    template: string,
    registration: Record<string, unknown>,
    csName: string,
    baseUrl?: string,
    extra?: Record<string, string>
): string {
    return formatWATemplate(
        template,
        { ...registration, cs_name: csName, ...(extra || {}) },
        { baseUrl }
    );
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
 * Ambil isi template + status aktif untuk satu event dari editor template.
 * Saklar is_enabled = 0 berarti notifikasi event ini sengaja dimatikan —
 * pengiriman dilewati, bukan memakai template bawaan.
 */
export async function loadEventTemplateForEvent(
    db: D1Database,
    event: CsWaEvent
): Promise<{ content: string; isEnabled: boolean }> {
    const templateId = CS_WA_EVENT_TEMPLATES[event];
    const row = await db
        .prepare('SELECT content, is_enabled FROM wa_templates WHERE id = ?')
        .bind(templateId)
        .first<{ content: string; is_enabled: number }>();

    // Baris belum pernah dibuat (mis. migrasi belum dijalankan) → pakai
    // default SEKALI, lalu tetap hormati saklarnya: default = nonaktif untuk
    // event baru, aktif untuk event yang sudah ada sebelumnya.
    const isEnabled = row ? Boolean(row.is_enabled) : event !== 'payment_received';
    return { content: row?.content || CS_WA_FALLBACK_CONTENT[event], isEnabled };
}

const EVENT_LABEL: Record<CsWaEvent, string> = {
    registration: 'Pendaftaran',
    payment_received: 'Bukti Pembayaran',
    payment: 'Pembayaran Lunas',
    due_reminder: 'Pengingat Belum Bayar',
};

/**
 * Kirim notifikasi WhatsApp otomatis untuk sebuah pendaftaran memakai
 * template dari editor template + token milik CS pemilik link (ref_code).
 * Selalu aman dipanggil: kegagalan tidak pernah melempar exception — hasil
 * dikembalikan sebagai { status: sent | failed | skipped | error } dan log
 * ditulis ke tabel notifications (kecuali skipped).
 */
export async function sendCsWaAuto(
    env: { DB: D1Database; WA_FONNTE_TOKEN?: string; BASE_URL?: string },
    registration: Record<string, unknown> & {
        ref_code?: string | null;
        parent_phone?: string;
        registration_number?: string;
    },
    event: CsWaEvent,
    opts?: { baseUrl?: string; csName?: string; vars?: Record<string, string> }
): Promise<CsWaSendResult> {
    try {
        // Cek saklar dulu, sebelum cari CS: event yang dimatikan tidak boleh
        // menghasilkan panggilan DB tambahan, dan tidak butuh ref/nomor.
        const { content: template, isEnabled } = await loadEventTemplateForEvent(env.DB, event);
        if (!isEnabled) return { status: 'skipped', detail: 'notifikasi_dimatikan' };

        const refCode = registration.ref_code;
        if (!registration.parent_phone) return { status: 'skipped', detail: 'tanpa_nomor' };

        // Cari CS pemilik link. Tanpa ref_code = daftar umum (bukan lewat link
        // CS) — masih boleh dikirim ASAL ini event pengingat: pengingat adalah
        // pesan sistem, bukan pesan dari CS tertentu, dan pelanggan tetap layak
        // diingatkan. Event lain tetap butuh CS (pesan mereka memakai {cs_name}
        // dan token device per-CS).
        const account = refCode ? await findAccountByRef(env.DB, refCode) : null;
        if (!account && event !== 'due_reminder') {
            return { status: 'skipped', detail: refCode ? 'cs_tidak_ditemukan' : 'tanpa_ref_cs' };
        }

        // Token CS = utama (bila ada). Token global/admin = cadangan: dipakai
        // hanya bila token utama kosong atau Fonnte menolaknya, sehingga
        // notifikasi tetap terkirim walau device Fonnte CS sedang bermasalah.
        // Setelan token ada/tidak TIDAK menentukan pengiriman — yang menentukan
        // adalah template + token global. Kalau tidak, CS yang belum pernah
        // menyimpan token akan diam-diam berhenti menerima notifikasi.
        const settings = account
            ? await getCsWaSettings(env.DB, account.id)
            : null;
        const csToken = (settings?.fonnte_token || '').trim();
        const globalToken = (await getFonnteToken(env)).trim();
        if (!csToken && !globalToken) return { status: 'skipped', detail: 'token_kosong' };

        const message = renderCsWaMessage(
            template,
            registration,
            // Pengingat umum tanpa CS. Template menambah sendiri " - D'Juniors",
            // jadi fallback-nya hanya "Tim" — bukan "Tim D'Juniors" yang akan
            // menghasilkan tanda tangan ganda.
            opts?.csName || account?.wa_name || 'Tim',
            opts?.baseUrl || env.BASE_URL,
            opts?.vars
        );
        if (!message.trim()) return { status: 'skipped', detail: 'pesan_kosong' };

        const result = await sendWaWithFallback(
            env,
            csToken,
            globalToken,
            registration.parent_phone,
            message,
            { typing: true, delay: 0 }
        );

        await logWa(
            env.DB,
            `cs_${event}`,
            `${EVENT_LABEL[event]} → ${registration.registration_number}`,
            message,
            result.status ? 'sent' : 'failed'
        );

        return {
            status: result.status ? 'sent' : 'failed',
            detail: result.status
                ? (result.source === 'fallback' ? 'fallback' : (result.message || 'ok'))
                : (result.message || 'gagal_dari_fonnte'),
            source: result.source,
        };
    } catch (err) {
        console.error('[cs-wa] auto send error:', err);
        return { status: 'error', detail: err instanceof Error ? err.message : 'unknown' };
    }
}
