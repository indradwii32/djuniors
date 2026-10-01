-- Backfill paid_at + verified_by untuk pendaftaran lunas yang diverifikasi
-- SEBELUM kolom paid_at ada (migrasi 005).
--
-- Jalankan SETELAH migrations/005-cs-daily-reports.sql:
--   npx wrangler d1 execute djuniors-db --remote --file=migrations/006-backfill-paid-at.sql
--
-- Kenapa perlu: kolom paid_at diisi dari kode hanya mulai deploy baru.
-- Pendaftaran yang sudah lunas sebelumnya akan punya paid_at NULL, sehingga
-- angka "closing per hari" di menu Laporan tidak menghitungnya.
--
-- Sumber kebenaran: payment_tracking.confirmed_at — sudah ada di DB lama dan
-- diisi saat admin/CS mengonfirmasi pembayaran. verified_by diambil dari
-- kolom confirmed_by yang sama.
--
-- Aman diulang: WHERE paid_at IS NULL, jadi baris yang sudah terisi tidak
-- ditimpa dan baris tanpa tracking tidak diubah.

UPDATE registrations
SET paid_at = (
        SELECT pt.confirmed_at
        FROM payment_tracking pt
        WHERE pt.status = 'confirmed'
          AND (pt.registration_id = registrations.id
               OR pt.registration_number = registrations.registration_number)
        ORDER BY pt.confirmed_at ASC
        LIMIT 1
    ),
    verified_by = (
        SELECT pt.confirmed_by
        FROM payment_tracking pt
        WHERE pt.status = 'confirmed'
          AND (pt.registration_id = registrations.id
               OR pt.registration_number = registrations.registration_number)
        ORDER BY pt.confirmed_at ASC
        LIMIT 1
    )
WHERE payment_status = 'paid'
  AND paid_at IS NULL
  AND EXISTS (
        SELECT 1
        FROM payment_tracking pt
        WHERE pt.status = 'confirmed'
          AND (pt.registration_id = registrations.id
               OR pt.registration_number = registrations.registration_number)
    );
