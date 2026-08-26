# Djuniors — Free-Tier Budget Monitoring

> Limit harian Cloudflare free plan, burn-rate monitoring, dan threshold alert. Terakhir diupdate: sesi 2 (2026-08-25).

## Limit harian (free tier)

| Layanan | Limit | Sumber `FREE_TIER_LIMITS` |
|---|---|---|
| Workers requests | 100.000/day | `requests` |
| D1 rows read | 5.000.000/day | `d1RowsRead` (dari `meta.rows_read`) |
| D1 rows written | 100.000/day | `d1Writes` |
| KV reads | 100.000/day | `kvReads` |
| KV writes (incl. deletes) | 1.000/day | `kvWrites + kvDeletes` |
| R2 reads | ~10.000.000/day (Class A+B umbrella) | `r2Reads` |

## Cara monitoring

### 1. Real-time per request (header response)

Setiap response API membawa:

```
X-D1-Reads: 2          ← jumlah query D1 (prepare+exec)
X-D1-Writes: 1         ← rows written (meta.changes)
X-KV-Reads: 0
X-KV-Writes: 1
X-Cache-Hits: 0        ← Cache API hit pada request ini
X-Cache-Misses: 0
X-Response-Time-Ms: 24
```

Cepat menemukan endpoint yang membakar budget:
```bash
curl -sD - -o /dev/null https://api.djuniors.id/api/xyz | grep X-D1
```

### 2. Agregat harian (endpoint + widget)

- **Endpoint**: `GET /api/admin/usage` (Bearer token admin) — 1 KV read per call
- **Widget**: Dashboard admin → "Konsumsi Free Tier Hari Ini" (UsageGauge) — refresh tiap 5 menit
- Data di-flush dari memory isolate ke KV (`usage:daily`) tiap ±3 menit → angka bisa lag beberapa menit
- Retensi 14 hari; `history` di response berisi per-day breakdown

Response shape:

```json
{
  "today": "2026-08-25",
  "usage": { "requests": 2261, "d1Reads": 1337, "d1RowsRead": 842, "kvWrites": 12, ... },
  "cacheHitRate": 71.4,
  "budgetPercent": { "requests": 2.3, "d1RowsRead": 0.02, "kvWrites": 1.2, ... },
  "limits": { "requests": 100000, "d1RowsRead": 5000000, ... },
  "history": [ ... ]
}
```

### 3. Alert header

Endpoint `/api/admin/usage` set `X-Budget-Warning: <pct>` bila konsumsi layanan manapun ≥80% limit harian. Widget menampilkan banner merah pada kondisi yang sama.

## Threshold levels

| Level | % budget harian | Warna widget | Arti |
|---|---|---|---|
| Sehat | <50% | hijau | normal |
| Waspada | 50–79% | amber | pantau, pertimbangkan tuning |
| **Bahaya** | ≥80% | merah + banner | tindakan diperlukan hari ini |

## Playbook saat ≥80%

1. Cek widget/endpoint — layanan mana yang membakar?
2. **D1 rows read tinggi** → cari endpoint dengan `X-D1-Reads` besar via curl; tambah `cacheMiddleware` atau perketat TTL; pastikan query pakai indeks (lihat `schema.sql` section indexes)
3. **KV writes tinggi** → ini biasanya invalidation storm (banyak admin write) atau flush interval terlalu agresif; `FLUSH_INTERVAL_MS` di `src/middleware/usage.ts` bisa dinaikkan
4. **Workers requests tinggi** → pastikan Cache API HIT di endpoint publik (cek `X-Cache`); landing page statis disajikan Pages (unlimited bandwidth)
5. **Kenapa angka bisa under-count sedikit**: multi-isolate read-merge-write race (didokumentasikan di usage.ts) — presisi monitoring, bukan billing

## Burn-rate estimasi steady-state (post-optimization)

Dari handoff + arsitektur cache 3 layer:

| Aktivitas | D1 reads | KV reads | KV writes |
|---|---|---|---|
| 1 kunjungan landing (cache warm) | ~0 | ~1–3 | 0 |
| Admin buka dashboard (snapshot fresh) | ~2–10 | 1 | 0 |
| Parent lacak pembayaran (cache warm 60s) | 0 | ~1 | 0 |
| Registrasi baru (public) | ~4 | 0 | 1 (bump) |
| Admin konfirmasi pembayaran | ~4 | 1 | 1 (bump) |
| Cron snapshot (02:00 UTC) | ~10 | 0 | 0 |

**1.000 visitor/day + 50 admin action/day ≈ <10k D1 reads + ~100 KV writes** — margin >99% dari limit. Snapshot harian + UsageGauge ada untuk mendeteksi anomaly (bot, polling loop, bug) sebelum mengenai limit.
