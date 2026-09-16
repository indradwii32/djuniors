-- ============================================
-- Djuniors - Seed Data
-- ============================================

-- Default admin account
-- Username: admin
-- Password: admin123 (SHA-256 hash)
INSERT OR REPLACE INTO admin_accounts (id, username, password_hash, name, role, is_active)
VALUES (
    'admin-001',
    'admin',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'Administrator',
    'super_admin',
    1
);

-- Default bank accounts for manual transfer
INSERT OR REPLACE INTO bank_accounts (id, bank_name, account_number, account_name, is_active)
VALUES 
    ('bank-001', 'BCA Syariah', '8881016052', 'Wahyu Adi Syahputra', 1),
    ('bank-002', 'Bank Mandiri', '183 0000 895994', 'Wahyu Adi Syahputra', 1),
    ('bank-003', 'Bank BRI', '1055 0101 7176 507', 'Wahyu Adi Syahputra', 1),
    ('bank-004', 'DANA Wallet', '081252218206', 'Wahyu Adi Syahputra', 1);

-- Default settings
INSERT OR REPLACE INTO settings (key, value)
VALUES 
    ('site_name', 'D’Juniors Learning Center'),
    ('site_description', 'Lembaga pembelajaran online yang membantu anak belajar Matematika dengan cara yang menyenangkan, interaktif, dan sesuai dengan kemampuan masing-masing anak.'),
    ('contact_email', 'admin@djuniorslc.com'),
    ('contact_phone', '087714977001');

-- Default Levels
INSERT OR REPLACE INTO levels (id, name, description, min_age, max_age, grade_range, is_active, sort_order)
VALUES 
    ('level-foundation', 'Foundation', 'Untuk anak usia TK hingga SD kelas 2-3 yang sedang membangun dasar-dasar Matematika.', 4, 9, 'TK - SD Kelas 2-3', 1, 1),
    ('level-development', 'Development', 'Untuk siswa SD kelas 4–6 yang siap mengembangkan kemampuan Matematika dan berpikir logis ke tingkat yang lebih lanjut.', 9, 12, 'SD Kelas 4–6', 1, 2),
    ('level-progress', 'Progress', 'Program Matematika untuk siswa SMP yang dirancang untuk membantu siswa memahami materi secara lebih mendalam, meningkatkan kemampuan berpikir logis, serta membangun kepercayaan diri dalam menghadapi berbagai tantangan Matematika.', 12, 15, 'SMP', 1, 3);

