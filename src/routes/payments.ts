// ============================================
// Djuniors - Payments Routes
// ============================================

import { Hono } from 'hono';
import { Bindings } from '../types';
import { authMiddleware, adminAuthMiddleware } from '../middleware/auth';
import { getBankAccounts, generatePaymentInstruction, generateUniqueAmount, getAvailablePaymentMethods } from '../utils/payment';
import { PaymentAccountType } from '../types';

/** Validasi tipe akun pembayaran dari input admin. */
function normalizeAccountType(value: unknown): PaymentAccountType {
    const v = String(value || '').trim().toLowerCase();
    if (v === 'ewallet' || v === 'e-wallet') return 'ewallet';
    if (v === 'qris') return 'qris';
    return 'bank';
}

const payments = new Hono<{ Bindings: Bindings }>();

// Get all payments (admin)
payments.get('/', adminAuthMiddleware, async (c) => {
    const result = await c.env.DB.prepare(`
        SELECT p.*, e.student_id, s.full_name as student_name, c.name as class_name
        FROM payments p
        JOIN enrollments e ON p.enrollment_id = e.id
        JOIN students s ON e.student_id = s.id
        JOIN classes c ON e.class_id = c.id
        ORDER BY p.created_at DESC
    `).all();

    if (result.results && result.results.length > 0) {
        return c.json(result.results);
    }

    // Fallback/Unified: fetch from payment_tracking + registrations
    const trackingRes = await c.env.DB.prepare(`
        SELECT pt.id, pt.registration_id as enrollment_id, pt.registration_number,
               pt.amount, pt.payment_method as method,
               CASE WHEN pt.status = 'confirmed' THEN 'success' WHEN pt.status = 'rejected' THEN 'failed' ELSE 'pending' END as status,
               pt.proof_url, pt.notes, pt.created_at,
               r.parent_name, c.name as class_name, r.children
        FROM payment_tracking pt
        LEFT JOIN registrations r ON pt.registration_id = r.id OR pt.registration_number = r.registration_number
        LEFT JOIN classes c ON r.class_id = c.id
        ORDER BY pt.created_at DESC
    `).all();

    const formatted = (trackingRes.results || []).map((t: any) => {
        let studentName = t.parent_name;
        if (t.children) {
            try {
                const parsed = typeof t.children === 'string' ? JSON.parse(t.children) : t.children;
                if (Array.isArray(parsed) && parsed[0]?.name) {
                    studentName = parsed.map((ch: any) => ch.name).join(', ');
                }
            } catch {}
        }
        return {
            id: t.id,
            enrollment_id: t.enrollment_id,
            registration_number: t.registration_number,
            student_name: studentName,
            parent_name: t.parent_name,
            class_name: t.class_name,
            amount: t.amount,
            method: t.method || 'bank_transfer',
            status: t.status || 'pending',
            proof_url: t.proof_url,
            notes: t.notes,
            created_at: t.created_at
        };
    });

    return c.json(formatted);
});

// ============================================
// Metode pembayaran yang tersedia (public)
// ============================================
// Dipakai form pendaftaran agar kartu metode pembayaran hanya menampilkan
// metode yang benar-benar diatur admin. Sengaja TIDAK mengirim nomor rekening —
// detail pembayaran baru muncul setelah pendaftaran dikirim.
// Didaftarkan sebelum '/:id' supaya tidak tertangkap route tersebut.
payments.get('/methods', async (c) => {
    const methods = await getAvailablePaymentMethods(c.env.DB);
    return c.json({ success: true, methods });
});

// Get payment by ID
payments.get('/:id', authMiddleware, async (c) => {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();

    if (result) {
        return c.json(result);
    }

    // Check payment_tracking
    const track = await c.env.DB.prepare('SELECT * FROM payment_tracking WHERE id = ?').bind(id).first();
    if (track) {
        return c.json({
            ...track,
            method: track.payment_method,
            status: track.status === 'confirmed' ? 'success' : (track.status === 'rejected' ? 'failed' : 'pending')
        });
    }

    return c.json({ error: 'Payment not found' }, 404);
});

