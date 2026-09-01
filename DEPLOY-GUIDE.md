# Djuniors — Deploy ke Cloudflare (Panduan Lengkap)

> Platform bimbel matematika live (TK–SD) via Google Meet.
> Stack: Hono di Cloudflare Workers (API) + React/Vite dashboard + vanilla JS landing page.
> Database: Cloudflare D1 | Storage: R2 | Cache: KV + Cache API.

---

## Arsitektur Deploy

```
┌─────────────────────────────────────────────────┐
│                  Cloudflare                      │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐              │
│  │  Pages       │  │  Pages       │              │
│  │  (Landing)   │  │  (Dashboard) │              │
│  │  public/     │  │  dashboard/  │              │
│  │              │  │  dist/       │              │
│  └──────┬───────┘  └──────┬───────┘              │
│         │                 │                      │
│         └────────┬────────┘                      │
│                  │ API calls                     │
│                  ▼                               │
│  ┌──────────────────────────┐                    │
│  │  Workers (API)           │                    │
│  │  src/index.ts (Hono)     │                    │
│  └──────┬───────┬───────┬───┘                    │
│         │       │       │                        │
│         ▼       ▼       ▼                        │
│  ┌──────┐ ┌──────┐ ┌──────┐                      │
│  │  D1  │ │  R2  │ │  KV  │                      │
│  │  DB  │ │ Files│ │Cache │                      │
│  └──────┘ └──────┘ └──────┘                      │
└─────────────────────────────────────────────────┘
```

**Semua di free tier:**
| Service | Limit |
|---------|-------|
| Workers | 100k req/day, 10ms CPU/req |
| Pages | Unlimited bandwidth |
| D1 | 5GB storage, 5M rows read/day |
| R2 | 10GB storage, generous ops |
| KV | 100k reads/day, 1k writes/day |

---

## Prerequisites

1. **Cloudflare account** — [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) (free)
2. **Node.js ≥ 18** — `node --version`
3. **Wrangler CLI** — sudah include di devDependencies

---

## Step 1: Clone & Install

```bash
git clone https://github.com/indradwii32/djuniors.git
cd djuniors
npm install
cd dashboard && npm install && cd ..
```

## Step 2: Login ke Cloudflare

```bash
npx wrangler login
```

Browser akan terbuka → approve → kembali ke terminal.

Verifikasi:
```bash
npx wrangler whoami
```

## Step 3: Buat Resources Cloudflare

```bash
npm run setup:cf
```

Script ini akan memandu Anda membuat:
- **D1 database** (`djuniors-db`) → copy `database_id` yang muncul
- **R2 bucket** (`djuniors-files`)
- **KV namespace** (`DJUNIORS_KV`) → copy `id` yang muncul

Lalu paste kedua UUID ke `wrangler.toml` — **di 3 tempat** (top-level, `[env.production]`, `[env.staging]`):

```toml
# Top-level (untuk local dev)
[[d1_databases]]
binding = "DB"
database_name = "djuniors-db"
database_id = "PASTE-D1-UUID-DISINI"   # ← ganti ini

[[kv_namespaces]]
binding = "KV"
id = "PASTE-KV-UUID-DISINI"            # ← ganti ini

# [env.production] — cari section ini, ganti juga
[[env.production.d1_databases]]
database_id = "PASTE-D1-UUID-DISINI"   # ← sama dengan di atas

[[env.production.kv_namespaces]]
id = "PASTE-KV-UUID-DISINI"            # ← sama dengan di atas

# [env.staging] — sama juga
[[env.staging.d1_databases]]
database_id = "PASTE-D1-UUID-DISINI"

[[env.staging.kv_namespaces]]
id = "PASTE-KV-UUID-DISINI"
```

> **Note:** `account_id` sudah ter-set di `wrangler.toml`. Jika akun berbeda, update dari `wrangler whoami`.

## Step 4: Init Database

```bash
# Buat semua tabel + indices
npm run db:init:remote

# Isi data awal (HANYA jika DB kosong — jangan jalankan jika sudah ada data)
npm run db:seed:remote
```

## Step 5: Set Secrets

```bash
# WAJIB jika pakai Cloudflare Turnstile (anti-bot di form pendaftaran):
npx wrangler secret put TURNSTILE_SECRET
# paste secret key dari https://dash.cloudflare.com/?to=/:account/turnstile

# OPSIONAL — JWT secret (auto-generated jika tidak di-set):
# npx wrangler secret put JWT_SECRET
# paste hasil: openssl rand -base64 48

# TIDAK PERLU — Fonnte token di-setting dari dashboard:
# Settings → WhatsApp Gateway → paste token → Simpan
```

**Ringkasan secrets:**
| Secret | Wajib? | Cara Setting |
|--------|--------|--------------|
| `JWT_SECRET` | ❌ Opsional | Auto-generate, atau `wrangler secret put` |
| `WA_FONNTE_TOKEN` | ❌ Opsional | Dashboard → Settings → WhatsApp Gateway |
| `TURNSTILE_SECRET` | ✅ Jika pakai | `wrangler secret put` |

## Step 6: Deploy

```bash
# Sanity check (tsc + wrangler dry-run)
npm run pre-deploy:check

# Deploy semuanya
npm run deploy:all:admin
```

Atau granular:
```bash
npm run deploy:api          # Workers API saja
npm run pages:deploy        # Landing page saja
npm run pages:deploy:admin  # Dashboard admin saja
```

## Step 7: Verifikasi Post-Deploy

