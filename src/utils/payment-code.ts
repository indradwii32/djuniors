// ============================================
// Djuniors - Kode Unik Pembayaran
// ============================================
// Admin dapat mengaktifkan "kode unik" yang ditambahkan ke nominal tagihan
// setiap pendaftaran (mis. tagihan Rp 150.000 → transfer Rp 150.123). Nominal
// unik memudahkan pencocokan pembayaran yang masuk, terutama saat beberapa
// pendaftar mentransfer nominal yang sama di hari yang sama.
//
// Konfigurasi disimpan di tabel `settings` (key: payment_unique_code) dan
// nominal asli tetap utuh di `registrations.final_amount`; kode unik disimpan
// terpisah di `registrations.unique_code` supaya laporan pendapatan tidak
// tercemar angka acak.

import { D1Database } from '@cloudflare/workers-types';

const CFG_KEY = 'payment_unique_code';

export interface UniqueCodeConfig {
    enabled: boolean;
    min: number;
    max: number;
}

export const DEFAULT_UNIQUE_CODE_CONFIG: UniqueCodeConfig = {
    enabled: false,
    min: 1,
    max: 999,
};

const CODE_FLOOR = 1;
const CODE_CEIL = 9999;

function clampInt(value: unknown, fallback: number, lo: number, hi: number): number {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, n));
}

/** Baca konfigurasi kode unik (selalu mengembalikan nilai valid). */
export async function getUniqueCodeConfig(db: D1Database): Promise<UniqueCodeConfig> {
    try {
        const row = await db
            .prepare('SELECT value FROM settings WHERE key = ?')
            .bind(CFG_KEY)
            .first<{ value: string }>();
        if (!row?.value) return { ...DEFAULT_UNIQUE_CODE_CONFIG };

        const parsed = JSON.parse(row.value) as Partial<UniqueCodeConfig>;
        const min = clampInt(parsed.min, DEFAULT_UNIQUE_CODE_CONFIG.min, CODE_FLOOR, CODE_CEIL);
        const max = clampInt(parsed.max, DEFAULT_UNIQUE_CODE_CONFIG.max, CODE_FLOOR, CODE_CEIL);
        return {
            enabled: Boolean(parsed.enabled),
            min: Math.min(min, max),
            max: Math.max(min, max),
        };
    } catch {
        return { ...DEFAULT_UNIQUE_CODE_CONFIG };
    }
}

/** Simpan konfigurasi kode unik (partial patch). */
export async function saveUniqueCodeConfig(
    db: D1Database,
    patch: Partial<UniqueCodeConfig>
): Promise<UniqueCodeConfig> {
    const current = await getUniqueCodeConfig(db);
    const next: UniqueCodeConfig = {
        enabled: typeof patch.enabled === 'boolean' ? patch.enabled : current.enabled,
        min: patch.min !== undefined ? clampInt(patch.min, current.min, CODE_FLOOR, CODE_CEIL) : current.min,
        max: patch.max !== undefined ? clampInt(patch.max, current.max, CODE_FLOOR, CODE_CEIL) : current.max,
    };
    if (next.min > next.max) {
        const t = next.min;
        next.min = next.max;
        next.max = t;
    }

    await db
        .prepare(
            `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        )
        .bind(CFG_KEY, JSON.stringify(next))
        .run();

    return next;
}

/**
 * Tentukan kode unik untuk sebuah pendaftaran baru.
 *
 * Kembalikan 0 bila fitur dimatikan. Bila aktif, kode acak diambil dari rentang
 * yang diatur admin dan dihindari bentrok dengan nominal pendaftaran lain yang
 * masih menunggu pembayaran (supaya admin tetap bisa membedakan transfer yang
 * jumlahnya identik).
 */
export async function pickUniqueCode(
    db: D1Database,
    finalAmount: number,
    config?: UniqueCodeConfig
): Promise<number> {
    const cfg = config || (await getUniqueCodeConfig(db));
    if (!cfg.enabled) return 0;

    const span = Math.max(1, cfg.max - cfg.min + 1);
    const base = Math.max(0, Number(finalAmount) || 0);

    for (let attempt = 0; attempt < 12; attempt++) {
        const code = cfg.min + Math.floor(Math.random() * span);
        const payable = base + code;

        // Nominal yang sudah dipakai pendaftar lain (belum lunas) dihindari.
        const clash = await db
            .prepare(
                `SELECT id FROM registrations
                  WHERE payment_status != 'paid'
                    AND (COALESCE(final_amount, 0) + COALESCE(unique_code, 0)) = ?
                  LIMIT 1`
            )
            .bind(payable)
            .first();

        if (!clash) return code;
    }

    // Sangat jarang terjadi: pakai kode terakhir yang dihitung apa adanya.
    return cfg.min + Math.floor(Math.random() * span);
}

/**
 * Nominal yang harus ditransfer pendaftar = tagihan + kode unik.
 * Aman untuk baris lama yang belum punya kolom unique_code (dianggap 0).
 */
export function getPayableAmount(registration: {
    final_amount?: unknown;
    unique_code?: unknown;
} | null | undefined): number {
    if (!registration) return 0;
    const base = Number(registration.final_amount) || 0;
    const code = Number(registration.unique_code) || 0;
    return Math.max(0, base + code);
}
