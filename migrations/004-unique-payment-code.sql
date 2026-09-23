-- ============================================
-- Djuniors - Migration 004: Kode Unik Pembayaran
-- ============================================
-- Jalankan SEKALI di database remote (dan lokal) setelah deploy kode baru:
--   npx wrangler d1 execute djuniors-db --remote --file=migrations/004-unique-payment-code.sql
--   npx wrangler d1 execute djuniors-db --local  --file=migrations/004-unique-payment-code.sql
--
-- Catatan: baris ALTER TABLE akan GAGAL bila kolom sudah ada
-- ("duplicate column name") — itu tanda migrasi sudah pernah dijalankan.

-- Kode unik ditambahkan ke nominal tagihan pendaftar (mis. 150.000 → 150.123).
-- Dipisah dari final_amount agar laporan pendapatan tetap bersih.
ALTER TABLE registrations ADD COLUMN unique_code INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_registrations_unique_code ON registrations(unique_code);
