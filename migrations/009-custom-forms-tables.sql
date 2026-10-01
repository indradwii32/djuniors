-- ============================================
-- Migrasi 009 — tabel formulir custom yang tidak pernah dibuat
-- ============================================
-- Route /api/forms (src/routes/forms.ts) sudah ada sejak lama dan dipakai
-- halaman Formulir, tapi kedua tabelnya tidak pernah masuk schema.sql maupun
-- migrasi mana pun. Akibatnya setiap request melempar:
--   D1_ERROR: no such table: custom_forms
--   D1_ERROR: no such table: form_submissions
-- dan berakhir 500 Internal Server Error — baik saat membuka daftar formulir
-- maupun saat submit isi formulir.

CREATE TABLE IF NOT EXISTS custom_forms (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    -- JSON array field: {name, label, type, required, ...}
    fields      TEXT NOT NULL DEFAULT '[]',
    is_active   INTEGER NOT NULL DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_custom_forms_active ON custom_forms(is_active);

-- Isi formulir yang dikirim. CASCADE: menghapus formulir menghapus isinya,
-- kalau tidak route DELETE /api/forms/:id akan gagal foreign key setiap ada
-- jawaban tersimpan.
CREATE TABLE IF NOT EXISTS form_submissions (
    id         TEXT PRIMARY KEY,
    form_id    TEXT NOT NULL REFERENCES custom_forms(id) ON DELETE CASCADE,
    student_id TEXT,
    data       TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at DESC);
