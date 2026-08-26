# Djuniors — Architecture

> Diagram + penjelasan request flow, cache layers, dan komponen. Terakhir diupdate: sesi 2 (2026-08-25) — termasuk usage instrumentation, dashboard snapshots, dan registrations tracking cache.

## Sistem secara keseluruhan

```
                          ┌─────────────────────────┐
                          │  Visitors (landing page)│
                          │  djuniors.id (CF Pages) │
                          └───────────┬─────────────┘
                                      │ fetch /api/*
                          ┌───────────▼─────────────┐        ┌──────────────────────┐
                          │  Admin (dashboard SPA)  │───────▶│ api.djuniors.id      │
                          │  admin.djuniors.id      │        │ (Cloudflare Worker)  │
                          └─────────────────────────┘        └──────────┬───────────┘
                                                                       │
                    ┌──────────────────────────────────────────────────┘
                    │  Worker: Hono (src/index.ts)
                    │
                    │  [1] usageTracker middleware  ← Proxy DB/KV/R2, emit X-* headers
                    │  [2] CORS middleware
                    │  [3] domain cacheMiddleware   ← Cache API + KV version stamps
                    │  [4] route handlers
                    │
        ┌────────────┼──────────────────┬──────────────────┐
        ▼            ▼                  ▼                  ▼
   ┌────────┐   ┌────────┐        ┌────────┐         ┌────────┐
   │   D1   │   │   KV   │        │Cache API│        │   R2   │
   │ (truth)│   │sessions│        │(caches. │        │ media  │
   │        │   │+ stamps│        │ default)│        │ files  │
   └────────┘   └────────┘        └────────┘         └────────┘
```

## Request flow detail (public GET, mis. `/api/classes`)

```
GET /api/classes
  │
  ├─[1] usageTracker (src/middleware/usage.ts)
  │     • c.env diganti Proxy per-request → DB/KV/R2 access terhitung
  │     • counters di WeakMap keyed by Context (per-request isolation)
  │
  ├─[2] cacheMiddleware('classes', 300)  (src/middleware/cache.ts)
  │     • baca version stamp KV `cache:ver:classes`
  │     • cache key = URL + ?__cv=<version>
  │     • HIT  → serve dari caches.default, +1 cacheHits
  │     • MISS → jalankan handler, simpan ke cache, serve response
  │              ber-anotasi (Cache-Control + X-Cache: MISS)
  │
  ├─[3] handler → c.env.DB (proxied) → D1 query
  │
  └─[4] response + headers:
        X-D1-Reads, X-KV-Reads, X-Cache-Hits, X-Cache: HIT/MISS,
        X-Response-Time-Ms, Cache-Control
```

## Cache layers (3 lapis, urutan kejadian)

| Layer | Teknologi | Isi | TTL | Invalidasi |
|---|---|---|---|---|
| 1 | Cache API (`caches.default`) | response JSON public GET | 60s–300s per domain | version stamp bump (KV) — instan |
| 2 | KV (`cms:*`) | CMS bundle/section/settings | 1 jam | `invalidateCmsCache()` saat admin write |
| 3 | D1 | source of truth | — | — |

### Domain cache & TTL

| Domain | Endpoint | TTL | Bump saat |
|---|---|---|---|
| `classes` | `/api/classes*` | 300s | admin CRUD kelas |
| `levels` | `/api/levels*` | 300s | admin CRUD level |
| `cms` | `/api/cms/settings`, `/api/cms/public/all`, `/api/cms/:section` | 300s | admin write CMS |
| `cms-files` | `/api/cms/files*` | 300s | admin upload/delete file |
| `cms-icons` | `/api/cms/icons*` | 300s | admin CRUD icon |
| `registrations` | `/api/registrations/track/*`, `/api/registrations/:id` | 60s | create reg, konfirmasi admin, upload bukti |

Invalidasi = `bumpCacheVersion(env, domain)` menulis timestamp baru ke `cache:ver:<domain>` → semua cache key domain itu berubah → next request MISS.

## Usage instrumentation (observability)

- **Per-request**: setiap request melewati Proxy yang membungkus DB/KV/R2 → headers `X-D1-Reads`, `X-D1-Writes`, `X-KV-Reads/Writes/Deletes`, `X-Cache-Hits/Misses/Stores`, `X-R2-Reads`, `X-Response-Time-Ms`
- **`d1RowsRead`** diambil dari `result.meta.rows_read` — ini metric yang match dengan budget 5M rows/day
- **Agregasi harian**: `recordDailyUsage()` fold counter per-request ke accumulator module-level per isolate → `maybeFlushDailyUsage()` flush read-merge-write ke KV key `usage:daily` maksimal tiap 3 menit via `waitUntil` (≤480 KV writes/day)
- **Endpoint** `GET /api/admin/usage` (admin-only, 1 KV read): usage hari ini, `cacheHitRate`, `budgetPercent` vs `FREE_TIER_LIMITS`, history 14 hari, `X-Budget-Warning` ≥80%
- **Widget** `UsageGauge` di Dashboard page menampilkan progress bar per layanan

Pitfall yang pernah terjadi (jangan diulang): jangan pernah assign properti bookkeeping ke Proxy result (`proxy.__flag = true` akan menulis ke TARGET — binding object runtime yang shared antar-request). Marker harus via `get` trap.

## Dashboard snapshots (cron)

```
[triggers] crons = ["0 2 * * *"]   (wrangler.toml)
        │
        ▼  scheduled handler (src/index.ts)
generateDashboardSnapshots()  (src/scheduled/snapshot.ts)
        │  4 aggregate SELECT + 6 upsert (batch)
        ▼
dashboard_snapshots table (month_key PK, revenue, students,
                          registrations, pending_payments,
                          level_distribution_json)
        │
        ▼  GET /api/dashboard/snapshots (admin)
Dashboard.tsx — chart & level distribution dari snapshot
(fallback ke live computation bila snapshot kosong)
```

- Backfill manual: `POST /api/dashboard/snapshots/generate`
- Cost: ~10 D1 queries/hari, menggantikan GROUP BY per dashboard load
- Test cron di dev: `wrangler dev --test-scheduled` lalu `curl "localhost:8787/__scheduled?cron=0+2+*+*+*"`

## Admin auth flow

```
POST /api/auth/admin/login → D1 (admin_accounts) + KV put admin-session:<id>
                              (JWT 24h, session TTL 24h)
Semua endpoint admin → adminAuthMiddleware: verifyJWT + KV session check
POST /api/auth/admin/change-password → UI di Settings → Keamanan Admin
```

## Free-tier budget

Lihat [budget.md](./budget.md) untuk limit, burn-rate monitoring, dan alert level.
