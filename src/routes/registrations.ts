// ============================================
// Djuniors - Registrations Routes
// ============================================

import { Hono } from 'hono';
import { Bindings, Variables, Registration, RegistrationChild } from '../types';
import { adminAuthMiddleware } from '../middleware/auth';
import { cacheMiddleware, bumpCacheVersion } from '../middleware/cache';

const registrations = new Hono<{ Bindings: Bindings; Variables: Variables }>();
// Public tracking reads are cached for 60s — long enough to absorb repeated
// polling of the same registration number, short enough that a payment-status
// change shows up quickly. All write paths below bump the version stamp so
// confirmation flows invalidate immediately.
const trackCache = cacheMiddleware('registrations', 60);

// Helper to format and parse registration children
function formatRegistration(reg: any): Registration | null {
    if (!reg) return null;
    let children = reg.children;
    if (typeof children === 'string') {
        try {
            children = JSON.parse(children);
        } catch {
            children = [{ name: reg.children }];
        }
    }
    return {
        ...reg,
        children
    };
}

// Helper to generate unique registration number (DJN-YYYYMMDD-XXXX)
function generateRegistrationNumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let random = '';
    for (let i = 0; i < 4; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `DJN-${year}${month}${day}-${random}`;
}

/**
 * 1. POST /api/registrations
 * Buat registrasi baru (generate registration_number unik: DJN-YYYYMMDD-XXXX)
 * Public endpoint
 */
registrations.post('/', async (c) => {
    const body = await c.req.json();
    const {
        parent_name,
        parent_phone,
        parent_email,
        parent_city,
        class_id,
        schedule_slot,
        children,
        promo_code,
        payment_method,
        notes
    } = body;

    // Validate required fields
    if (!parent_name || !parent_phone || !class_id || !schedule_slot || !children) {
        return c.json({
            error: 'Missing required fields',
            message: 'parent_name, parent_phone, class_id, schedule_slot, and children are required'
        }, 400);
    }

    // Check if class exists
    const classInfo = await c.env.DB.prepare(
        'SELECT * FROM classes WHERE id = ?'
    ).bind(class_id).first();

    if (!classInfo) {
        return c.json({ error: 'Class not found' }, 404);
    }

    // Process children array or string
    let parsedChildren: RegistrationChild[] = [];
    let childrenJsonStr = '';

    if (Array.isArray(children)) {
        if (children.length === 0) {
            return c.json({ error: 'At least one child is required' }, 400);
        }
        parsedChildren = children;
        childrenJsonStr = JSON.stringify(children);
    } else if (typeof children === 'string') {
        try {
            const parsed = JSON.parse(children);
            if (Array.isArray(parsed) && parsed.length > 0) {
                parsedChildren = parsed;
                childrenJsonStr = children;
            } else {
                parsedChildren = [{ name: children }];
                childrenJsonStr = JSON.stringify(parsedChildren);
            }
        } catch {
            parsedChildren = [{ name: children }];
            childrenJsonStr = JSON.stringify(parsedChildren);
        }
    } else if (typeof children === 'object' && children !== null) {
        parsedChildren = [children as RegistrationChild];
        childrenJsonStr = JSON.stringify(parsedChildren);
    } else {
        return c.json({ error: 'Invalid children format' }, 400);
    }

    // Process schedule_slot
    const scheduleSlotStr = typeof schedule_slot === 'object'
        ? JSON.stringify(schedule_slot)
        : String(schedule_slot);

    // Calculate total amount
    const numChildren = Math.max(1, parsedChildren.length);
    const classPrice = (classInfo.price as number) || 0;
    const totalAmount = classPrice * numChildren;

    // Process promo code if provided
    let discountAmount = 0;
    let appliedPromoCode: string | null = null;

    if (promo_code) {
        const promo = await c.env.DB.prepare(`
            SELECT * FROM promos
            WHERE code = ? AND is_active = 1
            AND (start_date IS NULL OR start_date <= datetime('now'))
            AND (end_date IS NULL OR end_date >= datetime('now'))
        `).bind(promo_code.toUpperCase().trim()).first();

        if (promo) {
            const minPurchase = (promo.min_purchase as number) || 0;
            const maxUses = promo.max_uses as number | null;
            const usedCount = (promo.used_count as number) || 0;

            if (totalAmount >= minPurchase && (maxUses === null || usedCount < maxUses)) {
                appliedPromoCode = promo.code as string;
                if (promo.discount_type === 'percentage') {
                    discountAmount = Math.round((totalAmount * (promo.discount_value as number)) / 100);
                } else {
                    discountAmount = promo.discount_value as number;
                }
                discountAmount = Math.min(discountAmount, totalAmount);

                // Increment promo used_count
                await c.env.DB.prepare(
                    'UPDATE promos SET used_count = used_count + 1 WHERE id = ?'
                ).bind(promo.id).run();
            }
        }
    }

    const finalAmount = Math.max(0, totalAmount - discountAmount);

    // Generate unique registration number
    let registrationNumber = generateRegistrationNumber();
    // Verify uniqueness
    let existingReg = await c.env.DB.prepare(
        'SELECT id FROM registrations WHERE registration_number = ?'
    ).bind(registrationNumber).first();

    let retryCount = 0;
    while (existingReg && retryCount < 5) {
        registrationNumber = generateRegistrationNumber();
        existingReg = await c.env.DB.prepare(
            'SELECT id FROM registrations WHERE registration_number = ?'
        ).bind(registrationNumber).first();
        retryCount++;
    }

    const id = crypto.randomUUID();
    const method = payment_method || 'bank_transfer';

    // Insert registration
    await c.env.DB.prepare(`
        INSERT INTO registrations (
            id, registration_number, parent_name, parent_phone, parent_email, parent_city,
            class_id, schedule_slot, children, total_amount, discount_amount, final_amount,
            promo_code, payment_method, status, payment_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?)
    `).bind(
        id,
        registrationNumber,
        parent_name.trim(),
        parent_phone.trim(),
        parent_email ? parent_email.trim() : null,
        parent_city ? parent_city.trim() : null,
        class_id,
        scheduleSlotStr,
        childrenJsonStr,
        totalAmount,
        discountAmount,
        finalAmount,
        appliedPromoCode,
        method,
        notes || null
    ).run();

    // Create initial payment tracking record
    const trackingId = crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO payment_tracking (
            id, registration_id, registration_number, parent_phone, amount, payment_method, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
        trackingId,
        id,
        registrationNumber,
        parent_phone.trim(),
        finalAmount,
        method,
        'Registrasi baru dibuat'
    ).run();

    // New registration → invalidate cached tracking reads + admin stats.
    await bumpCacheVersion(c.env, 'registrations');

    return c.json({
        success: true,
        id,
        registration_number: registrationNumber,
        tracking_id: trackingId,
        registration: {
            id,
            registration_number: registrationNumber,
            parent_name: parent_name.trim(),
            parent_phone: parent_phone.trim(),
            parent_email: parent_email ? parent_email.trim() : null,
            parent_city: parent_city ? parent_city.trim() : null,
            class_id,
            class_name: classInfo.name,
            schedule_slot: scheduleSlotStr,
            children: parsedChildren,
            total_amount: totalAmount,
            discount_amount: discountAmount,
            final_amount: finalAmount,
            promo_code: appliedPromoCode,
            payment_method: method,
            status: 'pending',
            payment_status: 'unpaid',
            notes: notes || null
        },
        message: 'Registrasi berhasil dibuat'
    }, 201);
});

