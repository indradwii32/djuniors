// ============================================
// Djuniors - Notifications Routes
// ============================================

import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { adminAuthMiddleware } from '../middleware/auth';
import { sendWAFonnte, sendBulkWAFonnte, FonnteTemplates, checkFonnteStatus, getFonnteToken } from '../utils/fonnte';

const notifications = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Helper to format amount as Indonesian Rupiah formatted string
 */
function formatAmount(val: any): string {
    if (val === undefined || val === null || val === '') return '';
    if (typeof val === 'number') return val.toLocaleString('id-ID');
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (/^\d+$/.test(trimmed)) {
            const n = parseInt(trimmed, 10);
            if (!isNaN(n)) return n.toLocaleString('id-ID');
        }
        return trimmed;
    }
    return String(val);
}

/**
 * Helper to format children array/JSON into a comma-separated names string
 */
function formatChildren(raw: any): string {
    if (!raw) return '';
    let items: any[] = [];
    if (Array.isArray(raw)) {
        items = raw;
    } else if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                items = parsed;
            } else if (typeof parsed === 'object' && parsed !== null) {
                items = [parsed];
            } else {
                return raw.trim();
            }
        } catch {
            return raw.trim();
        }
    } else if (typeof raw === 'object' && raw !== null) {
        items = [raw];
    } else {
        return String(raw);
    }

    const names = items.map((item: any) => {
        if (typeof item === 'object' && item !== null) {
            return item.name || item.nama || item.student_name || item.fullName || item.full_name || '';
        }
        return String(item).trim();
    }).filter(Boolean);

    return names.join(', ');
}

/**
 * Helper to format payment method to human-readable Indonesian string
 */
function formatPaymentMethod(method: any): string {
    if (!method) return '';
    const m = String(method).toLowerCase().trim();
    if (m === 'bank_transfer' || m === 'transfer' || m === 'transfer_bank' || m === 'bank') {
        return 'Transfer Bank';
    }
    if (m === 'ewallet' || m === 'e-wallet') {
        return 'E-Wallet';
    }
    if (m === 'qris') {
        return 'QRIS';
    }
    return String(method);
}

/**
 * Helper to format payment status
 */
function formatPaymentStatus(status: any): string {
    if (!status) return '';
    const s = String(status).toLowerCase().trim();
    if (s === 'unpaid') return 'Belum Lunas';
    if (s === 'paid') return 'Lunas';
    if (s === 'rejected') return 'Ditolak';
    if (s === 'pending') return 'Menunggu Pembayaran';
    return String(status);
}

/**
 * Helper to format registration status
 */
function formatRegistrationStatus(status: any): string {
    if (!status) return '';
    const s = String(status).toLowerCase().trim();
    if (s === 'pending') return 'Menunggu Konfirmasi';
    if (s === 'confirmed') return 'Terkonfirmasi';
    if (s === 'rejected') return 'Ditolak';
    return String(status);
}

/**
 * Helper to format date into "d MMMM yyyy" Indonesian format
 */
function formatDateId(rawDate: any): string {
    if (!rawDate) return '';
    try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return String(rawDate);
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];
        const day = d.getDate();
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return `${day} ${month} ${year}`;
    } catch {
        return String(rawDate);
    }
}

/**
 * Helper to replace placeholders {placeholder} with actual values
 */