```bash
# Landing page
curl -sI https://djuniors-pages.pages.dev/ | head -3

# API + cache
curl -si https://djuniors-api.<account>.workers.dev/api/classes | grep -iE 'x-cache|cache-control'
# Expect: Cache-Control: public, max-age=300

# Admin dashboard
curl -sI https://djuniors-admin.pages.dev/ | head -3
```

**Manual checks:**
- [ ] Buka `https://djuniors-pages.pages.dev/` — landing renders
- [ ] Klik "Daftar" — form pendaftaran works
- [ ] Buka `https://djuniors-admin.pages.dev/` — login page renders
- [ ] Login: `admin` / `admin123`
- [ ] Buka semua 10 menu — semua render (code splitting works)
- [ ] Network tab: 0 requests ke `fonts.googleapis.com`
- [ ] Dashboard → lihat widget "Konsumsi Free Tier Hari Ini"

## Step 8: Backfill Dashboard Snapshots

Setelah deploy pertama, trigger agar chart dashboard punya data:

```bash
# Login untuk dapat token
TOKEN=$(curl -s -X POST https://djuniors-api.<account>.workers.dev/api/auth/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

# Trigger backfill
curl -si -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://djuniors-api.<account>.workers.dev/api/dashboard/snapshots/generate
```

## Step 9: Setting Fonnte (WhatsApp Notifications)

1. Login ke dashboard admin: `https://djuniors-admin.pages.dev/`
2. Buka **Settings → WhatsApp Gateway**
3. Paste token Fonnte dari [fonnte.com](https://fonnte.com) dashboard
4. Klik **Simpan Token**
5. Klik **Tes Koneksi** — harus muncul "Status: Terhubung (Online)"

---

## Custom Domains (Recommended)

| Domain | Target | Cara |
|--------|--------|------|
| `djuniors.id` | Landing | CF Dashboard → Pages → djuniors-pages → Custom domains |
| `admin.djuniors.id` | Dashboard | CF Dashboard → Pages → djuniors-admin → Custom domains |
| `api.djuniors.id` | API | `npx wrangler route create api.djuniors.id/*` |

Setelah custom domain aktif:

1. Update CORS di `wrangler.toml`:
   ```toml
   [vars]
   ALLOWED_ORIGINS = "https://djuniors.id,https://www.djuniors.id,https://admin.djuniors.id"
   ```

2. Rebuild dashboard dengan API base production:
   ```bash
   npm run dashboard:build:prod
   npm run pages:deploy:admin
   ```

3. Redeploy API:
   ```bash
   npm run deploy:api
   ```

---

## Update & Redeploy

```bash
# Pull latest dari GitHub
git pull origin main

# Install dependencies (jika ada perubahan package.json)
npm install
cd dashboard && npm install && cd ..

# Sanity check
npm run pre-deploy:check

# Deploy semuanya
npm run deploy:all:admin
```

Untuk update komponen spesifik:
```bash
npm run deploy:api          # Workers API saja
npm run pages:deploy        # Landing page saja
npm run pages:deploy:admin  # Dashboard admin saja
```

> **Note:** Project ini pakai wrangler v4 — `--env production` sudah include di script `deploy`.

---

## Rollback

**Workers:**
```bash
npx wrangler rollback              # ke versi sebelumnya
npx wrangler rollback --version <id>  # ke versi spesifik
```

**Pages:**
CF Dashboard → Pages → project → Deployments → klik deployment lama → **Promote to active**

---

## Monitoring

| Tool | Cara Akses |
|------|-----------|
| Widget dashboard | Login admin → Dashboard → "Konsumsi Free Tier Hari Ini" |
| API endpoint | `GET /api/admin/usage` (Bearer token) |
| Per-request headers | Setiap response API bawa `X-D1-Reads`, `X-Cache-Hits`, dll |
| Dokumentasi | `docs/budget.md`, `docs/architecture.md` |

---

## Troubleshooting

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Build gagal: "database_id required" | Placeholder belum diganti | Jalankan `npm run setup:cf` |
| Worker 500 saat pertama request | KV/R2 binding missing | Cek `wrangler.toml` bindings |
| Dashboard login 401 | API URL salah | Set `VITE_API_BASE` saat build |
| Images 404 | R2 bucket kosong | Upload via admin CMS → Files |
| Cron snapshots error | Schema belum di-apply | `npm run db:init:remote` dulu |
| Fonnte offline | Token belum di-set | Dashboard → Settings → WhatsApp Gateway |

---

## Struktur Project

```
djuniors/
├── src/                    # Cloudflare Workers API (Hono)
│   ├── index.ts            # Entry point + route wiring + CORS + usage tracking
│   ├── middleware/         # Auth, cache, CMS KV, usage instrumentation
│   ├── routes/             # 14 route modules
│   ├── scheduled/          # Cron handlers (dashboard snapshots)
│   └── utils/              # JWT, Fonnte, helpers
├── dashboard/              # React + Vite SPA (admin panel)
│   ├── src/pages/          # 10 pages (Dashboard, Registrations, CMS, dll)
│   ├── src/components/     # Sidebar, Layout, UsageGauge, IconPicker, dll
│   └── dist/               # Build output (deploy ke Pages)
├── public/                 # Landing page static files (deploy ke Pages)
│   ├── index.html          # Homepage
│   ├── daftar.html         # Registration form
│   ├── lacak.html          # Registration tracking
│   └── js/                 # Vanilla JS (main, registration, tracking)
├── schema.sql              # D1 database schema (idempotent)
├── seed.sql                # Seed data (idempotent)
├── wrangler.toml           # Cloudflare Workers configuration
├── setup-cf.sh             # Interactive Cloudflare resource setup
├── DEPLOY.md               # Detailed deploy guide
└── docs/                   # Architecture + budget monitoring docs
```

---

Last updated: 2026-09-01
