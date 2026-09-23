// ============================================
// Djuniors - Admin / Team Account Routes
// ============================================
// Manajemen akun tim dashboard (admin & CS).
// - GET    /api/admin/accounts      → daftar akun + statistik link per CS
// - GET    /api/admin/accounts/me   → profil sendiri (termasuk ref_code)
// - POST   /api/admin/accounts      → buat akun baru (cs / admin)
// - PUT    /api/admin/accounts/:id  → update nama/role/aktif/password
//
// Akun CS otomatis mendapat `ref_code` unik yang menjadi link pendaftaran:
//   https://djuniorslc.com/daftar.html?ref=<ref_code>

import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { adminAuthMiddleware, requireRole } from '../middleware/auth';
import { hashPassword } from '../utils/jwt';

const adminAccounts = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Hanya admin/super_admin (akun CS diblokir lebih awal oleh gate di index.ts,
// requireRole di sini sebagai pengaman kedua).

const SAFE_COLS = 'a.id, a.username, a.name, a.role, a.ref_code, a.is_active, a.last_login, a.created_at';

// Kode ref: CS + 6 karakter acak (tanpa karakter ambigu 0/O/1/I).
function generateRefCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);
    let out = 'CS';
    for (const b of bytes) out += chars[b % chars.length];
    return out;
}

async function uniqueRefCode(db: D1Database): Promise<string> {
    for (let i = 0; i < 10; i++) {
        const code = generateRefCode();
        const exists = await db.prepare(
            'SELECT 1 FROM admin_accounts WHERE ref_code = ?'
        ).bind(code).first();
        if (!exists) return code;
    }
    // Hampir mustahil sampai sini; fallback berbasis waktu.
    return `CS${Date.now().toString(36).toUpperCase()}`;
}

/**
 * GET /api/admin/accounts/me
 * Profil akun yang sedang login (semua role admin termasuk CS).
 */
adminAccounts.get('/me', adminAuthMiddleware, async (c) => {
    const payload = c.get('jwtPayload');
    const me = await c.env.DB.prepare(
        'SELECT id, username, name, role, ref_code, is_active FROM admin_accounts WHERE id = ?'
    ).bind(payload.userId).first();
    if (!me) return c.json({ error: 'Akun tidak ditemukan' }, 404);
    return c.json({ success: true, account: me });
});

/**
 * GET /api/admin/accounts
 * Daftar akun tim + statistik pendaftaran per ref_code (untuk menu Link & Tracking CS).
 */
adminAccounts.get('/', adminAuthMiddleware, requireRole('admin', 'super_admin'), async (c) => {
    const result = await c.env.DB.prepare(`
        SELECT ${SAFE_COLS},
               COALESCE(COUNT(r.id), 0)                                   AS reg_total,
               COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN 1 ELSE 0 END), 0) AS reg_paid,
               COALESCE(SUM(CASE WHEN r.payment_status = 'paid' THEN r.final_amount ELSE 0 END), 0) AS reg_revenue
        FROM admin_accounts a
        LEFT JOIN registrations r ON r.ref_code = a.ref_code
        GROUP BY a.id
        ORDER BY CASE a.role WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
                 a.created_at ASC
    `).all();
    return c.json({ success: true, accounts: result.results || [] });
});

/**
 * POST /api/admin/accounts
 * Buat akun CS (atau admin). ref_code dihasilkan otomatis untuk CS.
 */
adminAccounts.post('/', adminAuthMiddleware, requireRole('admin', 'super_admin'), async (c) => {
    const body = await c.req.json();
    const username = (body.username || '').trim().toLowerCase();
    const name = (body.name || '').trim();
    const password = body.password || '';
    const role = body.role === 'admin' ? 'admin' : 'cs';

    if (!username || !name || !password) {
        return c.json({
            error: 'Missing fields',
            message: 'username, name, dan password wajib diisi',
        }, 400);
    }
    if (password.length < 6) {
        return c.json({ error: 'Weak password', message: 'Password minimal 6 karakter' }, 400);
    }

    const existing = await c.env.DB.prepare(
        'SELECT id FROM admin_accounts WHERE username = ?'
    ).bind(username).first();
    if (existing) {
        return c.json({ error: 'Duplicate', message: 'Username sudah dipakai' }, 409);
    }

    const id = crypto.randomUUID();
    const refCode = role === 'cs' ? await uniqueRefCode(c.env.DB) : null;
    const passwordHash = await hashPassword(password);

    await c.env.DB.prepare(`
        INSERT INTO admin_accounts (id, username, password_hash, name, role, ref_code, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    `).bind(id, username, passwordHash, name, role, refCode).run();

    const created = await c.env.DB.prepare(
        `SELECT ${SAFE_COLS} FROM admin_accounts a WHERE a.id = ?`
    ).bind(id).first();

    return c.json({
        success: true,
        account: created,
        link_ref: refCode,
        message: refCode
            ? `Akun CS berhasil dibuat. Link pendaftaran: ?ref=${refCode}`
            : 'Akun berhasil dibuat',
    }, 201);
});

/**
 * PUT /api/admin/accounts/:id
 * Update nama / role / aktif / reset password.
 */
adminAccounts.put('/:id', adminAuthMiddleware, requireRole('admin', 'super_admin'), async (c) => {
    const id = c.req.param('id');
    const payload = c.get('jwtPayload');
    const body = await c.req.json();

    const account = await c.env.DB.prepare(
        'SELECT id, username, name, role, ref_code, is_active FROM admin_accounts WHERE id = ?'
    ).bind(id).first();
    if (!account) return c.json({ error: 'Akun tidak ditemukan' }, 404);

    // Guard: tidak boleh menonaktifkan / menurunkan role diri sendiri.
    if (id === payload.userId) {
        if (body.is_active !== undefined && !body.is_active) {
            return c.json({ error: 'Invalid', message: 'Tidak bisa menonaktifkan akun sendiri' }, 400);
        }
        if (body.role && body.role !== account.role) {
            return c.json({ error: 'Invalid', message: 'Tidak bisa mengubah role akun sendiri' }, 400);
        }
    }

    const name = body.name !== undefined ? String(body.name).trim() : account.name;
    const role = body.role !== undefined
        ? (body.role === 'admin' || body.role === 'super_admin' || body.role === 'cs' ? body.role : account.role)
        : account.role;
    const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : (account.is_active ? 1 : 0);

    // Turunkan/naikkan role: super_admin hanya boleh di-set oleh super_admin.
    if (role === 'super_admin' && account.role !== 'super_admin' && payload.role !== 'super_admin') {
        return c.json({ error: 'Forbidden', message: 'Hanya super_admin yang bisa menetapkan super_admin' }, 403);
    }

    await c.env.DB.prepare(
        'UPDATE admin_accounts SET name = ?, role = ?, is_active = ? WHERE id = ?'
    ).bind(name, role, isActive, id).run();

    // Reset password opsional
    if (body.password) {
        if (String(body.password).length < 6) {
            return c.json({ error: 'Weak password', message: 'Password minimal 6 karakter' }, 400);
        }
        const hash = await hashPassword(String(body.password));
        await c.env.DB.prepare(
            'UPDATE admin_accounts SET password_hash = ? WHERE id = ?'
        ).bind(hash, id).run();
    }

    // Bila role dimatikan dari CS, ref_code tetap disimpan (riwayat tracking lama tetap valid).
    const updated = await c.env.DB.prepare(
        `SELECT ${SAFE_COLS} FROM admin_accounts a WHERE a.id = ?`
    ).bind(id).first();

    return c.json({ success: true, account: updated, message: 'Akun berhasil diperbarui' });
});

export default adminAccounts;
