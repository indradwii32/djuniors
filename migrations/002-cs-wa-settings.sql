-- Migrasi 002: setelan Fonnte + template pesan WhatsApp per-CS.
-- Jalankan SEKALI saat deploy:
--   npx wrangler d1 execute djuniors-db --remote --file=migrations/002-cs-wa-settings.sql

CREATE TABLE IF NOT EXISTS cs_wa_settings (
    admin_account_id TEXT PRIMARY KEY REFERENCES admin_accounts(id) ON DELETE CASCADE,
    fonnte_token     TEXT    NOT NULL DEFAULT '',
    tpl_registration TEXT    NOT NULL DEFAULT '',
    tpl_payment      TEXT    NOT NULL DEFAULT '',
    auto_registration INTEGER NOT NULL DEFAULT 1,
    auto_payment      INTEGER NOT NULL DEFAULT 1,
    updated_at        DATETIME DEFAULT CURRENT_TIMESTAMP
);
