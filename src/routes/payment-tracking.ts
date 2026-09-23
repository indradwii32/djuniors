// ============================================
// Djuniors - Payment Tracking Routes
// ============================================
// Antrian verifikasi pembayaran untuk dashboard (menu "Verifikasi Pembayaran").
// Endpoint konfirmasi (PUT /:id/confirm) adalah JALUR TUNGGAL verifikasi:
// update payment_tracking + sinkron status registrasi + tutup baris pending
// lain pada registrasi yang sama + invalidasi cache.

import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { adminAuthMiddleware, getStaffRefCode, isCSRole } from '../middleware/auth';
import { bumpCacheVersion } from '../middleware/cache';
import { saveProofToR2 } from '../utils/payment';
import { sendCsWaAuto } from '../utils/cs-wa';

const paymentTracking = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * GET /api/payment-tracking
 * List payment tracking (admin/CS) untuk menu Verifikasi Pembayaran.
 *
 * Query:
 *   status  : pending | confirmed | rejected | all (default all)
 *   queue   : true → hanya baris yang PUNYA bukti dan masih pending
 *             (baris awal "Registrasi baru dibuat" tanpa bukti disembunyikan)
 *   page    : 1-indexed (default 1)
 *   limit   : default 20, maks 100
 *
 * Response: { data: [...], pagination: {...} }
 * Role CS otomatis di-scope ke pendaftaran dari link miliknya.
 */
paymentTracking.get('/', adminAuthMiddleware, async (c) => {
    const status = c.req.query('status');
    const queue = c.req.query('queue') === 'true';
    const limit = Math.min(parseInt(c.req.query('limit') || '20', 10) || 20, 100);
    const page = Math.max(parseInt(c.req.query('page') || '1', 10) || 1, 1);
    const offset = (page - 1) * limit;

    const whereParts: string[] = ['1=1'];
    const params: any[] = [];

    if (status && status !== 'all') {
        whereParts.push('pt.status = ?');
        params.push(status);
    }
    if (queue) {
        // Antrian verifikasi: hanya yang menunggu + punya bukti.
        whereParts.push("pt.status = 'pending'");
        whereParts.push("pt.proof_url IS NOT NULL AND pt.proof_url != ''");
    }
    // Scope role CS: hanya pendaftaran dari link miliknya.
    if (isCSRole(c.get('jwtPayload'))) {
        const refCode = await getStaffRefCode(c);
        if (!refCode) {
            return c.json({ data: [], pagination: { page: 1, limit, offset: 0, total: 0, total_pages: 1 } });
        }
        whereParts.push('r.ref_code = ?');
        params.push(refCode);
    }
    const whereSql = whereParts.join(' AND ');

    const listSql = `
        SELECT pt.*, r.parent_name, r.parent_email, r.class_id, r.children,
               r.ref_code, r.status AS registration_status, r.payment_status AS registration_payment_status,
               r.bank_name, r.bank_account_number, c.name AS class_name
        FROM payment_tracking pt
        LEFT JOIN registrations r
            ON (pt.registration_id = r.id OR pt.registration_number = r.registration_number)
        LEFT JOIN classes c ON r.class_id = c.id
        WHERE ${whereSql}
        ORDER BY pt.created_at DESC
        LIMIT ? OFFSET ?
    `;
    const countSql = `
        SELECT COUNT(*) AS total
        FROM payment_tracking pt
        LEFT JOIN registrations r
            ON (pt.registration_id = r.id OR pt.registration_number = r.registration_number)
        WHERE ${whereSql}
    `;

    const [listRes, countRes] = await Promise.all([
        c.env.DB.prepare(listSql).bind(...params, limit, offset).all(),
        c.env.DB.prepare(countSql).bind(...params).all().catch(() => ({ results: [{ total: 0 }] })),
    ]);

    const total = Number((countRes.results?.[0] as any)?.total) || 0;
    return c.json({
        data: listRes.results || [],
        pagination: {
            page,
            limit,
            offset,
            total,
            total_pages: Math.ceil(total / limit) || 1,
        },
    });
});

/**
 * 1. GET /api/payment-tracking/:registration_number
 * Cek status pembayaran (public)
 */
