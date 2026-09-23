-- ============================================
-- Djuniors - Migration 003: Tipe Metode Pembayaran + Snapshot Pemilik Rekening
-- ============================================
-- Jalankan SEKALI di database remote (dan lokal) setelah deploy kode baru:
--   npx wrangler d1 execute djuniors-db --remote --file=migrations/003-payment-method-types.sql
--   npx wrangler d1 execute djuniors-db --local  --file=migrations/003-payment-method-types.sql
--
-- Catatan: baris ALTER TABLE akan GAGAL bila kolom sudah ada
-- ("duplicate column name") — itu tanda migrasi sudah pernah dijalankan.

-- 1. bank_accounts.type — membedakan rekening bank / e-wallet / QRIS
--    Dipakai agar halaman lacak & popup pendaftaran hanya menampilkan
--    detail pembayaran sesuai metode yang dipilih pendaftar.
ALTER TABLE bank_accounts ADD COLUMN type TEXT NOT NULL DEFAULT 'bank';

-- 2. registrations.bank_account_name — snapshot nama pemilik rekening
--    (rekening bisa diubah admin setelah pendaftaran; info pembayaran
--    pendaftar lama harus tetap utuh).
ALTER TABLE registrations ADD COLUMN bank_account_name TEXT;

-- 3. Klasifikasi ulang rekening yang sudah ada berdasarkan nama.
UPDATE bank_accounts
   SET type = 'ewallet'
 WHERE type = 'bank'
   AND (LOWER(bank_name) LIKE '%dana%'
     OR LOWER(bank_name) LIKE '%ovo%'
     OR LOWER(bank_name) LIKE '%gopay%'
     OR LOWER(bank_name) LIKE '%shopeepay%'
     OR LOWER(bank_name) LIKE '%linkaja%');

UPDATE bank_accounts
   SET type = 'qris'
 WHERE type = 'bank'
   AND LOWER(bank_name) LIKE '%qris%';

CREATE INDEX IF NOT EXISTS idx_bank_accounts_type ON bank_accounts(type, is_active);
