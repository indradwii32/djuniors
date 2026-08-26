// ============================================
// Djuniors - Levels Routes
// ============================================

import { Hono } from 'hono';
import { Bindings } from '../types';
import { adminAuthMiddleware } from '../middleware/auth';
import { cacheMiddleware, bumpCacheVersion } from '../middleware/cache';

const levels = new Hono<{ Bindings: Bindings }>();
const cache = cacheMiddleware('levels', 300);

// Get all active levels (public)
levels.get('/', cache, async (c) => {
    const result = await c.env.DB.prepare(
        'SELECT * FROM levels WHERE is_active = 1 ORDER BY sort_order ASC, name ASC'
    ).all();
    return c.json(result.results);
});

// Get all levels including inactive (admin)
levels.get('/all', adminAuthMiddleware, cache, async (c) => {
    const result = await c.env.DB.prepare(
        'SELECT * FROM levels ORDER BY sort_order ASC, created_at DESC'
    ).all();
    return c.json(result.results);
});

// Get level by ID (public)
levels.get('/:id', async (c) => {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare('SELECT * FROM levels WHERE id = ?').bind(id).first();

    if (!result) {
        return c.json({ error: 'Level not found' }, 404);
    }

    return c.json(result);
});

// Create level (admin only)
levels.post('/', adminAuthMiddleware, async (c) => {
    const body = await c.req.json();
    const { id: customId, name, description, min_age, max_age, grade_range, is_active, sort_order } = body;

    if (!name) {
        return c.json({ error: 'Missing required fields: name is required' }, 400);
    }

    const id = customId || crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO levels (id, name, description, min_age, max_age, grade_range, is_active, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        id,
        name,
        description || null,
        min_age !== undefined ? min_age : null,
        max_age !== undefined ? max_age : null,
        grade_range || null,
        is_active !== undefined ? (is_active ? 1 : 0) : 1,
        sort_order !== undefined ? sort_order : 0
    ).run();

    await bumpCacheVersion(c.env, 'levels');
    return c.json({ success: true, id }, 201);
});

// Update level (admin only)
levels.put('/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, description, min_age, max_age, grade_range, is_active, sort_order } = body;

    // Check if level exists
    const existing = await c.env.DB.prepare('SELECT * FROM levels WHERE id = ?').bind(id).first();
    if (!existing) {
        return c.json({ error: 'Level not found' }, 404);
    }

    await c.env.DB.prepare(`
        UPDATE levels SET
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            min_age = COALESCE(?, min_age),
            max_age = COALESCE(?, max_age),
            grade_range = COALESCE(?, grade_range),
            is_active = COALESCE(?, is_active),
            sort_order = COALESCE(?, sort_order)
        WHERE id = ?
    `).bind(
        name !== undefined ? name : null,
        description !== undefined ? description : null,
        min_age !== undefined ? min_age : null,
        max_age !== undefined ? max_age : null,
        grade_range !== undefined ? grade_range : null,
        is_active !== undefined ? (is_active ? 1 : 0) : null,
        sort_order !== undefined ? sort_order : null,
        id
    ).run();

    await bumpCacheVersion(c.env, 'levels');
    return c.json({ success: true });
});

// Delete level (admin only)
levels.delete('/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare('DELETE FROM levels WHERE id = ?').bind(id).run();

    if (result.meta?.changes === 0) {
        return c.json({ error: 'Level not found' }, 404);
    }

    await bumpCacheVersion(c.env, 'levels');
    return c.json({ success: true });
});

export default levels;
