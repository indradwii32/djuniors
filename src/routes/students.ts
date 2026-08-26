// ============================================
// Djuniors - Students Routes
// ============================================

import { Hono } from 'hono';
import { Bindings } from '../types';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';

const students = new Hono<{ Bindings: Bindings }>();

// Get all students (admin only)
students.get('/', adminAuthMiddleware, async (c) => {
    const result = await c.env.DB.prepare('SELECT * FROM students ORDER BY created_at DESC').all();
    return c.json(result.results);
});

// Get student by ID
students.get('/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare('SELECT * FROM students WHERE id = ?').bind(id).first();

    if (!result) {
        return c.json({ error: 'Student not found' }, 404);
    }

    return c.json(result);
});

// Get students by user_id (parent's children)
students.get('/parent/:userId', authMiddleware, async (c) => {
    const userId = c.req.param('userId');
    const result = await c.env.DB.prepare(
        'SELECT * FROM students WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(userId).all();

    return c.json(result.results);
});

// Create student (admin only)
students.post('/', adminAuthMiddleware, async (c) => {
    const body = await c.req.json();
    const { user_id, full_name, birth_date, grade, school, notes } = body;

    if (!full_name || !grade) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO students (id, user_id, full_name, birth_date, grade, school, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, user_id || null, full_name, birth_date || null, grade, school || null, notes || null).run();

    return c.json({ success: true, id });
});

// Update student
students.put('/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const { full_name, birth_date, grade, school, notes } = body;

    await c.env.DB.prepare(`
        UPDATE students SET full_name = ?, birth_date = ?, grade = ?, school = ?, notes = ?
        WHERE id = ?
    `).bind(full_name, birth_date, grade, school, notes, id).run();

    return c.json({ success: true });
});

// Delete student (admin only)
students.delete('/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM students WHERE id = ?').bind(id).run();
    return c.json({ success: true });
});

export default students;