export function formatWATemplate(
    templateContent: string,
    data: Record<string, any> = {},
    opts?: { baseUrl?: string }
): string {
    if (!templateContent) return '';

    // Registration number / Order ID
    const regNumber = String(
        data.nomor_pendaftaran ??
        data.registration_number ??
        data.registrationNumber ??
        data.regNumber ??
        data.kode_pesanan ??
        data.orderId ??
        data.order_id ??
        ''
    );

    // Parent name
    const parentName = String(
        data.nama_orang_tua ??
        data.parent_name ??
        data.parentName ??
        data.nama_wali ??
        data.wali ??
        ''
    );

    const rawName = String(data.name ?? data.nama ?? '');
    const displayName = rawName || parentName;
    const displayParentName = parentName || rawName;

    // Children
    const formattedChildren = formatChildren(
        data.children ??
        data.nama_anak ??
        data.anak ??
        data.child_names ??
        data.childNames ??
        data.anak_anak
    );

    // Schedule
    const scheduleSlot = String(
        data.jadwal ??
        data.schedule_slot ??
        data.schedule ??
        data.scheduleSlot ??
        ''
    );

    // Class
    const className = String(
        data.kelas ??
        data.nama_kelas ??
        data.className ??
        data.class_name ??
        data.class_id ??
        data.classId ??
        ''
    );

    // City
    const city = String(
        data.kota ??
        data.parent_city ??
        data.parentCity ??
        data.city ??
        ''
    );

    // Amounts
    const rawNominal = data.nominal ?? data.amount ?? data.tagihan_akhir ?? data.final_amount ?? data.finalAmount;
    const formattedNominal = formatAmount(rawNominal);

    const rawTotal = data.total_biaya ?? data.total_amount ?? data.totalAmount ?? data.total;
    const formattedTotal = formatAmount(rawTotal !== undefined ? rawTotal : rawNominal);

    const rawDiscount = data.diskon_nominal ?? data.discount_amount ?? data.discountAmount;
    const formattedDiscountAmount = formatAmount(rawDiscount);

    const rawFinal = data.tagihan_akhir ?? data.final_amount ?? data.finalAmount ?? data.nominal ?? data.amount;
    const formattedFinalAmount = formatAmount(rawFinal !== undefined ? rawFinal : rawTotal);

    // Promo & Discount string
    const promoCode = String(data.kode_promo ?? data.promo_code ?? data.promoCode ?? '');
    const discountStr = String(
        data.diskon ??
        data.discount ??
        (rawDiscount !== undefined && rawDiscount !== '' ? `Rp ${formattedDiscountAmount}` : '')
    );

    // Payment method & Bank
    const formattedPaymentMethod = formatPaymentMethod(
        data.metode_pembayaran ?? data.payment_method ?? data.paymentMethod ?? data.metode
    );

    const bankName = String(
        data.nama_bank ??
        data.bank ??
        data.bank_name ??
        data.bankName ??
        ''
    );

    const accountNumber = String(
        data.nomor_rekening ??
        data.rekening ??
        data.account ??
        data.account_number ??
        data.accountNumber ??
        ''
    );

    const accountOwner = String(
        data.nama_pemilik_rekening ??
        data.account_name ??
        data.accountName ??
        data.atas_nama ??
        data.pemilik_rekening ??
        ''
    );

    // Payment / Verification link
    let paymentLink = String(
        data.link_pembayaran ??
        data.payment_url ??
        data.link_verifikasi ??
        data.paymentUrl ??
        ''
    );
    if (!paymentLink && regNumber) {
        const base = (opts?.baseUrl || data.baseUrl || '').replace(/\/+$/, '');
        paymentLink = base
            ? `${base}/lacak.html?number=${encodeURIComponent(regNumber)}`
            : `/lacak.html?number=${encodeURIComponent(regNumber)}`;
    }

    // Date
    const formattedDate = formatDateId(
        data.tanggal_pendaftaran ??
        data.created_at ??
        data.createdAt ??
        data.tanggal
    );

    // Statuses
    const formattedPaymentStatus = formatPaymentStatus(
        data.status_pembayaran ??
        data.payment_status ??
        data.paymentStatus
    );

    const formattedRegStatus = formatRegistrationStatus(
        data.status_pendaftaran ??
        data.status
    );

    const timeStr = String(data.waktu ?? data.time ?? '');

    const replacements: Record<string, string> = {
        // Name & Parent
        nama: displayName,
        name: displayName,
        nama_orang_tua: displayParentName,
        parent_name: displayParentName,
        parentName: displayParentName,
        nama_wali: displayParentName,
        wali: displayParentName,

        // Children
        nama_anak: formattedChildren,
        anak: formattedChildren,
        child_names: formattedChildren,
        childNames: formattedChildren,
        anak_anak: formattedChildren,
        children: formattedChildren,

        // Registration number / Order ID
        nomor_pendaftaran: regNumber,
        registration_number: regNumber,
        registrationNumber: regNumber,
        regNumber: regNumber,
        kode_pesanan: regNumber,
        orderId: regNumber,
        order_id: regNumber,

        // Class
        kelas: className,
        nama_kelas: className,
        className: className,
        class_name: className,

        // Schedule
        jadwal: scheduleSlot,
        schedule: scheduleSlot,
        schedule_slot: scheduleSlot,
        scheduleSlot: scheduleSlot,

        // City
        kota: city,
        city: city,
        parent_city: city,
        parentCity: city,

        // Amounts
        nominal: formattedNominal,
        amount: formattedNominal,
        total_biaya: formattedTotal,
        total_amount: formattedTotal,
        totalAmount: formattedTotal,
        diskon_nominal: formattedDiscountAmount,
        discount_amount: formattedDiscountAmount,
        discountAmount: formattedDiscountAmount,
        tagihan_akhir: formattedFinalAmount,
        final_amount: formattedFinalAmount,
        finalAmount: formattedFinalAmount,

        // Promo
        kode_promo: promoCode,
        promoCode: promoCode,
        promo_code: promoCode,
        diskon: discountStr,
        discount: discountStr,

        // Payment Method
        metode_pembayaran: formattedPaymentMethod,
        payment_method: formattedPaymentMethod,
        paymentMethod: formattedPaymentMethod,
        metode: formattedPaymentMethod,

        // Links
        link_pembayaran: paymentLink,
        link_verifikasi: paymentLink,
        payment_url: paymentLink,
        paymentUrl: paymentLink,

        // Date
        tanggal_pendaftaran: formattedDate,
        tanggal: formattedDate,
        created_at: formattedDate,
        createdAt: formattedDate,

        // Status
        status_pembayaran: formattedPaymentStatus,
        payment_status: formattedPaymentStatus,
        paymentStatus: formattedPaymentStatus,
        status_pendaftaran: formattedRegStatus,
        status: formattedRegStatus,

        // Bank details
        nama_bank: bankName,
        bank: bankName,
        bank_name: bankName,
        bankName: bankName,
        nomor_rekening: accountNumber,
        rekening: accountNumber,
        account: accountNumber,
        account_number: accountNumber,
        accountNumber: accountNumber,
        nama_pemilik_rekening: accountOwner,
        account_name: accountOwner,
        accountName: accountOwner,
        atas_nama: accountOwner,
        pemilik_rekening: accountOwner,

        // Time
        waktu: timeStr,
        time: timeStr,
    };

    // Generic replacements for other keys in data
    for (const [k, v] of Object.entries(data)) {
        if (!(k in replacements) && v !== undefined && v !== null) {
            replacements[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
    }

    return templateContent.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
        return replacements[key] !== undefined ? replacements[key] : match;
    });
}

