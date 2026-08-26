-- ============================================
-- Djuniors - Database Schema (Cloudflare D1)
-- ============================================
-- Run with: wrangler d1 execute djuniors-db --local --file=schema.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    role TEXT DEFAULT 'parent',
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    full_name TEXT NOT NULL,
    birth_date DATE,
    grade TEXT,
    school TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Classes table (recreated with new schema)
DROP TABLE IF EXISTS classes;
CREATE TABLE classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    level_id TEXT,
    price INTEGER DEFAULT 0,
    max_students INTEGER DEFAULT 8,
    schedule_slots TEXT DEFAULT '[]',
    icon TEXT DEFAULT '🧮',
    image_url TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Registrations table (gabungan enrollment + payment)
CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    registration_number TEXT UNIQUE NOT NULL,
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    parent_email TEXT,
    parent_city TEXT,
    class_id TEXT NOT NULL,
    schedule_slot TEXT NOT NULL,
    children TEXT NOT NULL, -- JSON array: [{name, age_or_class}]
    total_amount INTEGER DEFAULT 0,
    discount_amount INTEGER DEFAULT 0,
    final_amount INTEGER DEFAULT 0,
    promo_code TEXT,
    payment_method TEXT, -- 'bank_transfer', 'ewallet', 'qris'
    payment_proof_url TEXT,
    status TEXT DEFAULT 'pending', -- pending, confirmed, rejected
    payment_status TEXT DEFAULT 'unpaid', -- unpaid, paid, rejected
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payment tracking table
CREATE TABLE IF NOT EXISTS payment_tracking (
    id TEXT PRIMARY KEY,
    registration_id TEXT REFERENCES registrations(id),
    registration_number TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_method TEXT,
    proof_url TEXT,
    status TEXT DEFAULT 'pending', -- pending, confirmed, rejected
    confirmed_by TEXT,
    confirmed_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Promos table
CREATE TABLE IF NOT EXISTS promos (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL,
    discount_value INTEGER NOT NULL,
    min_purchase INTEGER DEFAULT 0,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    start_date DATETIME,
    end_date DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    type TEXT NOT NULL,
    channel TEXT NOT NULL,
    title TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending',
    sent_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin Accounts table
CREATE TABLE IF NOT EXISTS admin_accounts (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Bank Accounts table (for manual transfer)
CREATE TABLE IF NOT EXISTS bank_accounts (
    id TEXT PRIMARY KEY,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Levels table
CREATE TABLE IF NOT EXISTS levels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    min_age INTEGER,
    max_age INTEGER,
    grade_range TEXT,
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CMS Content table
CREATE TABLE IF NOT EXISTS cms_content (
    id TEXT PRIMARY KEY,
    section TEXT NOT NULL, -- 'header', 'footer', 'hero', 'features', 'classes', 'testimonials', 'cta', 'meta'
    key TEXT NOT NULL,
    value TEXT,
    type TEXT DEFAULT 'text', -- 'text', 'html', 'image', 'json', 'color'
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(section, key)
);

-- CMS Settings table
CREATE TABLE IF NOT EXISTS cms_settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    category TEXT DEFAULT 'general', -- 'general', 'style', 'seo', 'social'
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CMS Files table (Media: Logo, Favicon, Hero Image, Class Images, etc.)
CREATE TABLE IF NOT EXISTS cms_files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    original_name TEXT,
    file_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    metadata TEXT DEFAULT '{}',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- CMS Icons table (SVG Icons for Math, Kids, Education)
CREATE TABLE IF NOT EXISTS cms_icons (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    svg_code TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Dashboard snapshots (Task: cron pre-aggregation)
-- ============================================
-- Written once daily by the Worker's `scheduled` handler (02:00 UTC). The
-- admin dashboard reads these pre-aggregated rows instead of running
-- GROUP BY queries over the full registrations table on every page load.
-- `month_key` is 'YYYY-MM' (UTC); one row per month, upserted daily.
-- `level_distribution_json` is [{name, value}, ...] ready for recharts.
CREATE TABLE IF NOT EXISTS dashboard_snapshots (
    month_key TEXT PRIMARY KEY,
    revenue REAL NOT NULL DEFAULT 0,
    students INTEGER NOT NULL DEFAULT 0,
    registrations INTEGER NOT NULL DEFAULT 0,
    pending_payments INTEGER NOT NULL DEFAULT 0,
    level_distribution_json TEXT NOT NULL DEFAULT '[]',
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes (Task E — hot-path optimization)
-- ============================================
-- Idempotent: each CREATE INDEX IF NOT EXISTS is a no-op on re-run.
-- `wrangler d1 execute` runs schema.sql from scratch, but we re-CREATE the
-- tables above which means these indices are also recreated.

-- Registrations: filter & lookup hot path
CREATE INDEX IF NOT EXISTS idx_registrations_status          ON registrations(status);
CREATE INDEX IF NOT EXISTS idx_registrations_payment_status  ON registrations(payment_status);
CREATE INDEX IF NOT EXISTS idx_registrations_class_id        ON registrations(class_id);
CREATE INDEX IF NOT EXISTS idx_registrations_phone           ON registrations(parent_phone);
-- `registration_number` is UNIQUE so SQLite auto-indexes it, but the explicit
-- index makes the intent obvious to readers and keeps the index list here.
CREATE INDEX IF NOT EXISTS idx_registrations_number          ON registrations(registration_number);
CREATE INDEX IF NOT EXISTS idx_registrations_created_at      ON registrations(created_at DESC);

-- Payment tracking: lookup by registration number is the public tracking flow
CREATE INDEX IF NOT EXISTS idx_payment_tracking_number       ON payment_tracking(registration_number);
CREATE INDEX IF NOT EXISTS idx_payment_tracking_status       ON payment_tracking(status);

-- Classes: join from registrations, filter by level
CREATE INDEX IF NOT EXISTS idx_classes_level                 ON classes(level_id);
CREATE INDEX IF NOT EXISTS idx_classes_is_active             ON classes(is_active);

-- CMS content: by section is the entire public read path
CREATE INDEX IF NOT EXISTS idx_cms_content_section           ON cms_content(section);

-- CMS files: by file_type is the public read path
CREATE INDEX IF NOT EXISTS idx_cms_files_type                ON cms_files(file_type);
CREATE INDEX IF NOT EXISTS idx_cms_files_active              ON cms_files(is_active);

-- CMS icons: by category, is_active
CREATE INDEX IF NOT EXISTS idx_cms_icons_category            ON cms_icons(category);
CREATE INDEX IF NOT EXISTS idx_cms_icons_active              ON cms_icons(is_active);

-- ============================================
-- WhatsApp Message Templates table
-- ============================================
CREATE TABLE IF NOT EXISTS wa_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wa_templates_updated_at ON wa_templates(updated_at DESC);

-- Default WA Message Templates Seed (v2, idempotent for fresh DB)
INSERT OR IGNORE INTO wa_templates (id, name, content, version) VALUES
    (
        'welcome',
        'Sambutan Selamat Datang',
        '🎮 *Selamat Datang di Djuniors!* 🎉

Halo {nama}!

Terima kasih sudah mendaftar di Djuniors ({kota}).
🔖 No. Pendaftaran: *{nomor_pendaftaran}*
📅 Jadwal: *{jadwal}*

Siap belajar matematika jadi seru? 🚀

📞 Hubungi kami jika ada pertanyaan!
🌐 www.djuniors.id',
        2
    ),
    (
        'enrollment_confirmed',
        'Konfirmasi Pendaftaran',
        '✅ *Pendaftaran Berhasil!*

Halo {nama}!

Pendaftaran untuk Ananda *{nama_anak}* telah dikonfirmasi.
🔖 No. Pendaftaran: *{nomor_pendaftaran}*
📚 Kelas: *{nama_kelas}*
📅 Jadwal: *{jadwal}*

Materi dan link kelas akan dikirimkan segera.

Semangat belajar! 💪',
        2
    ),
    (
        'payment_instructions',
        'Instruksi Pembayaran',
        '💳 *Instruksi Pembayaran*

Halo {nama}!

Untuk menyelesaikan pendaftaran (*{nomor_pendaftaran}*), silakan transfer melalui *{metode_pembayaran}* ke:

🏦 Bank: *{bank}*
📄 Rekening: *{rekening}*
💰 Tagihan: *Rp {tagihan_akhir}*
🔖 Kode: *{nomor_pendaftaran}*

⚠️ *PENTING:*
Transfer tepat sampai digit terakhir agar pembayaran bisa otomatis terdeteksi!

📸 Konfirmasi & upload bukti transfer di: {link_pembayaran}',
        2
    ),
    (
        'payment_success',
        'Konfirmasi Pembayaran Diterima',
        '💰 *Pembayaran Diterima!*

Halo {nama}!
Pembayaran sebesar *Rp {tagihan_akhir}* untuk kelas *{nama_kelas}* (No: *{nomor_pendaftaran}*) sudah kami terima.

📅 Jadwal: *{jadwal}*
✅ Status: Lunas

Selamat belajar! 🎯',
        2
    ),
    (
        'class_reminder',
        'Pengingat Jadwal Kelas',
        '⏰ *Pengingat Kelas!*

Halo {nama}!
Kelas *{nama_kelas}* akan dimulai pukul *{waktu}*.

Siap belajar ya! 📚',
        2
    ),
    (
        'promo',
        'Pengumuman Promo Spesial',
        '🎉 *Promo Spesial!* 🎉

Halo {nama}!

Gunakan kode *{kode_promo}* untuk mendapatkan diskon *{diskon}*!

Berlaku terbatas. Jangan sampai kehabisan! ⏰',
        2
    );

-- ============================================
-- Migration: Upgrade WA Templates to Version 2
-- Idempotent & non-destructive: only updates templates where version < 2 or version IS NULL
-- Admin-customized templates will not be overwritten in subsequent runs
-- ============================================
UPDATE wa_templates SET
    name = 'Sambutan Selamat Datang',
    content = '🎮 *Selamat Datang di Djuniors!* 🎉

Halo {nama}!

Terima kasih sudah mendaftar di Djuniors ({kota}).
🔖 No. Pendaftaran: *{nomor_pendaftaran}*
📅 Jadwal: *{jadwal}*

Siap belajar matematika jadi seru? 🚀

📞 Hubungi kami jika ada pertanyaan!
🌐 www.djuniors.id',
    version = 2
WHERE id = 'welcome' AND (version < 2 OR version IS NULL);

UPDATE wa_templates SET
    name = 'Konfirmasi Pendaftaran',
    content = '✅ *Pendaftaran Berhasil!*

Halo {nama}!

Pendaftaran untuk Ananda *{nama_anak}* telah dikonfirmasi.
🔖 No. Pendaftaran: *{nomor_pendaftaran}*
📚 Kelas: *{nama_kelas}*
📅 Jadwal: *{jadwal}*

Materi dan link kelas akan dikirimkan segera.

Semangat belajar! 💪',
    version = 2
WHERE id = 'enrollment_confirmed' AND (version < 2 OR version IS NULL);

UPDATE wa_templates SET
    name = 'Instruksi Pembayaran',
    content = '💳 *Instruksi Pembayaran*

Halo {nama}!

Untuk menyelesaikan pendaftaran (*{nomor_pendaftaran}*), silakan transfer melalui *{metode_pembayaran}* ke:

🏦 Bank: *{bank}*
📄 Rekening: *{rekening}*
💰 Tagihan: *Rp {tagihan_akhir}*
🔖 Kode: *{nomor_pendaftaran}*

⚠️ *PENTING:*
Transfer tepat sampai digit terakhir agar pembayaran bisa otomatis terdeteksi!

📸 Konfirmasi & upload bukti transfer di: {link_pembayaran}',
    version = 2
WHERE id = 'payment_instructions' AND (version < 2 OR version IS NULL);

UPDATE wa_templates SET
    name = 'Konfirmasi Pembayaran Diterima',
    content = '💰 *Pembayaran Diterima!*

Halo {nama}!
Pembayaran sebesar *Rp {tagihan_akhir}* untuk kelas *{nama_kelas}* (No: *{nomor_pendaftaran}*) sudah kami terima.

📅 Jadwal: *{jadwal}*
✅ Status: Lunas

Selamat belajar! 🎯',
    version = 2
WHERE id = 'payment_success' AND (version < 2 OR version IS NULL);

UPDATE wa_templates SET
    name = 'Pengingat Jadwal Kelas',
    content = '⏰ *Pengingat Kelas!*

Halo {nama}!
Kelas *{nama_kelas}* akan dimulai pukul *{waktu}*.

Siap belajar ya! 📚',
    version = 2
WHERE id = 'class_reminder' AND (version < 2 OR version IS NULL);

UPDATE wa_templates SET
    name = 'Pengumuman Promo Spesial',
    content = '🎉 *Promo Spesial!* 🎉

Halo {nama}!

Gunakan kode *{kode_promo}* untuk mendapatkan diskon *{diskon}*!

Berlaku terbatas. Jangan sampai kehabisan! ⏰',
    version = 2
WHERE id = 'promo' AND (version < 2 OR version IS NULL);




