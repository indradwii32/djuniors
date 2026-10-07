// ============================================
// Djuniors - Pengingat pembayaran terjadwal
// ============================================
// Mengirim template `due_reminder` ke pendaftar yang belum lunas, setelah lewat
// sejumlah hari sejak pendaftaran. Dipanggil dari cron harian (src/index.ts).
//
// Aturan penting:
//   * Hanya yang belum lunas. Pendaftaran lunas/rejected tidak pernah diberi
//     pengingat — itu memalukan dan tidak ada gunanya.
//   * Satu kali per pendaftaran (dicatat di wa_due_reminders). Tanpa ini cron
//     harian akan mengirim pesan yang sama setiap hari sampai lunas.
//   * Saklar `due_reminder.is_enabled` ikut dihormati: kalau admin/CS mematikan,
//     cron dilewati seluruhnya.
//   * Durasi (hari) diatur admin lewat settings, bukan per-pendaftar — supaya
//     tidak butuh UI per baris dan cukup satu angka yang berlaku semua.

import { D1Database } from '@cloudflare/workers-types';
import { sendCsWaAuto } from './cs-wa';
import { getPublicSiteUrl } from './public-url';

const CFG_KEY = 'wa_due_reminder_config';

export interface DueReminderConfig {
    /** Berapa hari setelah pendaftaran pengingat dikirim. 0 = tidak aktif. */
    days: number;
    /** Kirim ulang setiap N hari setelah pengiriman pertama. 0 = sekali saja. */
    repeat_every: number;
}

export const DEFAULT_DUE_REMINDER_CONFIG: DueReminderConfig = {
    days: 3,
    repeat_every: 0,
};

const MIN_DAYS = 0;
const MAX_DAYS = 90;
const MAX_REPEAT = 90;

const clampInt = (v: unknown, lo: number, hi: number, fallback: number): number => {
    const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, Math.trunc(n)));
};

/** Baca konfigurasi durasi pengingat. Selalu mengembalikan nilai valid. */
export async function getDueReminderConfig(db: D1Database): Promise<DueReminderConfig> {
    try {
        const row = await db
            .prepare('SELECT value FROM settings WHERE key = ?')
            .bind(CFG_KEY)
            .first<{ value: string }>();
        if (!row?.value) return { ...DEFAULT_DUE_REMINDER_CONFIG };
        const parsed = JSON.parse(row.value) as Partial<DueReminderConfig>;
        return {
            days: clampInt(parsed.days, MIN_DAYS, MAX_DAYS, DEFAULT_DUE_REMINDER_CONFIG.days),
            repeat_every: clampInt(
                parsed.repeat_every,
                0,
                MAX_REPEAT,
                DEFAULT_DUE_REMINDER_CONFIG.repeat_every
            ),
        };
    } catch {
        return { ...DEFAULT_DUE_REMINDER_CONFIG };
    }
}

