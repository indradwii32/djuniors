// ============================================
// Djuniors - Registrations Routes
// ============================================

import { Hono } from 'hono';
import { Bindings, Variables, Registration, RegistrationChild } from '../types';
import { adminAuthMiddleware, getStaffRefCode, isCSRole } from '../middleware/auth';
import { cacheMiddleware, bumpCacheVersion } from '../middleware/cache';
import { saveProofToR2, getDefaultPaymentAccount, buildPaymentInfo, normalizePaymentMethod, maskPhone, resolvePaymentMethod, PaymentMethod } from '../utils/payment';
import { pickUniqueCode, getPayableAmount } from '../utils/payment-code';
import { sendCsWaAuto } from '../utils/cs-wa';
import { nextRotatorRef } from '../utils/cs-rotator';
import { rateLimit } from '../utils/rate-limit';

const registrations = new Hono<{ Bindings: Bindings; Variables: Variables }>();
// Public tracking reads are cached for 60s — long enough to absorb repeated
// polling of the same registration number, short enough that a payment-status
// change shows up quickly. All write paths below bump the version stamp so
// confirmation flows invalidate immediately.
const trackCache = cacheMiddleware('registrations', 60);

// Rate limiter: mencegah enumerasi nomor registrasi / nomor WA di halaman lacak
// dan spam pendaftaran dari satu IP.
const trackLimiter = rateLimit({
    name: 'track',
    limit: 30,
    windowSeconds: 600,
    message: 'Terlalu banyak percobaan pelacakan. Tunggu beberapa menit lalu coba lagi.',
});
const registerLimiter = rateLimit({
    name: 'register',
    limit: 30,
    windowSeconds: 3600,
    message: 'Terlalu banyak pendaftaran dari jaringan ini. Silakan hubungi admin D’Juniors.',
});

