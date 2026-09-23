// ============================================
// Djuniors - Setelan Pembayaran (admin)
// ============================================
// GET  /api/admin/payment-code → konfigurasi kode unik pembayaran
// PUT  /api/admin/payment-code → simpan konfigurasi
//
// Hanya admin: role CS tidak boleh mengubah kebijakan nominal tagihan.

import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { adminAuthMiddleware } from '../middleware/auth';
import { getUniqueCodeConfig, saveUniqueCodeConfig } from '../utils/payment-code';

const paymentSettings = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/** Hanya admin (bukan CS) yang boleh membaca & mengubah setelan ini. */
function requireAdmin(c: any): Response | null {
    const payload = c.get('jwtPayload');
    if (payload?.role !== 'admin' && payload?.role !== 'super_admin') {
        return c.json({
            error: 'Forbidden',
            message: 'Hanya admin yang dapat mengubah setelan pembayaran',
        }, 403);
    }
    return null;
}

paymentSettings.get('/', adminAuthMiddleware, async (c) => {
    const denied = requireAdmin(c);
    if (denied) return denied;

    const config = await getUniqueCodeConfig(c.env.DB);
    return c.json({
        success: true,
        unique_code: config,
        sample: {
            base: 150000,
            payable: 150000 + (config.enabled ? config.min : 0),
        },
    });
});

paymentSettings.put('/', adminAuthMiddleware, async (c) => {
    const denied = requireAdmin(c);
    if (denied) return denied;

    const body = await c.req.json() as {
        unique_code?: { enabled?: boolean; min?: number; max?: number };
        enabled?: boolean;
        min?: number;
        max?: number;
    };

    const patch = body.unique_code || body;
    const config = await saveUniqueCodeConfig(c.env.DB, {
        enabled: typeof patch.enabled === 'boolean' ? patch.enabled : undefined,
        min: patch.min,
        max: patch.max,
    });

    return c.json({
        success: true,
        unique_code: config,
        message: config.enabled
            ? `Kode unik aktif: nominal tagihan ditambah ${config.min}–${config.max}`
            : 'Kode unik dimatikan — nominal tagihan dibayar penuh',
    });
});

export default paymentSettings;