/** Simpan konfigurasi durasi pengingat (partial patch). */
export async function saveDueReminderConfig(
    db: D1Database,
    patch: Partial<DueReminderConfig>
): Promise<DueReminderConfig> {
    const current = await getDueReminderConfig(db);
    const next: DueReminderConfig = {
        days: patch.days !== undefined
            ? clampInt(patch.days, MIN_DAYS, MAX_DAYS, current.days)
            : current.days,
        repeat_every: patch.repeat_every !== undefined
            ? clampInt(patch.repeat_every, 0, MAX_REPEAT, current.repeat_every)
            : current.repeat_every,
    };
    await db
        .prepare(
            `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        )
        .bind(CFG_KEY, JSON.stringify(next))
        .run();
    return next;
}

export interface DueReminderRun {
    /** Config yang dipakai. */
    config: DueReminderConfig;
    /** Berapa yang dikirim/dilewati, untuk log cron. */
    sent: number;
    failed: number;
    skipped_disabled: boolean;
    skipped_durasi_nol: boolean;
    candidates: number;
    errors: string[];
}

interface CandidateRow {
    id: string;
    registration_number: string;
    created_at: string;
    /** Usia pendaftaran dalam hari (dihitung di SQL). */
    age_days: number;
    /** Kapan terakhir kali dikirimi pengingat, atau null. */
    last_sent_at: string | null;
    days_left: number;
}

/**
 * Jalankan satu putaran pengingat. Aman dipanggil dari cron: semua error
 * ditangkap per-pendaftar supaya satu nomor rusak tidak menghentikan sisa.
 */
export async function runDueReminders(
    env: { DB: D1Database; WA_FONNTE_TOKEN?: string; BASE_URL?: string },
    opts?: { now?: Date; force?: boolean }
): Promise<DueReminderRun> {
    const now = opts?.now ?? new Date();
    const config = await getDueReminderConfig(env.DB);
    const out: DueReminderRun = {
        config,
        sent: 0,
        failed: 0,
        skipped_disabled: false,
        skipped_durasi_nol: false,
        candidates: 0,
        errors: [],
    };

    if (config.days <= 0) {
        out.skipped_durasi_nol = true;
        return out;
    }

    // Saklar template: kalau mati, cron tidak melakukan apa pun. Di-cek di sini
    // (bukan hanya di sendCsWaAuto) supaya tidak sia-sia query kandidat.
    const tpl = await env.DB
        .prepare('SELECT is_enabled FROM wa_templates WHERE id = ?')
        .bind('due_reminder')
        .first<{ is_enabled: number }>();
    if (tpl && !tpl.is_enabled) {
        out.skipped_disabled = true;
        return out;
    }

    // Kandidat: belum lunas, sudah cukup umur, belum dikirimi (atau cukup
    // lama sejak pengiriman terakhir bila repeat_every > 0).
    const repeatClause = config.repeat_every > 0
        ? `AND (r.sent_at IS NULL OR julianday(?) - julianday(r.sent_at) >= ?)`
        : `AND r.sent_at IS NULL`;

    const sql = `
        SELECT
            reg.id,
            reg.registration_number,
            reg.created_at,
            CAST(julianday(?) - julianday(reg.created_at) AS INTEGER) AS age_days,
            r.sent_at AS last_sent_at,
            ? - CAST(julianday(?) - julianday(reg.created_at) AS INTEGER) AS days_left
        FROM registrations reg
        LEFT JOIN wa_due_reminders r ON r.registration_id = reg.id
        WHERE reg.payment_status IN ('unpaid', 'pending')
          AND CAST(julianday(?) - julianday(reg.created_at) AS INTEGER) >= ?
          ${repeatClause}
        ORDER BY reg.created_at ASC
        LIMIT 200`;

    const iso = now.toISOString().slice(0, 19).replace('T', ' ');
    const binds: unknown[] = [iso, config.days, iso, iso, config.days];
    if (config.repeat_every > 0) binds.push(iso, config.repeat_every);

    let candidates: CandidateRow[] = [];
    try {
        const res = await env.DB.prepare(sql).bind(...binds).all();
        candidates = (res.results || []) as unknown as CandidateRow[];
    } catch (err) {
        out.errors.push(`query: ${err instanceof Error ? err.message : 'unknown'}`);
        return out;
    }

    out.candidates = candidates.length;

    for (const c of candidates) {
        try {
            const full = await env.DB
                .prepare(
                    `SELECT reg.*, c.name AS class_name
                     FROM registrations reg
                     LEFT JOIN classes c ON c.id = reg.class_id
                     WHERE reg.id = ?`
                )
                .bind(c.id)
                .first();
            if (!full) continue;

            const res = await sendCsWaAuto(env, full as Record<string, unknown>, 'due_reminder', {
                // Cron tidak punya request, jadi alamat publik diambil dari
                // konfigurasi — bukan origin Worker (itu domain API).
                baseUrl: getPublicSiteUrl(env),
                // {sisa_hari} hanya di template pengingat; placeholder ini
                // tidak muncul di template lain, jadi tidak mengganggu.
                vars: {
                    sisa_hari: String(Math.max(0, c.days_left)),
                    sisa_hari_penuh: `${Math.max(0, c.days_left)} hari`,
                },
            });

            if (res.status === 'sent') {
                out.sent += 1;
            } else if (res.status === 'skipped' || res.status === 'error') {
                // Tidak kirim (mis. tanpa token, tanpa nomor, template dimatikan
                // di tengah jalan) — TIDAK dicatat, supaya masih dicoba besok.
                if (res.status === 'error') {
                    out.errors.push(`${c.registration_number}: ${res.detail || 'error'}`);
                }
            } else {
                out.failed += 1;
            }

            // Dicatat baik berhasil maupun gagal Fonnte: kalau tokennya salah,
            // mencoba lagi tiap hari hanya membanjiri log. admins bisa reset
            // lewat pengaturan bila token sudah diperbaiki.
            if (res.status === 'sent' || res.status === 'failed') {
                await env.DB
                    .prepare(
                        `INSERT INTO wa_due_reminders (registration_id, sent_at, days_left, template_version)
                         VALUES (?, ?, ?, ?)
                         ON CONFLICT(registration_id) DO UPDATE SET
                            sent_at = excluded.sent_at,
                            days_left = excluded.days_left`
                    )
                    .bind(c.id, iso, c.days_left, 1)
                    .run();
            }
        } catch (err) {
            out.errors.push(
                `${c.registration_number}: ${err instanceof Error ? err.message : 'unknown'}`
            );
        }
    }

    return out;
}
