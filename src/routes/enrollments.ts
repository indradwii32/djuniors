// ============================================
// Djuniors - Enrollments Routes
// ============================================

import { Hono } from 'hono';
import { Bindings } from '../types';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';

const enrollments = new Hono<{ Bindings: Bindings }>();

// Get all enrollments (admin)
enrollments.get('/', adminAuthMiddleware, async (c) => {
    const limit = parseInt(c.req.query('limit') || '50');
    const sort = c.req.query('sort') || 'recent';

    let query = `
        SELECT e.*, s.full_name as student_name, c.name as class_name, u.name as parent_name
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        JOIN classes c ON e.class_id = c.id
        LEFT JOIN users u ON s.user_id = u.id
    `;

    if (sort === 'recent') {
        query += ' ORDER BY e.enrolled_at DESC';
    }

    query += ` LIMIT ${limit}`;

    const result = await c.env.DB.prepare(query).all();
    return c.json(result.results);
});

// Get enrollment by ID
enrollments.get('/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare(`
        SELECT e.*, s.full_name as student_name, c.name as class_name
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        JOIN classes c ON e.class_id = c.id
        WHERE e.id = ?
    `).bind(id).first();

    if (!result) {
        return c.json({ error: 'Enrollment not found' }, 404);
    }

    return c.json(result);
});

// Get enrollments by user (parent's enrollments)
enrollments.get('/user/:userId', authMiddleware, async (c) => {
    const userId = c.req.param('userId');
    const result = await c.env.DB.prepare(`
        SELECT e.*, s.full_name as student_name, c.name as class_name
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        JOIN classes c ON e.class_id = c.id
        WHERE s.user_id = ?
        ORDER BY e.enrolled_at DESC
    `).bind(userId).all();

    return c.json(result.results);
});

// Create enrollment
enrollments.post('/', async (c) => {
    const body = await c.req.json();
    const { student_id, class_id, promo_code } = body;

    if (!student_id || !class_id) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    // Check if class exists
    const classInfo = await c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(class_id).first();
    if (!classInfo) {
        return c.json({ error: 'Class not found' }, 404);
    }

    // Check if already enrolled
    const existing = await c.env.DB.prepare(
        "SELECT id FROM enrollments WHERE student_id = ? AND class_id = ? AND status != 'cancelled'"
    ).bind(student_id, class_id).first();

    if (existing) {
        return c.json({ error: 'Already enrolled in this class' }, 400);
    }

    // Apply promo if provided
    let discount = 0;
    if (promo_code) {
        const promo = await c.env.DB.prepare(`
            SELECT * FROM promos
            WHERE code = ? AND is_active = 1
            AND start_date <= datetime('now')
            AND end_date >= datetime('now')
        `).bind(promo_code.toUpperCase()).first();

        if (promo && (!(promo as any).max_uses || ((promo as any).used_count as number) < ((promo as any).max_uses as number))) {
            discount = promo.discount_type === 'percentage'
                ? (classInfo.price as number) * ((promo as any).discount_value as number) / 100
                : (promo as any).discount_value as number;

            // Increment used_count
            await c.env.DB.prepare(
                'UPDATE promos SET used_count = used_count + 1 WHERE id = ?'
            ).bind(promo.id).run();
        }
    }

    const finalPrice = Math.max(0, (classInfo.price as number) - discount);

    // Create enrollment
    const id = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + (classInfo.duration_weeks as number > 8 ? 12 : 1));

    await c.env.DB.prepare(`
        INSERT INTO enrollments (id, student_id, class_id, status, payment_status, payment_method, expires_at)
        VALUES (?, ?, ?, 'pending', 'unpaid', 'manual_transfer', ?)
    `).bind(id, student_id, class_id, expiresAt.toISOString()).run();

    return c.json({
        success: true,
        id,
        amount: finalPrice,
        discount,
        class_name: classInfo.name
    });
});

// Update enrollment status (admin)
enrollments.put('/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { status, payment_status } = body;

    await c.env.DB.prepare(`
        UPDATE enrollments SET
            status = COALESCE(?, status),
            payment_status = COALESCE(?, payment_status)
        WHERE id = ?
    `).bind(status || null, payment_status || null, id).run();

    return c.json({ success: true });
});

// Cancel enrollment
enrollments.delete('/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare(
        "UPDATE enrollments SET status = 'cancelled' WHERE id = ?"
    ).bind(id).run();
    return c.json({ success: true });
});

export default enrollments;