// Get all notifications logs (admin)
notifications.get('/', adminAuthMiddleware, async (c) => {
    const result = await c.env.DB.prepare(
        'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 100'
    ).all();
    return c.json(result.results);
});

// Get all WA templates (admin)
notifications.get('/templates', adminAuthMiddleware, async (c) => {
    const result = await c.env.DB.prepare(
        'SELECT id, name, content, version, updated_at FROM wa_templates ORDER BY id ASC'
    ).all();
    return c.json(result.results || []);
});

// Get single WA template by id (admin)
notifications.get('/templates/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const template = await c.env.DB.prepare(
        'SELECT id, name, content, version, updated_at FROM wa_templates WHERE id = ?'
    ).bind(id).first();

    if (!template) {
        return c.json({ error: 'Template not found' }, 404);
    }
    return c.json(template);
});

// Update WA template content (admin)
notifications.put('/templates/:id', adminAuthMiddleware, async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json() as any;
    const { name, content } = body;

    if (!content || typeof content !== 'string') {
        return c.json({ error: 'Content is required' }, 400);
    }

    if (content.length > 2000) {
        return c.json({ error: 'Content exceeds maximum limit of 2000 characters' }, 400);
    }

    const existing = await c.env.DB.prepare(
        'SELECT id FROM wa_templates WHERE id = ?'
    ).bind(id).first();

    if (!existing) {
        return c.json({ error: 'Template not found' }, 404);
    }

    if (name && typeof name === 'string' && name.trim()) {
        await c.env.DB.prepare(
            'UPDATE wa_templates SET name = ?, content = ?, version = 2, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(name.trim(), content, id).run();
    } else {
        await c.env.DB.prepare(
            'UPDATE wa_templates SET content = ?, version = 2, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
        ).bind(content, id).run();
    }

    const updated = await c.env.DB.prepare(
        'SELECT id, name, content, version, updated_at FROM wa_templates WHERE id = ?'
    ).bind(id).first();

    return c.json({ success: true, template: updated });
});

