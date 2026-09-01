// ============================================
// Djuniors - Auth Middleware
// ============================================

import { Context, Next } from 'hono';
import { Bindings, Variables } from '../types';
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
