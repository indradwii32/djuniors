// ============================================
// Djuniors - Custom Forms Routes
// ============================================

import { Hono } from 'hono';
import { Bindings } from '../types';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';

const forms = new Hono<{ Bindings: Bindings }>();

// Get active forms (public - for registration)
forms.get('/active', async (c) => {
    const result = await c.env.DB.prepare(
        "SELECT * FROM custom_forms WHERE is_active = 1 ORDER BY created_at DESC"
    ).all();

    // Parse JSON fields
    const forms = result.results.map((f: any) => ({
        ...f,
        fields: JSON.parse(f.fields)
    }));

    return c.json(forms);
});

// Get all forms (admin)
forms.get('/', adminAuthMiddleware, async (c) => {
    const result = await c.env.DB.prepare('SELECT * FROM custom_forms ORDER BY created_at DESC').all();

    // Parse JSON fields
    const forms = result.results.map((f: any) => ({
        ...f,
        fields: JSON.parse(f.fields)
    }));

    return c.json(forms);
});

// Get form by ID
forms.get('/:id', async (c) => {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare('SELECT * FROM custom_forms WHERE id = ?').bind(id).first();

    if (!result) {
        return c.json({ error: 'Form not found' }, 404);
    }

    // Parse JSON fields
    const form = {
        ...result,
        fields: JSON.parse(result.fields as string)
    };

    return c.json(form);
});

// Create form (admin)
forms.post('/', adminAuthMiddleware, async (c) => {
    const body = await c.req.json();
    const { name, description, fields } = body;

    if (!name || !fields) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO custom_forms (id, name, description, fields)
        VALUES (?, ?, ?, ?)
    `).bind(id, name, description || null, JSON.stringify(fields)).run();

    return c.json({ success: true, id });
});

// Update form (admin)
forms.put('/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { name, description, fields, is_active } = body;

    await c.env.DB.prepare(`
        UPDATE custom_forms SET
            name = COALESCE(?, name),
            description = COALESCE(?, description),
            fields = COALESCE(?, fields),
            is_active = COALESCE(?, is_active)
        WHERE id = ?
    `).bind(
        name || null, description || null,
        fields ? JSON.stringify(fields) : null,
        is_active !== undefined ? is_active : null,
        id
    ).run();

    return c.json({ success: true });
});

// Delete form (admin)
forms.delete('/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM custom_forms WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

// Submit form
forms.post('/submit', async (c) => {
    const body = await c.req.json();
    const { form_id, student_id, data } = body;

    if (!form_id || !data) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO form_submissions (id, form_id, student_id, data)
        VALUES (?, ?, ?, ?)
    `).bind(id, form_id, student_id || null, JSON.stringify(data)).run();

    return c.json({ success: true, id });
});

export default forms;
