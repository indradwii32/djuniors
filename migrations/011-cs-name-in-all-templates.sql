-- ============================================
-- Migrasi 011 — nama CS tampil di semua 4 pesan otomatis
-- ============================================
-- Kolom wa_display_name (migrasi 010) baru ada artinya kalau {cs_name} benar-benar
-- dipakai. Dari 4 template event, enrollment_confirmed dan payment_success
-- tidak punya placeholder itu sama sekali, jadi nama CS tidak akan terlihat di
-- pesan pendaftaran maupun lunas.
--
-- Ditambahkan satu blok tanda tangan. Idempoten: baris yang sudah punya
-- {cs_name} tidak diubah sama sekali.
UPDATE wa_templates
SET content = CASE
        WHEN instr(content, '{cs_name}') > 0 THEN content
        -- Ada separator "---": sisipkan tanda tangan SEBELUMnya, supaya blok
        -- instruksi pembayaran tetap jadi penutup pesan dan tidak menyisip di
        -- antara daftar bank dengan link upload bukti.
        WHEN instr(content, char(10) || '---') > 0 THEN
             substr(content, 1, instr(content, char(10) || '---') - 1)
             || char(10) || 'Salam,' || char(10) || '{cs_name} - D''Juniors'
             || char(10) || char(10) || substr(content, instr(content, char(10) || '---') + 1)
        ELSE trim(content) || char(10) || char(10) || 'Salam,' || char(10) || '{cs_name} - D''Juniors'
    END
    , updated_at = CURRENT_TIMESTAMP
WHERE id IN ('enrollment_confirmed', 'payment_success');