-- Default Classes (with embedded schedule_slots)
INSERT OR REPLACE INTO classes (id, name, description, level_id, price, max_students, schedule_slots, icon, image_url, is_active)
VALUES 
    (
        'cls-reg-01',
        'Kelas Reguler (TK - SD Kelas 2-3)',
        'Kelas Foundation Matematika online berkelompok (8-12 siswa), 8x pertemuan/bulan @60 menit via Google Meet / Zoom.',
        'level-foundation',
        97000,
        12,
        '[{"day":"Senin & Rabu","start":"16:00","end":"17:00","start_time":"16:00","end_time":"17:00"},{"day":"Senin & Rabu","start":"18:30","end":"19:30","start_time":"18:30","end_time":"19:30"},{"day":"Selasa & Kamis","start":"16:00","end":"17:00","start_time":"16:00","end_time":"17:00"},{"day":"Selasa & Kamis","start":"18:30","end":"19:30","start_time":"18:30","end_time":"19:30"},{"day":"Jumat & Sabtu","start":"16:00","end":"17:00","start_time":"16:00","end_time":"17:00"},{"day":"Jumat & Sabtu","start":"18:30","end":"19:30","start_time":"18:30","end_time":"19:30"}]',
        '🧮',
        NULL,
        1
    ),
    (
        'cls-reg-02',
        'Kelas Reguler (SD Kelas 4-6)',
        'Kelas Development Matematika online berkelompok (8-12 siswa), 8x pertemuan/bulan @60 menit via Google Meet / Zoom.',
        'level-development',
        97000,
        12,
        '[{"day":"Senin & Rabu","start":"16:00","end":"17:00","start_time":"16:00","end_time":"17:00"},{"day":"Senin & Rabu","start":"18:30","end":"19:30","start_time":"18:30","end_time":"19:30"},{"day":"Selasa & Kamis","start":"16:00","end":"17:00","start_time":"16:00","end_time":"17:00"},{"day":"Selasa & Kamis","start":"18:30","end":"19:30","start_time":"18:30","end_time":"19:30"},{"day":"Jumat & Sabtu","start":"16:00","end":"17:00","start_time":"16:00","end_time":"17:00"},{"day":"Jumat & Sabtu","start":"18:30","end":"19:30","start_time":"18:30","end_time":"19:30"}]',
        '🎒',
        NULL,
        1
    ),
    (
        'cls-reg-03',
        'Kelas Reguler (SMP)',
        'Kelas Progress Matematika online berkelompok (8-12 siswa), 8x pertemuan/bulan @60 menit via Google Meet / Zoom.',
        'level-progress',
        97000,
        12,
        '[{"day":"Senin & Rabu","start":"16:00","end":"17:00","start_time":"16:00","end_time":"17:00"},{"day":"Senin & Rabu","start":"18:30","end":"19:30","start_time":"18:30","end_time":"19:30"},{"day":"Selasa & Kamis","start":"16:00","end":"17:00","start_time":"16:00","end_time":"17:00"},{"day":"Selasa & Kamis","start":"18:30","end":"19:30","start_time":"18:30","end_time":"19:30"},{"day":"Jumat & Sabtu","start":"16:00","end":"17:00","start_time":"16:00","end_time":"17:00"},{"day":"Jumat & Sabtu","start":"18:30","end":"19:30","start_time":"18:30","end_time":"19:30"}]',
        '🚀',
        NULL,
        1
    ),
    (
        'cls-prv-01',
        'Kelas Private (TK / SD / SMP)',
        'Pembelajaran 1-on-1 intensif dan personal via Google Meet / Zoom (8x pertemuan/bulan @60 menit). Jadwal fleksibel sesuai permintaan dan materi disesuaikan kebutuhan siswa.',
        'level-foundation',
        398000,
        1,
        '[{"day":"Private (Jadwal Fleksibel)","start":"Fleksibel","end":"Sesuai Permintaan","start_time":"Fleksibel","end_time":"Sesuai Permintaan"}]',
        '⭐',
        NULL,
        1
    );

-- Dummy Registrations (3 contoh)
INSERT OR REPLACE INTO registrations (
    id, registration_number, parent_name, parent_phone, parent_email, parent_city,
    class_id, schedule_slot, children, total_amount, discount_amount, final_amount,
    promo_code, payment_method, payment_proof_url, status, payment_status, notes
)
VALUES 
    (
        'reg-001',
        'REG-001',
        'Ibu Rina',
        '081234567890',
        'rina@example.com',
        'Kediri',
        'cls-reg-01',
        'Senin & Rabu (16:00 - 17:00 WIB)',
        '[{"name":"Dina","age_or_class":"7 tahun"}]',
        97000,
        0,
        97000,
        NULL,
        'bank_transfer',
        '/uploads/proof-reg-001.jpg',
        'confirmed',
        'paid',
        'Pendaftaran dan pembayaran telah dikonfirmasi.'
    ),
    (
        'reg-002',
        'REG-002',
        'Bapak Andi',
        '085678901234',
        'andi@example.com',
        'Surabaya',
        'cls-prv-01',
        'Private (Jadwal Fleksibel)',
        '[{"name":"Raka","age_or_class":"9 tahun"}]',
        398000,
        0,
        398000,
        NULL,
        'bank_transfer',
        NULL,
        'pending',
        'unpaid',
        'Menunggu pembayaran dari wali murid.'
    ),
    (
        'reg-003',
        'REG-003',
        'Ibu Sari',
        '089876543210',
        'sari@example.com',
        'Malang',
        'cls-reg-02',
        'Selasa & Kamis (16:00 - 17:00 WIB)',
        '[{"name":"Arka","age_or_class":"10 tahun"}]',
        97000,
        0,
        97000,
        NULL,
        'bank_transfer',
        '/uploads/proof-reg-003.jpg',
        'confirmed',
        'paid',
        'Pendaftaran dan pembayaran telah dikonfirmasi.'
    );

