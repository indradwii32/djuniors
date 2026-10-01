-- Migrasi 005: laporan harian CS (chat masuk manual + rekap pendaftar/closing).
-- Jalankan SEKALI saat deploy:
--   npx wrangler d1 execute djuniors-db --remote --file=migrations/005-cs-daily-reports.sql
--
-- Aturan main:
--   * Satu baris per (akun CS, tanggal laporan) — jadi "update" memakai
--     UPSERT pada UNIQUE(cs_account_id, report_date).
--   * Tidak ada endpoint DELETE: laporan tidak boleh dihapus, hanya direvisi.
--   * chat_masuk diisi manual oleh CS; total pendaftar & closing dihitung
--     dari tabel registrations (tidak diinput manual) sehingga tidak bisa
--     tidak sinkron dengan data pendaftaran.

CREATE TABLE IF NOT EXISTS cs_daily_reports (
    id           TEXT PRIMARY KEY,
    cs_account_id TEXT   NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
    report_date  TEXT   NOT NULL,                  -- YYYY-MM-DD (WIB)
    chat_masuk   INTEGER NOT NULL DEFAULT 0,       -- diisi manual oleh CS
    catatan      TEXT,                             -- catatan bebas (opsional)
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (cs_account_id, report_date)
);

-- Pengambilan laporan per tanggal (dipakai query harian per CS).
CREATE INDEX IF NOT EXISTS idx_cs_daily_reports_date
    ON cs_daily_reports (report_date DESC);

-- Rekap "closing" dihitung dari tanggal pembayaran diverifikasi, bukan tanggal
-- pendaftaran. Kolom ini diisi saat konfirmasi pembayaran, jadi query
-- "closing per hari per CS" tidak perlu JOIN ke payment_tracking.
ALTER TABLE registrations ADD COLUMN paid_at TEXT;
ALTER TABLE registrations ADD COLUMN verified_by TEXT;

CREATE INDEX IF NOT EXISTS idx_registrations_ref_paid
    ON registrations (ref_code, paid_at);
