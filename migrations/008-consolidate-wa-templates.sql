-- ============================================
-- Migrasi 008 — template notifikasi dirampingkan jadi 4 + pengingat terjadwal
-- ============================================
-- Sebelumnya ada 7 template dan 3 event. Template manual (welcome,
-- class_reminder, promo) tidak pernah dikirim otomatis, dan "instruksi
-- pembayaran" sudah ada sebagai pesan terpisah padahal isinya sudah ikut di
-- pesan pendaftaran. Hasilnya satu event punya dua sumber pesan.
--
-- Sekarang empat template, masing-masing satu event nyata:
--   enrollment   — daftar + instruksi pembayaran (digabung)
--   pending      — bukti masuk, menunggu verifikasi
--   paid         — lunas
--   due_reminder — pengingat belum bayar, terjadwal setelah daftar
--
-- File ini idempoten: boleh dijalankan berulang tanpa merusak data.

-- 1. Gabung "instruksi pembayaran" ke template pendaftaran, lalu sisakan
--    enrollment sebagai satu-satunya template untuk event pendaftaran.
--    Guard NOT LIKE: kalau file ini dijalankan dua kali, bagian instruksi
--    tidak akan ditempel dua kali.
UPDATE wa_templates SET
    content = content || char(10) || char(10) || '---' || char(10) || char(10) ||
        '💳 *Instruksi Pembayaran*' || char(10) || char(10) ||
        'Transfer tepat sampai digit terakhir agar pembayaran terdeteksi otomatis.' || char(10) ||
        '🏦 Bank: *{nama_bank}*' || char(10) ||
        '📄 Rekening: *{nomor_rekening}*' || char(10) ||
        '💰 Total: *{total_transfer}*' || char(10) || char(10) ||
        '📸 Upload bukti transfer di: {link_pembayaran}',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'enrollment_confirmed'
  AND content NOT LIKE '%Instruksi Pembayaran%';

-- 2. Template tanpa event otomatis. Baris tetap ada (riwayat dan template
--    manual tidak hilang) tapi dimatikan supaya saklarnya tidak menyesatkan.
UPDATE wa_templates SET is_enabled = 0, updated_at = CURRENT_TIMESTAMP
WHERE id IN ('welcome', 'payment_instructions', 'class_reminder', 'promo');

-- 3. Template pengingat belum bayar. Default NONAKTIF: durasi baru diatur di
--    request ini, dan menyalakan tanpa menentukan berapa hari akan langsung
--    mengirim pengingat ke pelanggan yang tidak diminta.
INSERT OR IGNORE INTO wa_templates (id, name, content, version, is_enabled) VALUES (
    'due_reminder',
    'Pengingat Belum Bayar',
    '⏰ *Pengingat Pembayaran*' || char(10) || char(10) ||
    'Halo {nama_orang_tua}!' || char(10) || char(10) ||
    'Pendaftaran *{nomor_pendaftaran}* ({nama_kelas}) belum lunas.' || char(10) ||
    'Sisa waktu bayar: *{sisa_hari} hari lagi*' || char(10) ||
    '💰 Tagihan: *{total_transfer}*' || char(10) || char(10) ||
    '🏦 {nama_bank} — {nomor_rekening} ({nama_pemilik_rekening})' || char(10) || char(10) ||
    '📸 Bayar & upload bukti di: {link_pembayaran}' || char(10) || char(10) ||
    'Salam,' || char(10) || '{cs_name} - D''Juniors',
    1,
    0
);

-- 4. Riwayat pengiriman pengingat, supaya cron tidak mengirim pesan yang sama
--    dua kali ke pendaftar yang sama. Tanpa ini pengingat akan spam setiap hari
--    sampai lunas.
CREATE TABLE IF NOT EXISTS wa_due_reminders (
    registration_id  TEXT PRIMARY KEY REFERENCES registrations(id) ON DELETE CASCADE,
    sent_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    days_left        INTEGER,
    template_version INTEGER
);

CREATE INDEX IF NOT EXISTS idx_wa_due_reminders_sent_at ON wa_due_reminders(sent_at DESC);
