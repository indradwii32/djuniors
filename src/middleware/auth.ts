// ============================================
// Djuniors - Auth Middleware
// ============================================

import { Context, Next } from 'hono';
import { Bindings, Variables, JWTPayload } from '../types';
import { verifyJWT, getJwtSecret } from '../utils/jwt';

/**
 * JWT Auth Middleware (for regular users)
 */
export const authMiddleware = async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyJWT(token, await getJwtSecret(c.env));

    if (!payload) {
        return c.json({ error: 'Invalid token' }, 401);
    }

    c.set('jwtPayload', payload);
    await next();
};

/**
 * Admin Auth Middleware
 */
export const adminAuthMiddleware = async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = await verifyJWT(token, await getJwtSecret(c.env));

    if (!payload || payload.type !== 'admin') {
        return c.json({ error: 'Invalid admin token' }, 401);
    }

    // Check if session exists in KV
    const session = await c.env.KV.get(`admin-session:${payload.userId}`);
    if (!session) {
        return c.json({ error: 'Session expired' }, 401);
    }

    c.set('jwtPayload', payload);
    await next();
};

/** 
 * Super Admin Middleware (requires adminAuthMiddleware first)
 */
export const superAdminMiddleware = async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
    const payload = c.get('jwtPayload');

    if (payload.role !== 'super_admin') {
        return c.json({ error: 'Super admin access required' }, 403);
    }

    await next();
};

/**
 * Role gate — pasang SETELAH adminAuthMiddleware.
 * `super_admin` selalu lolos; selain itu hanya role yang disebutkan.
 *
 * Contoh: adminAccounts.get('/', adminAuthMiddleware, requireRole('admin', 'super_admin'), handler)
 */
export const requireRole = (...roles: string[]) => {
    return async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
        const payload = c.get('jwtPayload');
        if (!payload) {
            return c.json({ error: 'Unauthorized' }, 401);
        }
        if (payload.role === 'super_admin' || roles.includes(payload.role)) {
            await next();
            return;
        }
        return c.json({
            error: 'Forbidden',
            message: 'Anda tidak memiliki akses untuk fitur ini',
        }, 403);
    };
};

/**
 * Ambil kode ref (link CS) milik akun CS yang sedang login.
 * Mengembalikan null untuk admin/super_admin (admin melihat semua data,
 * jadi dia tidak di-scope ke satu ref_code) atau bila akun CS belum punya kode.
 */
export async function getStaffRefCode(
    c: Context<{ Bindings: Bindings; Variables: Variables }>
): Promise<string | null> {
    const payload = c.get('jwtPayload');
    if (!payload || payload.type !== 'admin' || payload.role !== 'cs') {
        return null;
    }
    const row = await c.env.DB.prepare(
        'SELECT ref_code FROM admin_accounts WHERE id = ?'
    ).bind(payload.userId).first();
    return (row?.ref_code as string) || null;
}

/** True bila token adalah akun CS (dipakai untuk pengecekan kepemilikan data). */
export function isCSRole(payload: JWTPayload | undefined): boolean {
    return !!payload && payload.type === 'admin' && payload.role === 'cs';
}
