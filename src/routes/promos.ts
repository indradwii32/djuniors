// ============================================
// Djuniors - Promos Routes
// ============================================

import { Hono } from 'hono';
import { Bindings } from '../types';
import { adminAuthMiddleware } from '../middleware/auth';

const promos = new Hono<{ Bindings: Bindings }>();

// Validate promo code (public)
promos.post('/validate', async (c) => {
    const { code } = await c.req.json();

    if (!code) {
        return c.json({ valid: false, message: 'Kode promo required' });
    }

    const promo = await c.env.DB.prepare(`
        SELECT * FROM promos
        WHERE code = ? AND is_active = 1
        AND (start_date IS NULL OR start_date <= datetime('now'))
        AND (end_date IS NULL OR end_date >= datetime('now'))
    `).bind(code.toUpperCase()).first();

    if (!promo) {
        return c.json({ valid: false, message: 'Kode promo tidak valid atau tidak aktif' });
    }

    if ((promo as any).max_uses && ((promo as any).used_count as number) >= ((promo as any).max_uses as number)) {
        return c.json({ valid: false, message: 'Kode promo sudah habis' });
    }

    return c.json({
        valid: true,
        discount: (promo as any).discount_value,
        type: (promo as any).discount_type,
        description: (promo as any).description
    });
});

// Get all promos (admin)
promos.get('/', adminAuthMiddleware, async (c) => {
    const result = await c.env.DB.prepare('SELECT * FROM promos ORDER BY created_at DESC').all();
    return c.json(result.results || []);
});

// Get all promos (admin) - alias /all
promos.get('/all', adminAuthMiddleware, async (c) => {
    const result = await c.env.DB.prepare('SELECT * FROM promos ORDER BY created_at DESC').all();
    return c.json(result.results || []);
});

// Get promo by ID (admin)
promos.get('/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare('SELECT * FROM promos WHERE id = ?').bind(id).first();

    if (!result) {
        return c.json({ error: 'Promo not found' }, 404);
    }

    return c.json(result);
});

// Create promo (admin)
promos.post('/', adminAuthMiddleware, async (c) => {
    const body = await c.req.json();
    const { id: customId, code, description, discount_type, discount_value, min_purchase, max_uses, start_date, end_date, is_active } = body;

    if (!code || !discount_type || discount_value === undefined) {
        return c.json({ error: 'Missing required fields: code, discount_type, and discount_value are required' }, 400);
    }

    // Check if code exists
    const existing = await c.env.DB.prepare('SELECT id FROM promos WHERE code = ?').bind(code.toUpperCase()).first();
    if (existing) {
        return c.json({ error: 'Promo code already exists' }, 400);
    }

    const id = customId || crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO promos (id, code, description, discount_type, discount_value, min_purchase, max_uses, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        id,
        code.toUpperCase(),
        description || null,
        discount_type,
        Number(discount_value) || 0,
        min_purchase !== undefined ? Number(min_purchase) : 0,
        max_uses !== undefined && max_uses !== null && max_uses !== '' ? Number(max_uses) : null,
        start_date || null,
        end_date || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
    ).run();

    return c.json({ success: true, id }, 201);
});

// Update promo (admin)
promos.put('/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { code, description, discount_type, discount_value, min_purchase, max_uses, start_date, end_date, is_active } = body;

    const existing = await c.env.DB.prepare('SELECT id FROM promos WHERE id = ?').bind(id).first();
    if (!existing) {
        return c.json({ error: 'Promo not found' }, 404);
    }

    if (code) {
        const codeExisting = await c.env.DB.prepare('SELECT id FROM promos WHERE code = ? AND id != ?').bind(code.toUpperCase(), id).first();
        if (codeExisting) {
            return c.json({ error: 'Promo code already exists' }, 400);
        }
    }

    await c.env.DB.prepare(`
        UPDATE promos SET
            code = COALESCE(?, code),
            description = CASE WHEN ? THEN ? ELSE description END,
            discount_type = COALESCE(?, discount_type),
            discount_value = COALESCE(?, discount_value),
            min_purchase = COALESCE(?, min_purchase),
            max_uses = CASE WHEN ? THEN ? ELSE max_uses END,
            start_date = CASE WHEN ? THEN ? ELSE start_date END,
            end_date = CASE WHEN ? THEN ? ELSE end_date END,
            is_active = COALESCE(?, is_active)
        WHERE id = ?
    `).bind(
        code ? code.toUpperCase() : null,
        description !== undefined ? 1 : 0,
        description !== undefined ? description : null,
        discount_type || null,
        discount_value !== undefined ? Number(discount_value) : null,
        min_purchase !== undefined ? Number(min_purchase) : null,
        max_uses !== undefined ? 1 : 0,
        max_uses !== undefined && max_uses !== null && max_uses !== '' ? Number(max_uses) : null,
        start_date !== undefined ? 1 : 0,
        start_date !== undefined ? start_date : null,
        end_date !== undefined ? 1 : 0,
        end_date !== undefined ? end_date : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
    ).run();

    return c.json({ success: true });
});

// Delete promo (admin)
promos.delete('/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare('DELETE FROM promos WHERE id = ?').bind(id).run();
    if (result.meta?.changes === 0) {
        return c.json({ error: 'Promo not found' }, 404);
    }
    return c.json({ success: true });
});

export default promos;