/**
 * 2. GET /api/registrations
 * List semua registrasi (admin)
 *
 * Pagination: `?page=1&limit=20` (1-indexed) or `?limit=20&offset=0` (legacy).
 * Defaults: page=1, limit=50. Hard cap: limit=200.
 */
registrations.get('/', adminAuthMiddleware, async (c) => {
    const status = c.req.query('status');
    const paymentStatus = c.req.query('payment_status');
    const classId = c.req.query('class_id');
    const search = c.req.query('search');
    // `completed` partitions the registrations for the two admin pages:
    //   completed=true  → Data Peserta: status='confirmed' AND payment_status='paid'
    //   completed=false → Pendaftaran Baru: anything still in progress
    // (rejected registrations are excluded from "completed" — a rejected
    // registration is not a participant.)
    const completedParam = c.req.query('completed') === 'true';

    // Accept both page/limit (preferred) and offset/limit (legacy).
    // `page` wins when present.
    const pageRaw = c.req.query('page');
    const limitRaw = c.req.query('limit') || '50';
    const offsetRaw = c.req.query('offset') || '0';
    const limit = Math.min(parseInt(limitRaw, 10) || 50, 200);
    let offset: number;
    if (pageRaw !== undefined && pageRaw !== '') {
        const page = Math.max(parseInt(pageRaw, 10) || 1, 1);
        offset = (page - 1) * limit;
    } else {
        offset = Math.max(parseInt(offsetRaw, 10) || 0, 0);
    }

    // Explicit column list — keeps the list query lean. `children` IS included:
    // the admin list table displays the child count + names per registration
    // (and the Participants page derives its rows from it). If this ever
    // becomes a row-read bottleneck at scale, add a lightweight
    // `children_summary` column instead of dropping it again — the UI depends
    // on it (see dashboard Registrations.tsx / Participants.tsx).
    const selectCols = `
        r.id,
        r.registration_number,
        r.parent_name,
        r.parent_phone,
        r.parent_email,
        r.parent_city,
        r.class_id,
        r.schedule_slot,
        r.children,
        r.total_amount,
        r.discount_amount,
        r.final_amount,
        r.promo_code,
        r.payment_method,
        r.status,
        r.payment_status,
        r.created_at,
        r.updated_at,
        c.name as class_name,
        c.price as class_price
    `;

    // Build WHERE clause once, reuse for count + page query.
    const whereParts: string[] = ['1=1'];
    const whereParams: any[] = [];
    if (status)        { whereParts.push('r.status = ?');         whereParams.push(status); }
    if (paymentStatus) { whereParts.push('r.payment_status = ?'); whereParams.push(paymentStatus); }
    if (classId)       { whereParts.push('r.class_id = ?');       whereParams.push(classId); }
    if (c.req.query('completed') !== undefined) {
        if (completedParam) {
            // Fully completed: confirmed + fully paid.
            whereParts.push("r.status = 'confirmed' AND r.payment_status = 'paid'");
        } else {
            // In progress: not yet confirmed, not yet paid, or rejected mid-flow.
            whereParts.push("NOT (r.status = 'confirmed' AND r.payment_status = 'paid')");
        }
    }
    if (search) {
        const sw = `%${search}%`;
        whereParts.push('(r.registration_number LIKE ? OR r.parent_name LIKE ? OR r.parent_phone LIKE ? OR r.parent_email LIKE ?)');
        whereParams.push(sw, sw, sw, sw);
    }
    const whereSql = whereParts.join(' AND ');

    // Run page query + total count in parallel.
    const listSql = `SELECT ${selectCols} FROM registrations r LEFT JOIN classes c ON r.class_id = c.id WHERE ${whereSql} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
    // The COUNT runs against `registrations` only (no join); the WHERE clause
    // is identical except the filter predicates that reference the join are
    // dropped — there are none in this codebase, so we can reuse `whereSql`
    // directly. Keep them in sync if you add a join-only filter.
    const countQuery = `SELECT COUNT(*) as total FROM registrations r WHERE ${whereSql}`;

    const [pageRes, countRes] = await Promise.all([
        c.env.DB.prepare(listSql).bind(...whereParams, limit, offset).all(),
        c.env.DB.prepare(countQuery).bind(...whereParams).all().catch(() => ({ results: [{ total: 0 }] })),
    ]);

    const total = (countRes.results?.[0] as any)?.total ?? 0;
    const formatted = pageRes.results.map(formatRegistration);
    const page = pageRaw ? Math.max(parseInt(pageRaw, 10) || 1, 1) : Math.floor(offset / limit) + 1;
    return c.json({
        data: formatted,
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
 * 4. GET /api/registrations/track/:number
 * Lacak status pembayaran (public, by registration_number)
 */
registrations.get('/track/:number', trackCache, async (c) => {
    const registrationNumber = (c.req.param('number') || '').trim();

    const registration = await c.env.DB.prepare(`
        SELECT r.*, c.name as class_name, c.description as class_description
        FROM registrations r
        LEFT JOIN classes c ON r.class_id = c.id
        WHERE r.registration_number = ?
    `).bind(registrationNumber).first();

    if (!registration) {
        return c.json({ error: 'Registration not found', message: 'Nomor registrasi tidak ditemukan' }, 404);
    }

    const trackingList = await c.env.DB.prepare(`
        SELECT * FROM payment_tracking
        WHERE registration_number = ?
        ORDER BY created_at DESC
    `).bind(registrationNumber).all();

    const formatted = formatRegistration(registration);

    return c.json({
        success: true,
        registration: formatted,
        tracking: trackingList.results
    });
});

/**
 * 5. GET /api/registrations/track/phone/:phone
 * Lacak by nomor WA (public)
 */
registrations.get('/track/phone/:phone', trackCache, async (c) => {
    const rawPhone = (c.req.param('phone') || '').trim();
    // Normalize phone format for matching (e.g. 08123 vs 628123)
    const cleanPhone = rawPhone.replace(/\D/g, '');
    let alternatePhone = cleanPhone;

    if (cleanPhone.startsWith('62')) {
        alternatePhone = '0' + cleanPhone.substring(2);
    } else if (cleanPhone.startsWith('0')) {
        alternatePhone = '62' + cleanPhone.substring(1);
    }

    const result = await c.env.DB.prepare(`
        SELECT r.*, c.name as class_name, c.description as class_description
        FROM registrations r
        LEFT JOIN classes c ON r.class_id = c.id
        WHERE r.parent_phone = ? OR r.parent_phone = ? OR r.parent_phone LIKE ?
        ORDER BY r.created_at DESC
    `).bind(rawPhone, alternatePhone, `%${cleanPhone.slice(-8)}%`).all();

    const formatted = result.results.map(formatRegistration);

    return c.json({
        success: true,
        count: formatted.length,
        registrations: formatted
    });
});

/**
 * 3. GET /api/registrations/:id
 * Detail by ID
 */
registrations.get('/:id', trackCache, async (c) => {
    const id = c.req.param('id');

    const result = await c.env.DB.prepare(`
        SELECT r.*, c.name as class_name, c.description as class_description, c.price as class_price
        FROM registrations r
        LEFT JOIN classes c ON r.class_id = c.id
        WHERE r.id = ?
    `).bind(id).first();

    if (!result) {
        return c.json({ error: 'Registration not found' }, 404);
    }

    const trackingList = await c.env.DB.prepare(`
        SELECT * FROM payment_tracking
        WHERE registration_id = ?
        ORDER BY created_at DESC
    `).bind(id).all();

    const formatted = formatRegistration(result);

    return c.json({
        ...formatted,
        tracking: trackingList.results
    });
});

/**
 * 6. PUT /api/registrations/:id/status
 * Update status (admin)
 */
registrations.put('/:id/status', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status, payment_status, notes } = body;

    const existing = await c.env.DB.prepare(
        'SELECT * FROM registrations WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
        return c.json({ error: 'Registration not found' }, 404);
    }

    await c.env.DB.prepare(`
        UPDATE registrations SET
            status = COALESCE(?, status),
            payment_status = COALESCE(?, payment_status),
            notes = COALESCE(?, notes),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).bind(
        status || null,
        payment_status || null,
        notes || null,
        id
    ).run();

    // If payment_status is updated, sync payment_tracking if appropriate
    if (payment_status) {
        const trackingStatus = payment_status === 'paid' ? 'confirmed' : (payment_status === 'rejected' ? 'rejected' : 'pending');
        await c.env.DB.prepare(`
            UPDATE payment_tracking SET
                status = ?,
                confirmed_at = CURRENT_TIMESTAMP
            WHERE registration_id = ? AND status = 'pending'
        `).bind(trackingStatus, id).run();
    }

    // Status change must be visible to the public tracking page immediately.
    await bumpCacheVersion(c.env, 'registrations');

    return c.json({
        success: true,
        message: 'Status registrasi berhasil diperbarui'
    });
});

