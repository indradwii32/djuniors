// ============================================
// Djuniors - Rotator Pendaftaran Routes (admin only)
// ============================================
// GET  /api/admin/rotator → status + anggota rotator + daftar akun CS
// PUT  /api/admin/rotator → { enabled, refs } (refs di-validasi ke CS aktif)
// Path /api/admin/* tidak ada di allowlist role CS →403 otomatis di gate global.

import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { adminAuthMiddleware } from '../middleware/auth';
import { getRotatorConfig, saveRotatorConfig } from '../utils/cs-rotator';

const rotator = new Hono<{ Bindings: Bindings; Variables: Variables }>();

rotator.get('/', adminAuthMiddleware, async (c) => {
    const cfg = await getRotatorConfig(c.env.DB);
    const accounts = await c.env.DB.prepare(
        `SELECT id, name, ref_code, is_active
         FROM admin_accounts
         WHERE role = 'cs'
         ORDER BY created_at ASC`
    ).all();

    return c.json({
        success: true,
        rotator: cfg,
        accounts: accounts.results || [],
    });
});

rotator.put('/', adminAuthMiddleware, async (c) => {
    const body = (await c.req.json()) as { enabled?: unknown; refs?: unknown };
    const existing = await getRotatorConfig(c.env.DB);

    const enabled = body.enabled === true;
    let refs = existing.refs;
    if (Array.isArray(body.refs)) {
        const requested = body.refs
            .filter((r): r is string => typeof r === 'string' && r.trim() !== '')
            .map((r) => r.trim());
        // dedup, pertahankan urutan input
        refs = [...new Set(requested)];

        // Hanya CS aktif ber-ref yang boleh masuk anggota rotator.
        if (refs.length > 0) {
            const placeholders = refs.map(() => '?').join(', ');
            const valid = await c.env.DB.prepare(
                `SELECT ref_code FROM admin_accounts
                 WHERE role = 'cs' AND is_active = 1
                   AND ref_code IS NOT NULL AND ref_code != ''
                   AND ref_code IN (${placeholders})`
            ).bind(...refs).all<{ ref_code: string }>();
            const validSet = new Set((valid.results || []).map((r) => r.ref_code));
            refs = refs.filter((r) => validSet.has(r));
        }
    }

    if (enabled && refs.length === 0) {
        return c.json(
            {
                error: 'No members',
                message: 'Rotator aktif membutuhkan minimal 1 akun CS aktif yang dicentang',
            },
            400
        );
    }

    const saved = await saveRotatorConfig(c.env.DB, { enabled, refs });
    return c.json({ success: true, rotator: saved });
});

export default rotator;