paymentTracking.get('/:registration_number', async (c) => {
    const regNumber = c.req.param('registration_number').trim();

    // Get registration details
    const registration = await c.env.DB.prepare(`
        SELECT r.*, c.name as class_name, c.description as class_description
        FROM registrations r
        LEFT JOIN classes c ON r.class_id = c.id
        WHERE r.registration_number = ?
    `).bind(regNumber).first();

    // Get tracking records
    const trackingRecords = await c.env.DB.prepare(`
        SELECT * FROM payment_tracking
        WHERE registration_number = ?
        ORDER BY created_at DESC
    `).bind(regNumber).all();

    if (!registration && trackingRecords.results.length === 0) {
        return c.json({
            error: 'Not Found',
            message: 'Nomor registrasi tidak ditemukan'
        }, 404);
    }

    let parsedChildren = null;
    if (registration && registration.children) {
        try {
            parsedChildren = typeof registration.children === 'string'
                ? JSON.parse(registration.children as string)
                : registration.children;
        } catch {
            parsedChildren = registration.children;
        }
    }

    return c.json({
        success: true,
        registration_number: regNumber,
        registration: registration ? {
            ...registration,
            children: parsedChildren
        } : null,
        tracking: trackingRecords.results
    });
});

/**
 * 2. POST /api/payment-tracking
 * Submit bukti bayar (public)
 */
