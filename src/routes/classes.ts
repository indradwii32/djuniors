// ============================================
// Djuniors - Classes Routes
// ============================================

import { Hono } from 'hono';
import { Bindings } from '../types';
import { adminAuthMiddleware } from '../middleware/auth';
import { cacheMiddleware, bumpCacheVersion } from '../middleware/cache';

const classes = new Hono<{ Bindings: Bindings }>();
const cache = cacheMiddleware('classes', 300);

// Helper to format class output and parse schedule_slots
function formatClass(cls: any) {
    if (!cls) return cls;
    let schedule_slots = cls.schedule_slots;
    if (typeof schedule_slots === 'string') {
        try {
            schedule_slots = JSON.parse(schedule_slots);
        } catch {
            // Keep as string or empty array if parsing fails
            schedule_slots = [];
        }
    } else if (!schedule_slots) {
        schedule_slots = [];
    }
    return {
        ...cls,
        schedule_slots
    };
}

// Get all active classes (public)
classes.get('/', cache, async (c) => {
    const result = await c.env.DB.prepare(`
        SELECT c.*, l.name as level_name, l.grade_range as level_grade_range
        FROM classes c
        LEFT JOIN levels l ON c.level_id = l.id
        WHERE c.is_active = 1
        ORDER BY c.created_at DESC
    `).all();

    const formatted = result.results.map(formatClass);
    return c.json(formatted);
});

// Get all classes including inactive (admin)
classes.get('/all', adminAuthMiddleware, cache, async (c) => {
    const result = await c.env.DB.prepare(`
        SELECT c.*, l.name as level_name, l.grade_range as level_grade_range
        FROM classes c
        LEFT JOIN levels l ON c.level_id = l.id
        ORDER BY c.created_at DESC
    `).all();

    const formatted = result.results.map(formatClass);
    return c.json(formatted);
});

// Get class by ID
classes.get('/:id', async (c) => {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare(`
        SELECT c.*, l.name as level_name, l.grade_range as level_grade_range
        FROM classes c
        LEFT JOIN levels l ON c.level_id = l.id
        WHERE c.id = ?
    `).bind(id).first();

    if (!result) {
        return c.json({ error: 'Class not found' }, 404);
    }

    return c.json(formatClass(result));
});

// Create class (admin only)
classes.post('/', adminAuthMiddleware, async (c) => {
    const body = await c.req.json();
    const {
        id: customId,
        name,
        description,
        level_id,
        price,
        max_students,
        schedule_slots,
        icon,
        image_url,
        is_active
    } = body;

    if (!name) {
        return c.json({ error: 'Missing required field: name is required' }, 400);
    }

    let scheduleSlotsStr: string | null = null;
    if (schedule_slots !== undefined && schedule_slots !== null) {
        scheduleSlotsStr = typeof schedule_slots === 'object' ? JSON.stringify(schedule_slots) : String(schedule_slots);
    }

    const id = customId || crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO classes (id, name, description, level_id, price, max_students, schedule_slots, icon, image_url, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        id,
        name,
        description || null,
        level_id || null,
        price !== undefined ? price : 0,
        max_students !== undefined ? max_students : 8,
        scheduleSlotsStr,
        icon || '🧮',
        image_url || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1
    ).run();

    await bumpCacheVersion(c.env, 'classes');
    return c.json({ success: true, id }, 201);
});

// Update class (admin only)
classes.put('/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const {
        name,
        description,
        level_id,
        price,
        max_students,
        schedule_slots,
        icon,
        image_url,
        is_active
    } = body;

    const existing = await c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
    if (!existing) {
        return c.json({ error: 'Class not found' }, 404);
    }

    let scheduleSlotsStr: string | null = null;
    if (schedule_slots !== undefined) {
        if (schedule_slots === null) {
            scheduleSlotsStr = null;
        } else {
            scheduleSlotsStr = typeof schedule_slots === 'object' ? JSON.stringify(schedule_slots) : String(schedule_slots);
        }
    }

    await c.env.DB.prepare(`
        UPDATE classes SET
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            level_id = COALESCE(?, level_id),
            price = COALESCE(?, price),
            max_students = COALESCE(?, max_students),
            schedule_slots = CASE WHEN ? THEN ? ELSE schedule_slots END,
            icon = CASE WHEN ? THEN ? ELSE icon END,
            image_url = CASE WHEN ? THEN ? ELSE image_url END,
            is_active = COALESCE(?, is_active)
        WHERE id = ?
    `).bind(
        name !== undefined ? name : null,
        description !== undefined ? description : null,
        level_id !== undefined ? level_id : null,
        price !== undefined ? price : null,
        max_students !== undefined ? max_students : null,
        schedule_slots !== undefined ? 1 : 0,
        scheduleSlotsStr,
        icon !== undefined ? 1 : 0,
        icon !== undefined ? icon : null,
        image_url !== undefined ? 1 : 0,
        image_url !== undefined ? image_url : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        id
    ).run();

    await bumpCacheVersion(c.env, 'classes');
    return c.json({ success: true });
});

// Delete class (admin only)
classes.delete('/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare('DELETE FROM classes WHERE id = ?').bind(id).run();

    if (result.meta?.changes === 0) {
        return c.json({ error: 'Class not found' }, 404);
    }

    await bumpCacheVersion(c.env, 'classes');
    return c.json({ success: true });
});

export default classes;