// Send WA notification (public form submission path / manual)
notifications.post('/wa', async (c) => {
    const { phone, template, data } = await c.req.json();

    if (!phone || !template) {
        return c.json({ error: 'Phone and template required' }, 400);
    }

    const payloadData = data || {};
    let message = '';

    const origin = new URL(c.req.url).origin;
    const baseUrl = (c.env as any).BASE_URL || origin;

    // 1. Try to fetch template from DB if template is not 'custom'
    if (template !== 'custom') {
        try {
            const dbTemplate = await c.env.DB.prepare(
                'SELECT content FROM wa_templates WHERE id = ?'
            ).bind(template).first<{ content: string }>();

            if (dbTemplate && dbTemplate.content) {
                message = formatWATemplate(dbTemplate.content, payloadData, { baseUrl });
            }
        } catch (dbErr) {
            console.error('Error fetching template from DB:', dbErr);
        }
    }

    // 2. Fallback to hardcoded FonnteTemplates if DB template is missing or empty
    if (!message) {
        switch (template) {
            case 'welcome':
                message = FonnteTemplates.welcome(payloadData.name || payloadData.nama || '');
                break;
            case 'enrollment_confirmed':
                message = FonnteTemplates.enrollmentConfirmed(
                    payloadData.name || payloadData.nama || '',
                    payloadData.className || payloadData.nama_kelas || payloadData.class_name || ''
                );
                break;
            case 'payment_instructions':
                message = FonnteTemplates.paymentInstructions(
                    payloadData.name || payloadData.nama || '',
                    payloadData.bank || '',
                    payloadData.account || payloadData.rekening || '',
                    Number(payloadData.amount || payloadData.nominal || 0),
                    payloadData.orderId || payloadData.kode_pesanan || payloadData.registration_number || ''
                );
                break;
            case 'payment_success':
                message = FonnteTemplates.paymentSuccess(
                    payloadData.name || payloadData.nama || '',
                    payloadData.className || payloadData.nama_kelas || payloadData.class_name || ''
                );
                break;
            case 'class_reminder':
                message = FonnteTemplates.classReminder(
                    payloadData.name || payloadData.nama || '',
                    payloadData.className || payloadData.nama_kelas || payloadData.class_name || '',
                    payloadData.time || payloadData.waktu || ''
                );
                break;
            case 'promo':
            case 'promo_announcement':
            case 'promo_special':
                message = FonnteTemplates.promoAnnouncement(
                    payloadData.name || payloadData.nama || '',
                    payloadData.promoCode || payloadData.kode_promo || '',
                    payloadData.discount || payloadData.diskon || ''
                );
                break;
            default:
                message = payloadData.message || '';
        }
    }

    if (!message) {
        return c.json({ error: 'Invalid template or empty message' }, 400);
    }

    // Send via Fonnte
    const result = await sendWAFonnte(
        { token: await getFonnteToken(c.env) },
        phone,
        message,
        { typing: true, delay: 1000 }
    );

    // Log notification
    await c.env.DB.prepare(`
        INSERT INTO notifications (id, user_id, type, channel, title, message, status)
        VALUES (?, ?, ?, 'wa', ?, ?, ?)
    `).bind(
        crypto.randomUUID(),
        payloadData.userId || null,
        template,
        template,
        message,
        result.status ? 'sent' : 'failed'
    ).run();

    return c.json({
        success: result.status,
        message: result.message
    });
});