/** Batas jumlah anak per pendaftaran (validasi anti-abuse). */
const MAX_CHILDREN = 10;

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
registrations.post('/', registerLimiter, async (c) => {
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
        notes,
        ref_code,
        bank_account_id
    } = body;

    // Validate required fields
    if (!parent_name || !parent_phone || !class_id || !schedule_slot || !children) {
        return c.json({
            error: 'Missing required fields',
            message: 'parent_name, parent_phone, class_id, schedule_slot, and children are required'
        }, 400);
    }

    // Validasi bentuk data (anti-abuse: input panjang/aneh ditolak lebih awal).
    const parentNameStr = String(parent_name).trim();
    const parentPhoneStr = String(parent_phone).trim();
    if (parentNameStr.length < 2 || parentNameStr.length > 120) {
        return c.json({ error: 'Invalid name', message: 'Nama orang tua tidak valid' }, 400);
    }
    const phoneDigits = parentPhoneStr.replace(/\D/g, '');
    if (phoneDigits.length < 8 || phoneDigits.length > 15) {
        return c.json({ error: 'Invalid phone', message: 'Nomor WhatsApp tidak valid' }, 400);
    }
    if (notes && String(notes).length > 1000) {
        return c.json({ error: 'Notes too long', message: 'Catatan maksimal 1000 karakter' }, 400);
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

    // Validasi isi daftar anak: minimal 1, maksimum MAX_CHILDREN, tiap anak
    // wajib punya nama (mencegah baris kosong/spam).
    if (parsedChildren.length > MAX_CHILDREN) {
        return c.json({
            error: 'Too many children',
            message: `Maksimal ${MAX_CHILDREN} anak dalam satu pendaftaran`
        }, 400);
    }
    const cleanedChildren = parsedChildren
        .map((child) => ({
            name: String((child as any)?.name || '').trim().slice(0, 120),
            age_or_class: String((child as any)?.age_or_class || (child as any)?.grade || '').trim().slice(0, 60),
        }))
        .filter((child) => child.name.length > 0);

    if (cleanedChildren.length === 0) {
        return c.json({ error: 'Invalid children', message: 'Nama anak wajib diisi' }, 400);
    }
    parsedChildren = cleanedChildren;
    childrenJsonStr = JSON.stringify(cleanedChildren);

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
    // Metode pembayaran: pakai pilihan pendaftar bila metodenya memang diatur
    // admin (punya akun aktif); kalau tidak, jatuh ke metode tersedia pertama
    // agar pendaftaran tidak pernah gagal karena perubahan setelan.
    const resolved = await resolvePaymentMethod(c.env.DB, payment_method);
    const method: PaymentMethod = resolved.method;

    // Sumber link CS (?ref=) — simpan hanya bila kode terdaftar & aktif.
    let storedRefCode: string | null = null;
    if (ref_code && typeof ref_code === 'string') {
        const refRow = await c.env.DB.prepare(
            'SELECT ref_code FROM admin_accounts WHERE UPPER(ref_code) = UPPER(?) AND is_active = 1'
        ).bind(ref_code.trim()).first();
        if (refRow?.ref_code) storedRefCode = refRow.ref_code as string;
    }

    // Auto-delegasi: pendaftaran tanpa ref CS valid (langsung/tanpa link)
    // dirotasi ke CS berikutnya bila admin mengaktifkan rotator
    // (Pengaturan → Akun Tim → Rotator Pendaftaran). Null-safe: rotator
    // mati/tanpa anggota → tetap null.
    if (!storedRefCode) {
        storedRefCode = await nextRotatorRef(c.env.DB);
    }

    // Detail pembayaran: rekening default per metode ditentukan SERVER-SIDE
    // (client tidak mengirim pilihan rekening lagi), lalu di-snapshot ke baris
    // pendaftaran supaya info pembayaran tetap utuh walau admin mengubah daftar
    // rekening di kemudian hari.
    const defaultAccount = await getDefaultPaymentAccount(c.env.DB, method);
    const bankAccountId: string | null = defaultAccount?.id ? String(defaultAccount.id) : null;
    const bankName: string | null = defaultAccount?.bank_name ? String(defaultAccount.bank_name) : null;
    const bankNumber: string | null = defaultAccount?.account_number ? String(defaultAccount.account_number) : null;
    const bankHolder: string | null = defaultAccount?.account_name ? String(defaultAccount.account_name) : null;

    // Kode unik pembayaran (opsional, diatur admin): ditambahkan ke nominal
    // tagihan agar transfer mudah dicocokkan. Disimpan terpisah dari
    // final_amount supaya laporan pendapatan tetap bersih.
    const uniqueCode = await pickUniqueCode(c.env.DB, finalAmount);
    const payableAmount = finalAmount + uniqueCode;

    // Insert registration
    await c.env.DB.prepare(`
        INSERT INTO registrations (
            id, registration_number, parent_name, parent_phone, parent_email, parent_city,
            class_id, schedule_slot, children, total_amount, discount_amount, final_amount,
            promo_code, payment_method, status, payment_status, notes,
            ref_code, bank_account_id, bank_name, bank_account_number, bank_account_name,
            unique_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?, ?, ?, ?, ?, ?, ?)
    `).bind(
        id,
        registrationNumber,
        parentNameStr,
        parentPhoneStr,
        parent_email ? String(parent_email).trim().slice(0, 160) : null,
        parent_city ? String(parent_city).trim().slice(0, 120) : null,
        class_id,
        scheduleSlotStr,
        childrenJsonStr,
        totalAmount,
        discountAmount,
        finalAmount,
        appliedPromoCode,
        method,
        notes ? String(notes).trim() : null,
        storedRefCode,
        bankAccountId,
        bankName,
        bankNumber,
        bankHolder,
        uniqueCode
    ).run();

    // Create initial payment tracking record (nominal = yang harus ditransfer).
    const trackingId = crypto.randomUUID();
    await c.env.DB.prepare(`
        INSERT INTO payment_tracking (
            id, registration_id, registration_number, parent_phone, amount, payment_method, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
        trackingId,
        id,
        registrationNumber,
        parentPhoneStr,
        payableAmount,
        method,
        'Registrasi baru dibuat'
    ).run();

    // New registration → invalidate cached tracking reads + admin stats.
    await bumpCacheVersion(c.env, 'registrations');

    // Notifikasi WhatsApp otomatis ke pendaftar (setelan milik CS pemilik
    // link). Selalu aman: gagal kirim tidak memblokir pendaftaran.
    const waNotification = await sendCsWaAuto(
        c.env,
        {
            registration_number: registrationNumber,
            parent_name: parentNameStr,
            parent_phone: parentPhoneStr,
            parent_city: parent_city ? String(parent_city).trim() : null,
            class_id,
            class_name: classInfo.name,
            schedule_slot: scheduleSlotStr,
            children: parsedChildren,
            total_amount: totalAmount,
            discount_amount: discountAmount,
            final_amount: finalAmount,
            unique_code: uniqueCode,
            payable_amount: payableAmount,
            payment_method: method,
            bank_name: bankName,
            bank_account_number: bankNumber,
            bank_account_name: bankHolder,
            payment_status: 'unpaid',
            ref_code: storedRefCode,
            created_at: new Date().toISOString(),
        },
        'registration',
        { baseUrl: (c.env as any).BASE_URL || new URL(c.req.url).origin }
    );

    // Info pembayaran lengkap untuk popup sukses & halaman lacak: hanya berisi
    // detail metode yang dipilih pendaftar (bukan semua metode).
    const payment = buildPaymentInfo({
        method,
        amount: payableAmount,
        account: { bank_name: bankName, account_number: bankNumber, account_name: bankHolder },
        registrationNumber,
        uniqueCode,
    });

    return c.json({
        success: true,
        id,
        registration_number: registrationNumber,
        tracking_id: trackingId,
        wa_notification: waNotification,
        payment,
        // true bila metode pilihan pendaftar tidak tersedia lalu diganti server
        payment_method_adjusted: resolved.adjusted,
        registration: {
            id,
            registration_number: registrationNumber,
            parent_name: parentNameStr,
            parent_phone: parentPhoneStr,
            parent_email: parent_email ? String(parent_email).trim() : null,
            parent_city: parent_city ? String(parent_city).trim() : null,
            class_id,
            class_name: classInfo.name,
            schedule_slot: scheduleSlotStr,
            children: parsedChildren,
            total_amount: totalAmount,
            discount_amount: discountAmount,
            final_amount: finalAmount,
            unique_code: uniqueCode,
            payable_amount: payableAmount,
            promo_code: appliedPromoCode,
            payment_method: method,
            status: 'pending',
            payment_status: 'unpaid',
            notes: notes ? String(notes).trim() : null,
            ref_code: storedRefCode,
            bank_name: bankName,
            bank_account_number: bankNumber,
            bank_account_name: bankHolder
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
        r.payment_proof_url,
        r.status,
        r.payment_status,
        r.notes,
        r.ref_code,
        r.bank_name,
        r.bank_account_number,
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
    // Scope role CS: hanya pendaftaran yang datang dari link miliknya.
    if (isCSRole(c.get('jwtPayload'))) {
        const refCode = await getStaffRefCode(c);
        if (!refCode) {
            return c.json({
                data: [],
                pagination: { page: 1, limit, offset: 0, total: 0, total_pages: 1 },
            });
        }
        whereParts.push('r.ref_code = ?');
        whereParams.push(refCode);
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
 * 5. GET /api/registrations/track/:number
 * Lacak status pembayaran (public, by registration_number).
 *
 * KEAMANAN: data pendaftar tidak lagi terbuka hanya dengan nomor registrasi.
 * Pemanggil harus memverifikasi kepemilikan dengan 4 digit terakhir nomor
 * WhatsApp pendaftar (atau nomor WhatsApp lengkap) melalui `?verify=`/`?phone=`.
 * Tanpa verifikasi yang cocok, endpoint hanya membalas 401 tanpa data apa pun.
 */
registrations.get('/track/:number', trackLimiter, trackCache, async (c) => {
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

    // Verifikasi kepemilikan: 4 digit terakhir nomor WA atau nomor lengkap.
    const providedDigits = String(c.req.query('verify') || c.req.query('phone') || '').replace(/\D/g, '');
    const ownerDigits = String(registration.parent_phone || '').replace(/\D/g, '');
    const isVerified =
        providedDigits.length >= 4 &&
        ownerDigits.length >= 4 &&
        ownerDigits.endsWith(providedDigits.slice(-4)) &&
        (providedDigits.length === 4 || ownerDigits === providedDigits);

    if (!isVerified) {
        return c.json({
            error: 'Verification required',
            message: 'Masukkan 4 digit terakhir nomor WhatsApp yang dipakai saat mendaftar.',
            registration_number: registrationNumber,
            verified: false,
        }, 401);
    }

    const trackingList = await c.env.DB.prepare(`
        SELECT status, amount, payment_method, created_at, proof_url
        FROM payment_tracking
        WHERE registration_number = ?
        ORDER BY created_at DESC
        LIMIT 20
    `).bind(registrationNumber).all();

    // Info pembayaran hanya untuk metode yang dipilih saat pendaftaran.
    let account: { bank_name?: string | null; account_number?: string | null; account_name?: string | null } | null = {
        bank_name: registration.bank_name as string | null,
        account_number: registration.bank_account_number as string | null,
        account_name: registration.bank_account_name as string | null,
    };
    if (!account.account_number && !account.bank_name) {
        const fallback = await getDefaultPaymentAccount(c.env.DB, normalizePaymentMethod(registration.payment_method));
        account = fallback
            ? { bank_name: fallback.bank_name, account_number: fallback.account_number, account_name: fallback.account_name }
            : null;
    }

    const payment = buildPaymentInfo({
        method: registration.payment_method,
        amount: getPayableAmount(registration as any),
        account,
        registrationNumber,
        uniqueCode: Number(registration.unique_code) || 0,
    });

    const formatted = formatRegistration(registration);
    // Buang kolom internal sebelum dikirim ke halaman publik (email & catatan
    // admin tidak perlu). `id` tetap dikirim karena dipakai halaman lacak untuk
    // mengunggah bukti bayar — nilainya UUID acak yang hanya didapat setelah
    // verifikasi kepemilikan di atas.
    const { notes, parent_email, ...safe } = formatted as any;

    return c.json({
        success: true,
        verified: true,
        registration: {
            ...safe,
            parent_phone: maskPhone(registration.parent_phone),
            payment_method: payment.method,
        },
        payment,
        tracking: trackingList.results,
    });
});

/**
 * 6. GET /api/registrations/track/phone/:phone
 * Lacak by nomor WA (public) — HANYA mengembalikan ringkasan terbatas.
 *
 * KEAMANAN: pencarian memakai nomor WA lengkap (bukan potongan angka, yang
 * sebelumnya memungkinkan enumerasi), dan hasilnya tidak memuat data pribadi
 * (nama anak, kota, nomor telepon). Untuk membuka detail, pengguna harus
 * membuka nomor registrasi + verifikasi 4 digit terakhir nomor WA.
 */
registrations.get('/track/phone/:phone', trackLimiter, trackCache, async (c) => {
    const rawPhone = (c.req.param('phone') || '').trim();
    const cleanPhone = rawPhone.replace(/\D/g, '');

    if (cleanPhone.length < 8) {
        return c.json({
            error: 'Invalid phone',
            message: 'Masukkan nomor WhatsApp lengkap (minimal 8 digit).',
        }, 400);
    }

    let alternatePhone = cleanPhone;
    if (cleanPhone.startsWith('62')) {
        alternatePhone = '0' + cleanPhone.substring(2);
    } else if (cleanPhone.startsWith('0')) {
        alternatePhone = '62' + cleanPhone.substring(1);
    }

    const result = await c.env.DB.prepare(`
        SELECT r.registration_number, r.parent_name, r.status, r.payment_status,
               r.final_amount, r.created_at, r.children, c.name as class_name
        FROM registrations r
        LEFT JOIN classes c ON r.class_id = c.id
        WHERE r.parent_phone = ? OR r.parent_phone = ?
        ORDER BY r.created_at DESC
        LIMIT 20
    `).bind(cleanPhone, alternatePhone).all();

    const summarize = (row: any) => {
        let childCount = 1;
        try {
            const parsed = typeof row.children === 'string' ? JSON.parse(row.children) : row.children;
            if (Array.isArray(parsed) && parsed.length > 0) childCount = parsed.length;
        } catch { /* biarkan default */ }
        const name = String(row.parent_name || '').trim();
        return {
            registration_number: row.registration_number,
            // Nama disamarkan: cukup untuk mengenali milik sendiri.
            parent_name_masked: name
                ? `${name.split(' ')[0]} ${name.split(' ').slice(1).map((w: string) => `${w[0] || ''}.`).join(' ')}`.trim()
                : '-',
            class_name: row.class_name || 'Kelas Djuniors',
            status: row.status,
            payment_status: row.payment_status,
            final_amount: row.final_amount,
            children_count: childCount,
            created_at: row.created_at,
        };
    };

    return c.json({
        success: true,
        count: result.results.length,
        registrations: result.results.map(summarize),
    });
});

/**
 * 3. GET /api/registrations/:id
 * Detail by ID — butuh login dashboard (adminAuth). Data publik tetap
 * tersedia lewat /track/:number bagi yang tahu nomor registrasi.
 */
registrations.get('/:id', adminAuthMiddleware, async (c) => {
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

    // Scope role CS: hanya boleh melihat pendaftaran dari link miliknya.
    if (isCSRole(c.get('jwtPayload'))) {
        const refCode = await getStaffRefCode(c);
        if (!refCode || (result.ref_code as string | null) !== refCode) {
            return c.json({ error: 'Forbidden', message: 'Hanya bisa melihat pendaftaran dari link Anda' }, 403);
        }
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

    // Scope role CS: hanya boleh mengelola pendaftaran dari link miliknya.
    if (isCSRole(c.get('jwtPayload'))) {
        const refCode = await getStaffRefCode(c);
        if (!refCode || (existing.ref_code as string | null) !== refCode) {
            return c.json({ error: 'Forbidden', message: 'Hanya bisa mengelola pendaftaran dari link Anda' }, 403);
        }
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
registrations.post('/:id/payment', rateLimit({
    name: 'proof',
    limit: 20,
    windowSeconds: 3600,
    message: 'Terlalu banyak unggahan bukti dari jaringan ini. Coba lagi nanti.',
}), async (c) => {
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

    // Validasi bukti: harus gambar (data-URL / URL) dan tidak melebihi 5MB —
    // mencegah R2/D1 diisi berkas sampah atau lampiran tak relevan.
    const MAX_PROOF_BYTES = 5 * 1024 * 1024;
    if (proofUrl.startsWith('data:')) {
        const mimeMatch = proofUrl.match(/^data:([^;,]+)/);
        const mime = mimeMatch ? mimeMatch[1] : '';
        if (!mime.startsWith('image/')) {
            return c.json({ error: 'Invalid file type', message: 'Bukti pembayaran harus berupa gambar (JPG/PNG/WEBP)' }, 400);
        }
        // Panjang base64 ≈ 4/3 ukuran biner.
        if (proofUrl.length > MAX_PROOF_BYTES * 1.4) {
            return c.json({ error: 'File too large', message: 'Ukuran bukti pembayaran maksimal 5MB' }, 413);
        }
    }

    // Metode pembayaran dinormalisasi (hanya 3 metode resmi yang diterima).
    paymentMethod = normalizePaymentMethod(paymentMethod);

    // Bukti berupa data-URL base64 (dari halaman lacak) → simpan ke R2 agar
    // ringkas & bisa di-cache; selain itu diterima apa adanya.
    if (proofUrl.startsWith('data:')) {
        proofUrl = await saveProofToR2(c.env, `payment-proofs/${id}-${Date.now()}`, proofUrl);
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
