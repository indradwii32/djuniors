-- ============================================
-- Migrasi 012 — nama tampilan CS jadi bagian profil akun
-- ============================================
-- Sebelumnya ada DUA nama: admin_accounts.name (dipakai dashboard & laporan,
-- hanya bisa diubah admin) dan cs_wa_settings.wa_display_name (dipakai tanda
-- tangan pesan WA, bisa diisi CS sendiri). Dua sumber nama = dashboard
-- menampilkan satu orang, pesan WhatsApp menampilkan nama lain.
--
-- Sekarang satu sumber: admin_accounts.display_name. Ini profil CS — diedit
-- dari halaman Profil Akun, bukan dari kartu token Fonnte. Dipakai seragam di
-- pesan WA, dashboard, dropdown laporan, dan tabel akuntansi.
--
-- Kolom lama di-drop: isinya sudah pindah, tidak ada data yang hilang.
ALTER TABLE admin_accounts ADD COLUMN display_name TEXT NOT NULL DEFAULT '';

-- Nomor WhatsApp CS, dipakai untuk pengingat ke CS (bukan ke pendaftar).
-- Kosong = belum diisi; notifikasi pengingat ke CS dilewati.
ALTER TABLE admin_accounts ADD COLUMN phone TEXT NOT NULL DEFAULT '';

-- Pindahkan nilai yang sudah diisi CS lewat editor nama pengirim WA.
UPDATE admin_accounts
SET display_name = (SELECT TRIM(s.wa_display_name) FROM cs_wa_settings s
                    WHERE s.admin_account_id = admin_accounts.id)
WHERE (SELECT TRIM(s.wa_display_name) FROM cs_wa_settings s
       WHERE s.admin_account_id = admin_accounts.id) IS NOT NULL
  AND TRIM(COALESCE(display_name, '')) = '';

-- Nama akun lama sudah jadi display_name kalau kolom ini masih kosong.
UPDATE admin_accounts SET display_name = name WHERE TRIM(COALESCE(display_name, '')) = '';

ALTER TABLE cs_wa_settings DROP COLUMN wa_display_name;