// Bulk send promo WA (admin)
notifications.post('/wa/bulk-promo', adminAuthMiddleware, async (c) => {
    const { promoId, message } = await c.req.json();

    // Get promo details
    const promo = await c.env.DB.prepare('SELECT * FROM promos WHERE id = ?').bind(promoId).first();
    if (!promo) {
        return c.json({ error: 'Promo not found' }, 404);
    }

    // Get all active users with phone numbers
    const users = await c.env.DB.prepare(`
        SELECT DISTINCT u.* FROM users u
        JOIN students s ON s.user_id = u.id
        JOIN enrollments e ON e.student_id = s.id
        WHERE u.phone IS NOT NULL AND e.status = 'active'
    `).all();

    // Get promo template from DB if available
    const dbPromoTmpl = await c.env.DB.prepare('SELECT content FROM wa_templates WHERE id = ?').bind('promo').first<{ content: string }>();

    let sent = 0;
    let failed = 0;

    for (const user of users.results) {
        const discountStr = promo.discount_type === 'percentage'
            ? `${promo.discount_value}%`
            : `Rp ${(promo.discount_value as number).toLocaleString('id-ID')}`;

        const origin = new URL(c.req.url).origin;
        const baseUrl = (c.env as any).BASE_URL || origin;

        const waMessage = message || (dbPromoTmpl?.content
            ? formatWATemplate(dbPromoTmpl.content, {
                nama: user.name as string,
                kode_promo: promo.code as string,
                diskon: discountStr
            }, { baseUrl })
            : FonnteTemplates.promoAnnouncement(user.name as string, promo.code as string, discountStr)
        );

        const result = await sendWAFonnte(
            { token: await getFonnteToken(c.env) },
            user.phone as string,
            waMessage,
            { typing: true, delay: 1000 }
        );

        if (result.status) sent++;
        else failed++;

        // Log
        await c.env.DB.prepare(`
            INSERT INTO notifications (id, user_id, type, channel, title, message, status)
            VALUES (?, ?, 'promo', 'wa', ?, ?, ?)
        `).bind(
            crypto.randomUUID(),
            user.id,
            `Promo: ${promo.code}`,
            waMessage,
            result.status ? 'sent' : 'failed'
        ).run();
    }

    return c.json({ sent, failed, total: users.results.length });
});

// Check Fonnte status
notifications.get('/wa/status', async (c) => {
    const token = await getFonnteToken(c.env);
    const isConnected = await checkFonnteStatus({
        token
    });

    return c.json({
        connected: isConnected,
        provider: 'Fonnte'
    });
});

// Get current Fonnte token (masked) — admin only
notifications.get('/fonnte/token', adminAuthMiddleware, async (c) => {
    const token = await getFonnteToken(c.env);
    // Mask: show first 4 + last 4 chars
    const masked = token.length > 8
        ? token.slice(0, 4) + '•'.repeat(token.length - 8) + token.slice(-4)
        : token ? '••••••••' : '';
    return c.json({ token: masked, isSet: token.length > 0 });
});

// Save Fonnte token — admin only
notifications.put('/fonnte/token', adminAuthMiddleware, async (c) => {
    const { token } = await c.req.json<{ token: string }>();
    if (!token || token.trim() === '') {
        return c.json({ error: 'Token is required' }, 400);
    }

    await c.env.DB.prepare(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind('fonnte_token', token.trim()).run();

    return c.json({ success: true, message: 'Fonnte token saved' });
});

export default notifications;
