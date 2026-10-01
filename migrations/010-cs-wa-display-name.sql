-- ============================================
-- Migrasi 010 — nama pengirim WhatsApp per CS
-- ============================================
-- {cs_name} di template WA selama ini hanya berisi admin_accounts.name, yang
-- hanya bisa diubah admin (Akun Tim). CS sendiri tidak punya tempat untuk
-- mengatur nama yang dilihat pelanggan, padahal itu nama yang muncul di
-- setiap pesan (tanda tangan "Salam, {cs_name} - D'Juniors").
--
-- Kolom ini = nama tampilan khusus untuk pesan WhatsApp. Dikosongkan berarti
-- pakai nama akun, jadi tidak ada data lama yang berubah.
ALTER TABLE cs_wa_settings ADD COLUMN wa_display_name TEXT NOT NULL DEFAULT '';

UPDATE cs_wa_settings SET wa_display_name = name FROM admin_accounts
 WHERE admin_accounts.id = cs_wa_settings.admin_account_id
   AND (wa_display_name IS NULL OR TRIM(wa_display_name) = '');