// Create payment (manual transfer)
payments.post('/create', async (c) => {
    const { enrollment_id, bank_id } = await c.req.json();

    if (!enrollment_id) {
        return c.json({ error: 'Enrollment ID required' }, 400);
    }

    // Get enrollment details
    const enrollment = await c.env.DB.prepare(`
        SELECT e.*, s.full_name as student_name, c.name as class_name, c.price,
               u.name as parent_name, u.phone, u.email
        FROM enrollments e
        JOIN students s ON e.student_id = s.id
        JOIN classes c ON e.class_id = c.id
        JOIN users u ON s.user_id = u.id
        WHERE e.id = ?
    `).bind(enrollment_id).first();

    if (!enrollment) {
        return c.json({ error: 'Enrollment not found' }, 404);
    }

    // Get bank account
    const banks = await getBankAccounts(c.env.DB);
    const bank = bank_id
        ? banks.find(b => b.id === bank_id)
        : banks[0];

    if (!bank) {
        return c.json({ error: 'No bank account available' }, 500);
    }

    // Generate unique amount
    const amount = generateUniqueAmount(enrollment.price as number);
    const orderId = `DJN-${Date.now()}`;

    // Create payment record
    const paymentId = crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO payments (id, enrollment_id, amount, method, status)
        VALUES (?, ?, ?, 'manual_transfer', 'pending')
    `).bind(paymentId, enrollment_id, amount).run();

    // Generate instructions
    const instructions = generatePaymentInstruction(bank, amount, orderId);

    return c.json({
        success: true,
        payment_id: paymentId,
        order_id: orderId,
        amount,
        bank: {
            name: bank.bank_name,
            account: bank.account_number,
            holder: bank.account_name
        },
        instructions
    });
});

// Verify payment (admin)
payments.post('/:id/verify', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const { status, notes } = await c.req.json();

    // 1. Update in payments table if exists
    const payment = await c.env.DB.prepare(
        'SELECT * FROM payments WHERE id = ?'
    ).bind(id).first();

    if (payment) {
        await c.env.DB.prepare(`
            UPDATE payments SET status = ?, notes = ? WHERE id = ?
        `).bind(status, notes || null, id).run();

        if (status === 'success') {
            await c.env.DB.prepare(`
                UPDATE enrollments SET payment_status = 'paid', status = 'active'
                WHERE id = ?
            `).bind(payment.enrollment_id).run();
        }
    }

    // 2. Update in payment_tracking table if exists
    const tracking = await c.env.DB.prepare(
        'SELECT * FROM payment_tracking WHERE id = ?'
    ).bind(id).first();

    if (tracking) {
        const trackStatus = status === 'success' ? 'confirmed' : (status === 'failed' ? 'rejected' : 'pending');
        const adminPayload = (c as any).get?.('jwtPayload');
        const confirmedBy = adminPayload?.username || adminPayload?.email || 'admin';

        await c.env.DB.prepare(`
            UPDATE payment_tracking SET
                status = ?,
                confirmed_by = ?,
                confirmed_at = CURRENT_TIMESTAMP,
                notes = COALESCE(?, notes)
            WHERE id = ?
        `).bind(trackStatus, confirmedBy, notes || null, id).run();

        if (tracking.registration_id) {
            const regPayStatus = status === 'success' ? 'paid' : (status === 'failed' ? 'rejected' : 'unpaid');
            const regStatus = status === 'success' ? 'confirmed' : 'pending';

            await c.env.DB.prepare(`
                UPDATE registrations SET
                    payment_status = ?,
                    status = CASE WHEN ? = 'success' THEN 'confirmed' ELSE status END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).bind(regPayStatus, status, tracking.registration_id).run();
        }
    }

    return c.json({ success: true });
});

// Get bank accounts (for payment form)
payments.get('/banks/list', async (c) => {
    const banks = await getBankAccounts(c.env.DB);
    return c.json(banks);
});

// ============================================
// Manajemen rekening bank (admin) — menu Pengaturan Sistem → Rekening
// Sebelumnya UI Settings hanya mengubah state lokal (tidak pernah tersimpan);
// endpoint ini membuat tambahan / edit / aktif-nonaktif benar-benar persist.
// ============================================

// Create bank account (admin)
payments.post('/banks', adminAuthMiddleware, async (c) => {
    const body = await c.req.json();
    const bankName = (body.bank_name || '').trim();
    const accountNumber = (body.account_number || '').trim();
    const accountName = (body.account_name || '').trim();
    const type = normalizeAccountType(body.type);

    if (!bankName || !accountNumber || !accountName) {
        return c.json({
            error: 'Missing fields',
            message: 'Nama bank, nomor rekening, dan nama pemilik wajib diisi'
        }, 400);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO bank_accounts (id, bank_name, account_number, account_name, type, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
    `).bind(id, bankName, accountNumber, accountName, type).run();

    const created = await c.env.DB.prepare('SELECT * FROM bank_accounts WHERE id = ?').bind(id).first();
    return c.json({ success: true, bank: created, message: 'Rekening berhasil ditambahkan' }, 201);
});

// Update bank account (admin) — edit field & toggle aktif
payments.put('/banks/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();

    const existing = await c.env.DB.prepare('SELECT * FROM bank_accounts WHERE id = ?').bind(id).first();
    if (!existing) {
        return c.json({ error: 'Not found', message: 'Rekening tidak ditemukan' }, 404);
    }

    const bankName = body.bank_name !== undefined ? String(body.bank_name).trim() : (existing.bank_name as string);
    const accountNumber = body.account_number !== undefined ? String(body.account_number).trim() : (existing.account_number as string);
    const accountName = body.account_name !== undefined ? String(body.account_name).trim() : (existing.account_name as string);
    const type = body.type !== undefined
        ? normalizeAccountType(body.type)
        : normalizeAccountType(existing.type);
    const isActive = body.is_active !== undefined ? (body.is_active ? 1 : 0) : (existing.is_active ? 1 : 0);

    if (!bankName || !accountNumber || !accountName) {
        return c.json({ error: 'Invalid', message: 'Nama bank, nomor rekening, dan nama pemilik tidak boleh kosong' }, 400);
    }

    await c.env.DB.prepare(`
        UPDATE bank_accounts SET bank_name = ?, account_number = ?, account_name = ?, type = ?, is_active = ?
        WHERE id = ?
    `).bind(bankName, accountNumber, accountName, type, isActive, id).run();

    const updated = await c.env.DB.prepare('SELECT * FROM bank_accounts WHERE id = ?').bind(id).first();
    return c.json({ success: true, bank: updated, message: 'Rekening berhasil diperbarui' });
});

export default payments;