-- Payment Tracking for the 3 registrations
INSERT OR REPLACE INTO payment_tracking (
    id, registration_id, registration_number, parent_phone, amount, payment_method, proof_url, status, confirmed_by, confirmed_at, notes
)
VALUES 
    (
        'track-001',
        'reg-001',
        'REG-001',
        '081234567890',
        97000,
        'bank_transfer',
        '/uploads/proof-reg-001.jpg',
        'confirmed',
        'Administrator',
        CURRENT_TIMESTAMP,
        'Pembayaran lunas terverifikasi'
    ),
    (
        'track-002',
        'reg-002',
        'REG-002',
        '085678901234',
        398000,
        'bank_transfer',
        NULL,
        'pending',
        NULL,
        NULL,
        'Registrasi baru dibuat, menunggu transfer'
    ),
    (
        'track-003',
        'reg-003',
        'REG-003',
        '089876543210',
        97000,
        'bank_transfer',
        '/uploads/proof-reg-003.jpg',
        'confirmed',
        'Administrator',
        CURRENT_TIMESTAMP,
        'Pembayaran lunas terverifikasi'
    );

-- Promos
INSERT OR REPLACE INTO promos (id, code, description, discount_type, discount_value, min_purchase, max_uses, used_count, is_active)
VALUES 
    ('promo-001', 'HEMAT20', 'Diskon 20% untuk semua kelas', 'percentage', 20, 100000, 100, 0, 1),
    ('promo-002', 'DISKON50K', 'Potongan langsung Rp 50.000', 'fixed', 50000, 150000, 50, 0, 1);

