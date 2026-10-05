-- ============================================
-- Migrasi 013 — simpan alasan kegagalan kirim WhatsApp
-- ============================================
-- Sebelumnya log hanya menyimpan status 'failed' tanpa sebab, jadi tidak bisa
-- dibedakan antara "token salah", "nomor tujuan tidak valid", "kuota habis",
-- dan "ponsel tujuan offline". Semua kegagalan terlihat sama.
--
-- Kolom ini juga menyimpan alasan keberhasilan (mis. id message dari Fonnte)
-- sebagai catatan diagnostik.
ALTER TABLE notifications ADD COLUMN error_detail TEXT;