paymentTracking.post('/', async (c) => {
    let registrationNumber = '';
    let proofUrl = '';
    let paymentMethod = '';
    let amount: number | undefined;
    let parentPhone = '';
    let notes = '';

    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
        const body = await c.req.parseBody();
        if (typeof body.registration_number === 'string') registrationNumber = body.registration_number.trim();
        if (typeof body.proof_url === 'string') proofUrl = body.proof_url.trim();
        if (typeof body.payment_method === 'string') paymentMethod = body.payment_method.trim();
        if (body.amount) amount = parseInt(body.amount as string, 10);
        if (typeof body.parent_phone === 'string') parentPhone = body.parent_phone.trim();
        if (typeof body.notes === 'string') notes = body.notes.trim();

        const file = body.file as File | undefined;
        if (file && c.env.R2) {
            const ext = file.name.split('.').pop() || 'jpg';
            const fileKey = `payment-proofs/${registrationNumber || 'proof'}-${Date.now()}.${ext}`;
            await c.env.R2.put(fileKey, await file.arrayBuffer(), {
                httpMetadata: { contentType: file.type }
            });
            proofUrl = `/api/files/${fileKey}`;
        }
    } else {
        const body = await c.req.json();
        if (body.registration_number) registrationNumber = body.registration_number.trim();
        if (body.proof_url) proofUrl = body.proof_url.trim();
        if (body.payment_method) paymentMethod = body.payment_method.trim();
        if (body.amount !== undefined) amount = body.amount;
        if (body.parent_phone) parentPhone = body.parent_phone.trim();
        if (body.notes) notes = body.notes.trim();
    }

    if (!registrationNumber) {
        return c.json({
            error: 'Missing registration_number',
            message: 'Nomor registrasi (registration_number) diperlukan'
        }, 400);
    }

    if (!proofUrl) {
        return c.json({
            error: 'Missing payment proof',
            message: 'Bukti pembayaran (proof_url atau upload file) diperlukan'
        }, 400);
    }

    // Find registration
    const registration = await c.env.DB.prepare(
        'SELECT * FROM registrations WHERE registration_number = ?'
    ).bind(registrationNumber).first();

    if (!registration) {
        return c.json({
            error: 'Registration not found',
            message: 'Nomor registrasi tidak terdaftar'
        }, 404);
    }

    const regId = registration.id as string;
    const finalAmount = amount !== undefined ? amount : ((registration.final_amount as number) || 0);
    const method = paymentMethod || (registration.payment_method as string) || 'bank_transfer';
    const phone = parentPhone || (registration.parent_phone as string);

    // Data-URL base64 → R2 (konsisten dengan jalur upload di lacak.html).
    if (proofUrl.startsWith('data:')) {
        proofUrl = await saveProofToR2(c.env, `payment-proofs/${registrationNumber}-${Date.now()}`, proofUrl);
    }

    // Create payment tracking record
    const trackingId = crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO payment_tracking (
            id, registration_id, registration_number, parent_phone, amount, payment_method, proof_url, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
        trackingId,
        regId,
        registrationNumber,
        phone,
        finalAmount,
        method,
        proofUrl,
        notes || 'Bukti bayar dikirim via form tracking'
    ).run();

    // Update registration status to pending verification
    await c.env.DB.prepare(`
        UPDATE registrations SET
            payment_proof_url = ?,
            payment_method = ?,
            payment_status = 'pending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).bind(proofUrl, method, regId).run();

    // New proof changes tracking data — invalidate the registrations cache.
    await bumpCacheVersion(c.env, 'registrations');

    return c.json({
        success: true,
        tracking_id: trackingId,
        registration_number: registrationNumber,
        proof_url: proofUrl,
        amount: finalAmount,
        message: 'Bukti pembayaran berhasil dikirim dan menunggu konfirmasi admin'
    }, 201);
});

/**
 * 3. PUT /api/payment-tracking/:id/confirm
 * Konfirmasi pembayaran (admin/CS — CS hanya untuk pendaftaran link miliknya)
 */
paymentTracking.put('/:id/confirm', adminAuthMiddleware, async (c) => {
    const trackingId = c.req.param('id');
    const body = await c.req.json();
    const status = (body.status === 'rejected' ? 'rejected' : 'confirmed') as 'confirmed' | 'rejected';
    const notes = body.notes || null;

    // Get admin payload from context
    const adminPayload = c.get('jwtPayload');
    const confirmedBy = adminPayload?.username || adminPayload?.email || adminPayload?.userId || 'admin';

    // Find tracking record
    const tracking = await c.env.DB.prepare(
        'SELECT * FROM payment_tracking WHERE id = ?'
    ).bind(trackingId).first();

    if (!tracking) {
        return c.json({
            error: 'Not Found',
            message: 'Data payment tracking tidak ditemukan'
        }, 404);
    }

    // Resolusi registrasi terkait (untuk scoping CS + update sinkron).
    let registration: any = null;
    if (tracking.registration_id) {
        registration = await c.env.DB.prepare(
            'SELECT id, ref_code FROM registrations WHERE id = ?'
        ).bind(tracking.registration_id).first();
    }
    if (!registration) {
        registration = await c.env.DB.prepare(
            'SELECT id, ref_code FROM registrations WHERE registration_number = ?'
        ).bind(tracking.registration_number).first();
    }

    // Scope role CS: hanya pembayaran dari pendaftaran link miliknya.
    if (isCSRole(adminPayload)) {
        const refCode = await getStaffRefCode(c);
        if (!refCode || !registration || (registration.ref_code as string | null) !== refCode) {
            return c.json({ error: 'Forbidden', message: 'Hanya bisa memverifikasi pembayaran dari pendaftaran link Anda' }, 403);
        }
    }

    // Update payment_tracking
    await c.env.DB.prepare(`
        UPDATE payment_tracking SET
            status = ?,
            confirmed_by = ?,
            confirmed_at = CURRENT_TIMESTAMP,
            notes = COALESCE(?, notes)
        WHERE id = ?
    `).bind(status, confirmedBy, notes, trackingId).run();

    // Tutup baris pending LAIN pada registrasi yang sama agar tidak muncul
    // berulang di antrian verifikasi (mis. baris "Registrasi baru dibuat").
    if (registration?.id) {
        await c.env.DB.prepare(`
            UPDATE payment_tracking SET
                status = ?,
                confirmed_by = ?,
                confirmed_at = CURRENT_TIMESTAMP
            WHERE registration_id = ? AND status = 'pending' AND id != ?
        `).bind(status, confirmedBy, registration.id, trackingId).run();
    } else {
        await c.env.DB.prepare(`
            UPDATE payment_tracking SET
                status = ?,
                confirmed_by = ?,
                confirmed_at = CURRENT_TIMESTAMP
            WHERE registration_number = ? AND status = 'pending' AND id != ?
        `).bind(status, confirmedBy, tracking.registration_number, trackingId).run();
    }

    // Update associated registration
    if (registration?.id) {
        const regPaymentStatus = status === 'confirmed' ? 'paid' : 'rejected';

        await c.env.DB.prepare(`
            UPDATE registrations SET
                payment_status = ?,
                status = CASE WHEN ? = 'confirmed' THEN 'confirmed' ELSE status END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(regPaymentStatus, status, registration.id).run();
    }

    // Confirmation changes what the public tracking page shows — invalidate.
    await bumpCacheVersion(c.env, 'registrations');

    // Notifikasi WhatsApp "pembayaran dikonfirmasi" memakai setelan milik CS
    // pemilik link pendaftaran. Tidak pernah melempar — aman di sini.
    let waNotification = null;
    if (status === 'confirmed' && registration?.id) {
        const full = await c.env.DB.prepare('SELECT * FROM registrations WHERE id = ?')
            .bind(registration.id).first();
        if (full) {
            waNotification = await sendCsWaAuto(c.env, full, 'payment', {
                baseUrl: (c.env as any).BASE_URL || new URL(c.req.url).origin,
            });
        }
    }

    return c.json({
        success: true,
        tracking_id: trackingId,
        status,
        confirmed_by: confirmedBy,
        wa_notification: waNotification,
        message: status === 'confirmed'
            ? 'Pembayaran berhasil dikonfirmasi'
            : 'Pembayaran ditolak'
    });
});

export default paymentTracking;