-- CMS Content Seed Data
INSERT OR REPLACE INTO cms_content (id, section, key, value, type)
VALUES
    -- Header
    ('cms-hdr-01', 'header', 'site_name', 'D’Juniors Learning Center', 'text'),
    ('cms-hdr-02', 'header', 'logo_text', 'D’Juniors Learning Center', 'text'),
    ('cms-hdr-03', 'header', 'nav_items', '[{"label":"Fitur","href":"#features"},{"label":"Pilihan Kelas","href":"#classes"},{"label":"Cara Kerja","href":"#how-it-works"},{"label":"Testimoni","href":"#testimonials"},{"label":"FAQ","href":"#faq"},{"label":"Lacak Pendaftaran","href":"lacak.html"}]', 'json'),
    ('cms-hdr-04', 'header', 'cta_button_text', 'Daftar Sekarang', 'text'),

    -- Footer
    ('cms-ftr-01', 'footer', 'footer_tagline', 'Lembaga pembelajaran online yang membantu anak belajar Matematika dengan cara yang menyenangkan, interaktif, dan sesuai kemampuan masing-masing anak.', 'text'),
    ('cms-ftr-02', 'footer', 'footer_email', 'admin@djuniorslc.com', 'text'),
    ('cms-ftr-03', 'footer', 'footer_phone', '0877 1497 7001', 'text'),
    ('cms-ftr-04', 'footer', 'footer_address', 'Perum Bringin Indah Persada C 9 Tulungrejo, Pare, Kediri, Jawa Timur', 'text'),
    ('cms-ftr-05', 'footer', 'copyright', '2026 D’Juniors Learning Center', 'text'),
    -- Social links: each entry has {platform, label, url, icon} (icon is an emoji or short text).
    -- Empty `url` means the platform is hidden from the footer until admin fills it in.
    ('cms-ftr-06', 'footer', 'social_links',
        '[{"platform":"facebook","label":"Facebook Djuniors","url":"https://facebook.com/djuniors","icon":"📘","order":1},{"platform":"instagram","label":"Instagram Djuniors","url":"https://instagram.com/djuniors","icon":"📸","order":2},{"platform":"tiktok","label":"TikTok Djuniors","url":"https://tiktok.com/@djuniors","icon":"🎵","order":3},{"platform":"youtube","label":"YouTube Djuniors","url":"https://youtube.com/@djuniors","icon":"📺","order":4},{"platform":"whatsapp","label":"WhatsApp Djuniors","url":"https://wa.me/6287714977001","icon":"💬","order":5},{"platform":"telegram","label":"Telegram Djuniors","url":"","icon":"✈️","order":6}]',
        'json'),

    -- Hero
    ('cms-hro-01', 'hero', 'hero_title', 'Kelas Matematika Online Interaktif & Menyenangkan!', 'text'),
    ('cms-hro-02', 'hero', 'hero_subtitle', 'Membantu anak belajar Matematika dengan cara yang menyenangkan, interaktif, dan sesuai dengan kemampuan masing-masing anak via Google Meet / Zoom.', 'text'),
    ('cms-hro-03', 'hero', 'hero_cta_text', 'Daftar Kelas Sekarang!', 'text'),
    ('cms-hro-04', 'hero', 'hero_cta_link', 'daftar.html', 'text'),
    ('cms-hro-05', 'hero', 'hero_badge', '🎯', 'text'),

    -- Features
    ('cms-ft-01', 'features', 'features_title', 'Kenapa Pilih D’Juniors Learning Center?', 'text'),
    ('cms-ft-02', 'features', 'features_subtitle', 'Membangun pemahaman konsep, logika berpikir, dan rasa percaya diri anak dalam Matematika!', 'text'),
    ('cms-ft-03', 'features', 'features_items', '[{"icon":"👩‍🏫","title":"Live Class Interaktif","description":"Belajar langsung dengan guru berpengalaman via Gmeet/Zoom. Membangun konsep dan logika secara terarah!"},{"icon":"🤝","title":"Menyenangkan & Personal","description":"Pembelajaran disesuaikan dengan kemampuan masing-masing anak agar anak percaya diri dan aktif bertanya."},{"icon":"👨‍👩‍👧","title":"Kelas Reguler & Private","description":"Pilihan kelas kelompok kecil (8-12 siswa) atau 1-on-1 private dengan jadwal fleksibel sesuai kebutuhan."},{"icon":"📱","title":"Akses Fleksibel dari Rumah","description":"Cukup HP atau laptop dengan koneksi internet. Hemat waktu, nyaman, dan materi terekam dengan baik!"}]', 'json'),

    -- Classes Section
    ('cms-cls-01', 'classes', 'classes_title', 'Program & Pilihan Kelas', 'text'),
    ('cms-cls-02', 'classes', 'classes_subtitle', 'Tersedia Kelas Reguler (Rp97.000/bln) dan Kelas Private (Rp398.000/bln) dengan pilihan jadwal lengkap!', 'text'),

    -- Testimonials
    ('cms-tst-01', 'testimonials', 'testimonials_title', 'Kata Orang Tua', 'text'),
    ('cms-tst-02', 'testimonials', 'testimonials_subtitle', 'Mereka sudah membuktikan anak jadi semangat belajar!', 'text'),
    ('cms-tst-03', 'testimonials', 'testimonials_items', '[{"name":"Ibu Sarah","relation":"Ibu dari Rizky (7 tahun)","text":"Anak saya yang tadinya tidak suka matematika, sekarang minta belajar setiap hari! Kelas live-nya seru banget, guru-nya juga sabar.","rating":5},{"name":"Bapak Ahmad","relation":"Ayah dari Siti (5 tahun)","text":"Kelas kecil jadi anak saya lebih percaya diri bertanya. Guru-gurunya juga selalu kasih feedback setelah kelas. Recommended banget!","rating":5},{"name":"Ibu Dewi","relation":"Ibu dari Budi (9 tahun)","text":"Praktis banget! Gak perlu antar-jemput. Anak belajar dari rumah lewat Google Meet, tapi tetap interaktif. Nilai matematikanya naik!","rating":5}]', 'json'),

    -- CTA
    ('cms-cta-01', 'cta', 'cta_title', 'Siap Belajar Live? 🚀', 'text'),
    ('cms-cta-02', 'cta', 'cta_subtitle', 'Daftar sekarang dan bergabunglah dengan kelas interaktif via Google Meet / Zoom!', 'text'),
    ('cms-cta-03', 'cta', 'cta_button_text', 'Daftar Sekarang!', 'text'),

    -- Meta
    ('cms-met-01', 'meta', 'meta_title', 'D’Juniors Learning Center - Belajar Matematika Seru & Interaktif', 'text'),
    ('cms-met-02', 'meta', 'meta_description', 'D’Juniors Learning Center - Lembaga pembelajaran online matematika interaktif untuk TK, SD, hingga SMP via Google Meet & Zoom.', 'text'),
    ('cms-met-03', 'meta', 'meta_keywords', 'matematika anak, kelas online live, Google Meet, Zoom, TK, SD, SMP, math for kids, belajar interaktif, djuniors, learning center', 'text'),

    -- Style
    ('cms-stl-01', 'style', 'primary_color', '#4A90D9', 'color'),
    ('cms-stl-02', 'style', 'secondary_color', '#FFD93D', 'color'),
    ('cms-stl-03', 'style', 'accent_color', '#FF6B35', 'color'),
    ('cms-stl-04', 'style', 'font_heading', 'Baloo 2', 'text'),
    ('cms-stl-05', 'style', 'font_body', 'Nunito', 'text');

