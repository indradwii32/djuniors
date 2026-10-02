// ============================================
// Djuniors - Auth Routes
// ============================================

import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { createJWT, hashPassword, verifyPassword, getJwtSecret } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';
import { rateLimit } from '../utils/rate-limit';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Rate limit endpoint login. Tanpa ini kredensial admin bisa di-brute-force
// tanpa hambatan dari satu IP. Admin: 8x/15 menit per IP. User: 10x/15 menit.
const adminLoginLimiter = rateLimit({
    name: 'auth-admin-login',
    limit: 8,
    windowSeconds: 900,
    message: 'Terlalu banyak percobaan login. Tunggu 15 menit lalu coba lagi.',
});
const userLoginLimiter = rateLimit({
    name: 'auth-user-login',
    limit: 10,
    windowSeconds: 900,
    message: 'Terlalu banyak percobaan login. Tunggu 15 menit lalu coba lagi.',
});
const registerLimiter = rateLimit({
    name: 'auth-register',
    limit: 5,
    windowSeconds: 3600,
    message: 'Terlalu banyak pembuatan akun dari jaringan ini. Silakan coba nanti.',
});

// Register (Parent)
auth.post('/register', registerLimiter, async (c) => {
    const body = await c.req.json();
    const { email, password, name, phone, child_name, birth_date, grade, school } = body;

    // Validate required fields
    if (!email || !password || !name || !child_name || !grade) {
        return c.json({ error: 'Missing required fields' }, 400);
    }

    // Check if email exists
    const existingUser = await c.env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existingUser) {
        return c.json({ error: 'Email already registered' }, 400);
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userId = crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO users (id, email, name, phone, password_hash, role)
        VALUES (?, ?, ?, ?, ?, 'parent')
    `).bind(userId, email, name, phone || null, passwordHash).run();

    // Create student
    const studentId = crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO students (id, user_id, full_name, birth_date, grade, school)
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(studentId, userId, child_name, birth_date || null, grade, school || null).run();

    // Create enrollment if class_id is provided
    let enrollmentId: string | null = null;
    if (body.class_id) {
        enrollmentId = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
        await c.env.DB.prepare(`
            INSERT INTO enrollments (id, student_id, class_id, status, payment_status, payment_method, expires_at)
            VALUES (?, ?, ?, 'pending', 'unpaid', 'manual_transfer', ?)
        `).bind(enrollmentId, studentId, body.class_id, expiresAt.toISOString()).run();
    }

    // Generate JWT
    const token = await createJWT({
        userId,
        email,
        role: 'parent',
        type: 'user'
    }, await getJwtSecret(c.env), 7 * 24); // 7 days

    // Store session in KV
    await c.env.KV.put(`session:${userId}`, token, {
        expirationTtl: 7 * 24 * 60 * 60
    });

    return c.json({
        success: true,
        token,
        user: { id: userId, email, name, phone },
        student_id: studentId,
        enrollment_id: enrollmentId
    });
});

// Login (Parent)
auth.post('/login', userLoginLimiter, async (c) => {
    const { email, password } = await c.req.json();

    if (!email || !password) {
        return c.json({ error: 'Email and password required' }, 400);
    }

    // Find user
    const user = await c.env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
    ).bind(email).first();

    if (!user) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const valid = await verifyPassword(password, user.password_hash as string);
    if (!valid) {
        return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate JWT
    const token = await createJWT({
        userId: user.id as string,
        email: user.email as string,
        role: user.role as string,
        type: 'user'
    }, await getJwtSecret(c.env), 7 * 24);

    // Store session
    await c.env.KV.put(`session:${user.id}`, token, {
        expirationTtl: 7 * 24 * 60 * 60
    });

    return c.json({
        success: true,
        token,
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        }
    });
});

// Admin Login
auth.post('/admin/login', adminLoginLimiter, async (c) => {
    const { username, password } = await c.req.json();

    if (!username || !password) {
        return c.json({ error: 'Username and password required' }, 400);
    }

    // Find admin
    const admin = await c.env.DB.prepare(
        'SELECT * FROM admin_accounts WHERE username = ? AND is_active = 1'
    ).bind(username).first();

    if (!admin) {
        return c.json({ error: 'Username atau password salah' }, 401);
    }

    // Verify password
    const valid = await verifyPassword(password, admin.password_hash as string);
    if (!valid) {
        return c.json({ error: 'Username atau password salah' }, 401);
    }

    // Update last login
    await c.env.DB.prepare(
        'UPDATE admin_accounts SET last_login = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(admin.id).run();

    // Generate JWT
    const token = await createJWT({
        userId: admin.id as string,
        username: admin.username as string,
        role: admin.role as string,
        type: 'admin'
    }, await getJwtSecret(c.env), 24); // 24 hours

    // Store session in KV
    await c.env.KV.put(`admin-session:${admin.id}`, token, {
        expirationTtl: 24 * 60 * 60
    });

    return c.json({
        success: true,
        token,
        admin: {
            id: admin.id,
            username: admin.username,
            name: admin.name,
            role: admin.role,
            ref_code: admin.ref_code ?? null
        }
    });
});

// Logout
auth.post('/logout', authMiddleware, async (c) => {
    const payload = c.get('jwtPayload');

    // Remove session from KV
    if (payload.type === 'admin') {
        await c.env.KV.delete(`admin-session:${payload.userId}`);
    } else {
        await c.env.KV.delete(`session:${payload.userId}`);
    }

    return c.json({ success: true });
});

// Change Password (Admin)
auth.post('/admin/change-password', authMiddleware, async (c) => {
    const payload = c.get('jwtPayload');

    if (payload.type !== 'admin') {
        return c.json({ error: 'Unauthorized' }, 403);
    }

    const { old_password, new_password } = await c.req.json();

    if (!old_password || !new_password) {
        return c.json({ error: 'Old and new password required' }, 400);
    }

    // Get admin
    const admin = await c.env.DB.prepare(
        'SELECT * FROM admin_accounts WHERE id = ?'
    ).bind(payload.userId).first();

    if (!admin) {
        return c.json({ error: 'Admin account not found' }, 404);
    }

    // Verify old password
    const valid = await verifyPassword(old_password, admin.password_hash as string);
    if (!valid) {
        return c.json({ error: 'Password lama salah' }, 400);
    }

    // Hash new password
    const newHash = await hashPassword(new_password);

    // Update password
    await c.env.DB.prepare(
        'UPDATE admin_accounts SET password_hash = ? WHERE id = ?'
    ).bind(newHash, payload.userId).run();

    return c.json({ success: true, message: 'Password berhasil diubah' });
});

// Get current user info
auth.get('/me', authMiddleware, async (c) => {
    const payload = c.get('jwtPayload');

    if (payload.type === 'admin') {
        const admin = await c.env.DB.prepare(
            `SELECT id, username, name, role, ref_code,
                    COALESCE(NULLIF(TRIM(display_name), ''), name) AS display_name
             FROM admin_accounts WHERE id = ?`
        ).bind(payload.userId).first();
        return c.json({ type: 'admin', ...admin });
    } else {
        const user = await c.env.DB.prepare(
            'SELECT id, email, name, phone, role FROM users WHERE id = ?'
        ).bind(payload.userId).first();
        return c.json({ type: 'user', ...user });
    }
});

/**
 * PUT /api/auth/profile
 * Simpan profil akun tim (admin & CS): nama yang tampil dan nomor telepon.
 *
 * `name` (label internal) TIDAK bisa diubah di sini — hanya admin yang boleh,
 * lewat Akun Tim, karena username/label dipakai untuk mengenali akun. Yang
 * bebas diubah setiap akun adalah `display_name`, dan itulah yang tampil di
 * dashboard, laporan, dan tanda tangan pesan WhatsApp.
 */
auth.put('/profile', authMiddleware, async (c) => {
    const payload = c.get('jwtPayload');
    if (payload.type !== 'admin') {
        return c.json({ error: 'Forbidden', message: 'Hanya akun dashboard yang punya profil di sini' }, 403);
    }

    const body = await c.req.json() as any;
    const current = await c.env.DB.prepare(
        'SELECT id, name, display_name, phone FROM admin_accounts WHERE id = ?'
    ).bind(payload.userId).first<{ id: string; name: string; display_name: string; phone: string | null }>();
    if (!current) return c.json({ error: 'Akun tidak ditemukan' }, 404);

    const displayName = body.display_name !== undefined
        ? String(body.display_name).trim().slice(0, 80)
        : (current.display_name || '');
    const phone = body.phone !== undefined
        ? String(body.phone).trim().slice(0, 30)
        : (current.phone || '');

    await c.env.DB.prepare(
        'UPDATE admin_accounts SET display_name = ?, phone = ? WHERE id = ?'
    ).bind(displayName, phone, payload.userId).run();

    const updated = await c.env.DB.prepare(
        `SELECT id, username, name, phone, role, ref_code,
                COALESCE(NULLIF(TRIM(display_name), ''), name) AS display_name
         FROM admin_accounts WHERE id = ?`
    ).bind(payload.userId).first();

    return c.json({
        success: true,
        account: updated,
        message: 'Profil berhasil disimpan',
    });
});

export default auth;
