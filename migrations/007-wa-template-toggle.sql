-- ============================================
-- Migrasi 007 — template notifikasi jadi satu-satunya sumber pesan otomatis
-- ============================================
-- Sammanya sebelumnya ada dua tempat template: tabel wa_templates (editor,
-- dipakai broadcast manual) dan cs_wa_settings.tpl_registration/tpl_payment
-- (dipakai notifikasi otomatis ke pendaftar). Dua sumber = pesan yang berbeda
-- untuk event yang sama, dan mustahil tahu mana yang benar.
--
-- Sekarang: editor template (wa_templates) menjadi satu-satunya sumber, dan
-- tiap template punya saklar aktif/nonaktif sendiri.

-- 1. Saklar aktif per template.
--    DEFAULT 1 supaya template lama tetap terkirim setelah migrasi ini;
--    matikan lewat dashboard bila sebuah notifikasi tidak dikehendaki.
ALTER TABLE wa_templates ADD COLUMN is_enabled INTEGER NOT NULL DEFAULT 1;

-- 2. Event "bukti pembayaran diterima, menunggu verifikasi" tidak punya
--    template sendiri sebelumnya — posinya ada di antara daftar dan lunas.
--    Default nonaktif: admin menyalakan setelah isi pesannya.
INSERT OR IGNORE INTO wa_templates (id, name, content, version, is_enabled) VALUES (
    'payment_received',
    'Bukti Pembayaran Diterima',
    '🕐 *Bukti Pembayaran Diterima*\n\nHalo {nama_orang_tua}!\n\nBukti transfer untuk pendaftaran *{nomor_pendaftaran}* sudah kami terima.\n💰 Nominal: *{total_transfer}*\n🏦 {nama_bank} — {nama_pemilik_rekening}\n\n⏳ Pembayaran sedang kami verifikasi. Anda akan diberi tahu segera setelah selesai.\n\nSalam,\n{cs_name} - D''Juniors',
    1,
    0
);