-- CMS Settings Seed Data
INSERT OR REPLACE INTO cms_settings (id, key, value, category)
VALUES
    ('set-001', 'site_name', 'D’Juniors Learning Center', 'general'),
    ('set-002', 'logo_text', 'D’Juniors Learning Center', 'general'),
    ('set-003', 'primary_color', '#0EA5E9', 'style'),
    ('set-004', 'secondary_color', '#FFD93D', 'style'),
    ('set-005', 'accent_color', '#FF6B35', 'style'),
    ('set-006', 'font_heading', 'Baloo 2', 'style'),
    ('set-007', 'font_body', 'Nunito', 'style'),
    ('set-008', 'meta_title', 'D’Juniors Learning Center - Belajar Matematika Seru & Interaktif', 'seo'),
    ('set-009', 'meta_description', 'D’Juniors Learning Center - Lembaga pembelajaran online matematika interaktif untuk TK, SD, hingga SMP via Google Meet & Zoom.', 'seo'),
    ('set-010', 'meta_keywords', 'matematika anak, kelas online live, Google Meet, Zoom, TK, SD, SMP', 'seo');

-- CMS Icons Seed Data (30 SVG Icons: Math, Kids, Education, Objects)
INSERT OR REPLACE INTO cms_icons (id, name, svg_code, category, is_active)
VALUES
    -- MATH (6)
    (
        'icon-calculator',
        'Kalkulator',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" x2="18"/><path d="M16 10h.01"/><path d="M12 10h.01"/><path d="M8 10h.01"/><path d="M12 14h.01"/><path d="M8 14h.01"/><path d="M12 18h.01"/><path d="M8 18h.01"/></svg>',
        'math',
        1
    ),
    (
        'icon-sigma',
        'Sigma Total',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 7V4H6l6 8-6 8h12v-3"/></svg>',
        'math',
        1
    ),
    (
        'icon-percent',
        'Persentase',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" x2="5" y1="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
        'math',
        1
    ),
    (
        'icon-divide',
        'Pembagian',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="6" r="1"/><line x1="5" x2="19" y1="12" y2="12"/><circle cx="12" cy="18" r="1"/></svg>',
        'math',
        1
    ),
    (
        'icon-equals',
        'Sama Dengan',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" x2="19" y1="9" y2="9"/><line x1="5" x2="19" y1="15" y2="15"/></svg>',
        'math',
        1
    ),
    (
        'icon-pi',
        'Pi Matematika',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="10" y2="10"/><path d="M4 10V6a2 2 0 0 1 2-2h12"/><path d="M8 10v8"/><path d="M16 10v4"/></svg>',
        'math',
        1
    ),

    -- KIDS (8)
    (
        'icon-baby',
        'Bayi / Balita',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12h.01"/><path d="M15 12h.01"/><path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5"/><path d="M19 6.3a9 9 0 0 1 1.8 3.9 2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1"/></svg>',
        'kids',
        1
    ),
    (
        'icon-smile',
        'Senyum Ceria',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>',
        'kids',
        1
    ),
    (
        'icon-party-popper',
        'Terompet Pesta',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg>',
        'kids',
        1
    ),
    (
        'icon-balloon',
        'Balon Ceria',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M13 17h-2"/><path d="M12 2C8.8 2 6.2 4.6 6.2 7.9c0 2.6 1.7 4.6 3.3 5.9.7.6 1 1.4 1.1 2.2h2.8c.1-.8.4-1.6 1.1-2.2 1.6-1.3 3.3-3.3 3.3-5.9C17.8 4.6 15.2 2 12 2Z"/></svg>',
        'kids',
        1
    ),
    (
        'icon-puzzle',
        'Puzzle Logika',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.439 7.85c-.049.322.18.633.5.633h2.331a1 1 0 0 1 1 1v3.23a1 1 0 0 1-1 1h-2.995a.6.6 0 0 0-.442.193l-2.592 2.85a.6.6 0 0 0-.153.402V21a1 1 0 0 1-1 1h-3.23a1 1 0 0 1-1-1v-2.63a.6.6 0 0 0-.153-.403L8.65 15.1a.6.6 0 0 0-.442-.193H5.23a1 1 0 0 1-1-1v-3.23a1 1 0 0 1 1-1h2.33c.322 0 .55-.311.5-.633A3.996 3.996 0 0 1 12 2c2.2 0 4 1.8 4 4 0 .62-.163 1.207-.561 1.85Z"/></svg>',
        'kids',
        1
    ),
    (
        'icon-gamepad-2',
        'Gamepad Game',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/></svg>',
        'kids',
        1
    ),
    (
        'icon-rocket',
        'Roket Meluncur',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
        'kids',
        1
    ),
    (
        'icon-star',
        'Bintang Prestasi',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
        'kids',
        1
    ),

    -- EDUCATION (8)
    (
        'icon-book-open',
        'Buku Terbuka',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
        'education',
        1
    ),
    (
        'icon-graduation-cap',
        'Topi Wisuda',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>',
        'education',
        1
    ),
    (
        'icon-school',
        'Sekolah',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 9-2-4 10-3 10 3-2 4"/></svg>',
        'education',
        1
    ),
    (
        'icon-pencil',
        'Pensil Belajar',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>',
        'education',
        1
    ),
    (
        'icon-lightbulb',
        'Ide Bohlam',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
        'education',
        1
    ),
    (
        'icon-brain',
        'Otak Cerdas',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/></svg>',
        'education',
        1
    ),
    (
        'icon-award',
        'Penghargaan',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg>',
        'education',
        1
    ),
    (
        'icon-trophy',
        'Piala Juara',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
        'education',
        1
    ),

    -- OBJECTS (8)
    (
        'icon-clock',
        'Jam Waktu',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
        'objects',
        1
    ),
    (
        'icon-globe',
        'Globe Dunia',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
        'objects',
        1
    ),
    (
        'icon-heart',
        'Hati Kasih',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
        'objects',
        1
    ),
    (
        'icon-target',
        'Target Sasaran',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
        'objects',
        1
    ),
    (
        'icon-zap',
        'Petir Kilat',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
        'objects',
        1
    ),
    (
        'icon-gift',
        'Kado Hadiah',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/></svg>',
        'objects',
        1
    ),
    (
        'icon-video',
        'Video Live',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2"/></svg>',
        'objects',
        1
    ),
    (
        'icon-users',
        'Pengguna Grup',
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
        'objects',
        1
    );

-- Icons: Lucide (https://lucide.dev) - ISC License

-- ============================================
-- WhatsApp Message Templates Seed Data (v2)
-- ============================================
INSERT OR REPLACE INTO wa_templates (id, name, content, version) VALUES
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




