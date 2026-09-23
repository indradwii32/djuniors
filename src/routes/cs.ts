// ============================================
// Djuniors - CS Link & Tracking Routes
// ============================================
// GET /api/cs/overview
// Statistik ringkas untuk dashboard CS (dan admin yang melihat per-CS
// dengan ?ref=KODE). Termasuk kode ref + jumlah antrian verifikasi milik CS.

import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { adminAuthMiddleware, getStaffRefCode } from '../middleware/auth';

const cs = new Hono<{ Bindings: Bindings; Variables: Variables }>();

cs.get('/overview', adminAuthMiddleware, async (c) => {
    const payload = c.get('jwtPayload');

    let refCode: string | null;
    if (payload.role === 'cs') {
        refCode = await getStaffRefCode(c);
        if (!refCode) {
            return c.json({
                error: 'No ref code',
                message: 'Akun CS Anda belum memiliki kode link. Hubungi administrator.',
            }, 403);
        }
    } else {
        refCode = (c.req.query('ref') || '').trim() || null;
        if (!refCode) {
            return c.json({ error: 'Missing ref', message: 'Parameter ?ref=KODE_CS diperlukan' }, 400);
        }
    }

    const stats = await c.env.DB.prepare(`
        SELECT COUNT(*) AS total,
               COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END), 0) AS paid,
               COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN final_amount ELSE 0 END), 0) AS revenue,
               COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END), 0) AS verifying
        FROM registrations
        WHERE ref_code = ?
    `).bind(refCode).first();

    const queue = await c.env.DB.prepare(`
        SELECT COUNT(*) AS n
        FROM payment_tracking pt
        LEFT JOIN registrations r
            ON (pt.registration_id = r.id OR pt.registration_number = r.registration_number)
        WHERE r.ref_code = ?
          AND pt.status = 'pending'
          AND pt.proof_url IS NOT NULL AND pt.proof_url != ''
    `).bind(refCode).first();

    return c.json({
        success: true,
        ref_code: refCode,
        total: Number(stats?.total) || 0,
        paid: Number(stats?.paid) || 0,
        revenue: Number(stats?.revenue) || 0,
        verifying: Number(stats?.verifying) || 0,
        pending_verification: Number(queue?.n) || 0,
    });
});

export default cs;
