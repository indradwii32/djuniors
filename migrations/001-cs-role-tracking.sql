-- ============================================
-- Djuniors - Migration: Role CS, Link Tracking, Snapshot Rekening
-- ============================================
-- Jalankan SEKALI di database remote (dan lokal) setelah deploy kode baru:
--   npx wrangler d1 execute djuniors-db --remote --file=migrations/001-cs-role-tracking.sql
--   npx wrangler d1 execute djuniors-db --local  --file=migrations/001-cs-role-tracking.sql
--
-- Catatan: file ini akan GAGAL bila kolom sudah ada ("duplicate column name")
-- — itu tanda migration sudah pernah dijalankan, abaikan.

-- 1. Akun tim: kode ref untuk link pendaftaran CS
ALTER TABLE admin_accounts ADD COLUMN ref_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_accounts_ref_code ON admin_accounts(ref_code);

-- 2. Registrasi: sumber link CS + snapshot rekening terpilih
ALTER TABLE registrations ADD COLUMN ref_code TEXT;
ALTER TABLE registrations ADD COLUMN bank_account_id TEXT;
ALTER TABLE registrations ADD COLUMN bank_name TEXT;
ALTER TABLE registrations ADD COLUMN bank_account_number TEXT;

CREATE INDEX IF NOT EXISTS idx_registrations_ref_code ON registrations(ref_code);