/**
 * 7. POST /api/registrations/:id/payment
 * Upload bukti bayar (public)
 */
registrations.post('/:id/payment', async (c) => {
    const id = c.req.param('id');

    const registration = await c.env.DB.prepare(
        'SELECT * FROM registrations WHERE id = ?'
    ).bind(id).first();

    if (!registration) {
        return c.json({ error: 'Registration not found' }, 404);
    }

    let proofUrl = '';
    let paymentMethod = (registration.payment_method as string) || 'bank_transfer';
    let amount = (registration.final_amount as number) || 0;
    let notes = '';

    const contentType = c.req.header('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
        const body = await c.req.parseBody();
        if (typeof body.proof_url === 'string') proofUrl = body.proof_url;
        if (typeof body.payment_method === 'string') paymentMethod = body.payment_method;
        if (body.amount) amount = parseInt(body.amount as string, 10) || amount;
        if (typeof body.notes === 'string') notes = body.notes;

        const file = body.file as File | undefined;
        if (file && c.env.R2) {
            const ext = file.name.split('.').pop() || 'jpg';
            const fileKey = `payment-proofs/${id}-${Date.now()}.${ext}`;
            await c.env.R2.put(fileKey, await file.arrayBuffer(), {
                httpMetadata: { contentType: file.type }
            });
            proofUrl = `/api/files/${fileKey}`;
        }
    } else {
        const body = await c.req.json();
        if (body.proof_url) proofUrl = body.proof_url;
        if (body.payment_method) paymentMethod = body.payment_method;
        if (body.amount !== undefined) amount = body.amount;
        if (body.notes) notes = body.notes;
    }

    if (!proofUrl) {
        return c.json({ error: 'Missing payment proof', message: 'proof_url atau file bukti bayar diperlukan' }, 400);
    }

    // Update registration with payment proof
    await c.env.DB.prepare(`
        UPDATE registrations SET
            payment_proof_url = ?,
            payment_method = ?,
            payment_status = 'pending',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `).bind(proofUrl, paymentMethod, id).run();

    // Insert new payment tracking record
    const trackingId = crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO payment_tracking (
            id, registration_id, registration_number, parent_phone, amount, payment_method, proof_url, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
        trackingId,
        id,
        registration.registration_number as string,
        registration.parent_phone as string,
        amount,
        paymentMethod,
        proofUrl,
        notes || 'Bukti bayar diunggah'
    ).run();

    // Uploaded payment proof changes tracking data — invalidate cache.
    await bumpCacheVersion(c.env, 'registrations');

    return c.json({
        success: true,
        tracking_id: trackingId,
        proof_url: proofUrl,
        message: 'Bukti pembayaran berhasil diunggah dan sedang diverifikasi'
    });
});

export default registrations;
