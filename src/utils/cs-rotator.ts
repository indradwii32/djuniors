// ============================================
// Djuniors - Rotator Pendaftaran (delegasi ke CS)
// ============================================
// Pendaftaran yang masuk TANPA ref CS valid (?ref= kosong/tidak dikenal)
// dibagi rata ke daftar CS yang diaktifkan admin — pola round-robin sesuai
// urutan yang disimpan admin.
// Konfigurasi disimpan di tabel `settings` (tanpa migrasi schema):
//   cs_rotator        → JSON {"enabled": bool, "refs": [KODE, ...]}
//   cs_rotator_cursor → index anggota untuk pendaftaran berikutnya

import { D1Database } from '@cloudflare/workers-types';

const CFG_KEY = 'cs_rotator';
const CURSOR_KEY = 'cs_rotator_cursor';

export interface RotatorConfig {
    enabled: boolean;
    refs: string[];
}

export async function getRotatorConfig(db: D1Database): Promise<RotatorConfig> {
    try {
        const row = await db
            .prepare('SELECT value FROM settings WHERE key = ?')
            .bind(CFG_KEY)
            .first<{ value: string }>();
        if (!row?.value) return { enabled: false, refs: [] };
        const parsed = JSON.parse(row.value) as Partial<RotatorConfig>;
        return {
            enabled: Boolean(parsed.enabled),
            refs: Array.isArray(parsed.refs)
                ? parsed.refs.filter((r): r is string => typeof r === 'string' && r.trim() !== '')
                : [],
        };
    } catch {
        return { enabled: false, refs: [] };
    }
}

/** Simpan konfigurasi rotator; reset cursor supaya urutan mulai dari awal. */
export async function saveRotatorConfig(
    db: D1Database,
    cfg: RotatorConfig
): Promise<RotatorConfig> {
    const clean: RotatorConfig = {
        enabled: Boolean(cfg.enabled),
        refs: cfg.refs.filter((r) => typeof r === 'string' && r.trim() !== '').map((r) => r.trim()),
    };
    await db
        .prepare(
            `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
        )
        .bind(CFG_KEY, JSON.stringify(clean))
        .run();
    await db
        .prepare(
            `INSERT INTO settings (key, value, updated_at) VALUES (?, '0', datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = '0', updated_at = datetime('now')`
        )
        .bind(CURSOR_KEY)
        .run();
    return clean;
}

/**
 * CS berikutnya untuk delegasi round-robin. Mengembalikan null bila rotator
 * mati, belum ada anggota, atau tidak ada anggota yang masih CS aktif ber-ref.
 * Selalu aman dipanggil (error → null, tidak melempar).
 */
export async function nextRotatorRef(db: D1Database): Promise<string | null> {
    try {
        const cfg = await getRotatorConfig(db);
        if (!cfg.enabled || cfg.refs.length === 0) return null;

        // Hanya CS aktif dengan ref valid yang boleh menerima delegasi.
        const placeholders = cfg.refs.map(() => '?').join(', ');
        const rows = await db
            .prepare(
                `SELECT ref_code FROM admin_accounts
                 WHERE role = 'cs' AND is_active = 1
                   AND ref_code IS NOT NULL AND ref_code != ''
                   AND ref_code IN (${placeholders})`
            )
            .bind(...cfg.refs)
            .all<{ ref_code: string }>();
        const eligibleSet = new Set((rows.results || []).map((r) => r.ref_code));
        const eligible = cfg.refs.filter((r) => eligibleSet.has(r));
        if (eligible.length === 0) return null;

        let cursor = 0;
        try {
            const cur = await db
                .prepare('SELECT value FROM settings WHERE key = ?')
                .bind(CURSOR_KEY)
                .first<{ value: string }>();
            cursor = parseInt(cur?.value || '0', 10) || 0;
        } catch {
            cursor = 0;
        }

        const pick = eligible[cursor % eligible.length];
        const next = (cursor + 1) % eligible.length;
        await db
            .prepare(
                `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
            )
            .bind(CURSOR_KEY, String(next))
            .run();
        return pick;
    } catch (err) {
        console.error('[rotator] nextRotatorRef error:', err);
        return null;
    }
}
