# Djuniors - Production Deployment Guide

> Step-by-step instructions for deploying the Djuniors stack to Cloudflare's
> free tier. Read this end-to-end the first time; subsequent deploys are
> one-line (`npm run deploy:all`).

---

## Architecture overview

Three Cloudflare products, all on the free tier:

| Component | What runs there | Free tier limit |
|-----------|------------------|-----------------|
| **Workers** (`src/index.ts`) | The API (Hono on Cloudflare Workers) | 100k req/day, 10ms CPU/req |
| **Pages** (`public/`) | Landing page static files | Unlimited bandwidth |
| **Pages** (`dashboard/dist/`) | Admin dashboard SPA | Unlimited bandwidth |
| **D1** (`djuniors-db`) | Database | 5GB, 5M rows read/day |
| **R2** (`djuniors-files`) | Uploaded media (logo, hero, class images) | 10GB, generous ops |
| **KV** (`DJUNIORS_KV`) | Admin sessions, CMS cache version stamps | 100k reads/day, 1k writes/day |

Endpoints after deploy:

- **Landing:** `https://djuniors-pages.pages.dev/` (or custom domain)
- **Dashboard:** `https://djuniors-admin.pages.dev/` (recommend `admin.djuniors.id`)
- **API:** `https://djuniors-api.<account>.workers.dev/` (recommend `api.djuniors.id`)

---

## Prerequisites (one-time)

1. **Cloudflare account** — free tier is fine. <https://dash.cloudflare.com/sign-up>
2. **Node.js ≥ 18** and npm. Check with `node --version`.
3. **Wrangler CLI** (already a devDependency) — `npm install` once.

---

## Step-by-step

### 1. Log in to Cloudflare

```bash
wrangler login
```

This opens your browser. Approve. wrangler stores the OAuth token in `~/.config/.wrangler/`.

### 2. Create Cloudflare resources

Easiest way:

```bash
npm run setup:cf
```

This interactive helper walks through:

- D1 database creation → outputs a `database_id` you paste into `wrangler.toml`
- R2 bucket creation (just confirm; no IDs needed in `wrangler.toml`)
- KV namespace creation → outputs a namespace `id` you paste into `wrangler.toml`

After `setup:cf` completes, your `wrangler.toml` should have real UUIDs in the
`database_id` and `id` fields instead of `<YOUR_*_ID>`.

### 3. Apply schema and seed data to remote D1

```bash
npm run db:init:remote      # creates all tables + indices
npm run db:seed:remote      # ONLY if D1 is empty — adds demo data
```

To reset and re-seed:

```bash
npm run db:reset:remote
```

### 4. Set production secrets

Plaintext secrets never go into `wrangler.toml` — use `wrangler secret put`:

```bash
wrangler secret put WA_FONNTE_TOKEN
wrangler secret put JWT_SECRET
wrangler secret put TURNSTILE_SECRET
```

Each command prompts for the value. wrangler encrypts it at rest in Cloudflare
and exposes it via `c.env.JWT_SECRET` etc. at runtime.

> **Tip:** Generate a fresh JWT secret with `openssl rand -base64 48`.

### 5. Build the dashboard

```bash
npm run dashboard:build
```

Output goes to `dashboard/dist/`. Vite handles code splitting (Task B),
self-hosted fonts (Task G), and image optimization (Task F).

### 6. Deploy everything

```bash
npm run deploy:all
```

That single command runs:

1. `npm run dashboard:build` — build dashboard
2. `wrangler deploy` — deploy API Worker to `djuniors-api`
3. `wrangler pages deploy public --project-name=djuniors-pages` — deploy landing
4. `wrangler pages deploy dashboard/dist --project-name=djuniors-admin` — deploy dashboard

If you only need to ship a code change to one component, you can run the
granular commands individually:

```bash
npm run deploy:api      # Worker only
npm run deploy:pages    # Both Pages projects only
npm run pages:deploy           # Landing only
npm run pages:deploy:admin     # Dashboard only
```

---

## Custom domains (optional but recommended)

Once everything is deployed on the `*.pages.dev` and `*.workers.dev` defaults,
you can attach custom domains for production polish:

### Landing page (djuniors.id)

1. Cloudflare Dashboard → **Pages** → `djuniors-pages` → **Custom domains**
2. Add `djuniors.id` (and `www.djuniors.id` if you want)
3. Update nameservers at your registrar to point to Cloudflare (if not already)

### Dashboard (admin.djuniors.id)

Same process on the `djuniors-admin` Pages project.

### API (api.djuniors.id)

```bash
wrangler route create api.djuniors.id/*
```

Then set `routes` in `wrangler.toml`:

```toml
routes = [
  { pattern = "api.djuniors.id/*", custom_domain = true }
]
```

---

## CORS after deploy

`src/index.ts` currently uses `origin: '*'` for CORS (works for any origin).
Before going live, change to an allowlist:

```ts
app.use('*', cors({
    origin: [
        'https://djuniors.id',
        'https://www.djuniors.id',
        'https://admin.djuniors.id',
        // Local dev (don't ship these to production!)
        'http://localhost:8080',
        'http://localhost:5173',
    ],
    // ...
}));
```

---

## Post-deploy checklist

- [ ] Visit `https://djuniors-pages.pages.dev/` — landing renders
- [ ] Click a class → `daftar.html` works
- [ ] Track a registration (`lacak.html`) with one of the seeded `registration_number`s
- [ ] Visit `https://djuniors-admin.pages.dev/` — admin login (`admin`/`admin123`)
- [ ] Open each of the 10 menu items — — all render (Task B's code split is working)
- [ ] Check Network tab: no requests to `fonts.googleapis.com` (Task G)
- [ ] Check Network tab: no requests to `localhost:8787` from dashboard
- [ ] `curl -si https://djuniors-api.<account>.workers.dev/api/classes` → returns `Cache-Control: public, max-age=300`

---

## Rolling back

Workers:

```bash
wrangler rollback           # to previous version
wrangler rollback --version <id>   # to specific version
```

Pages (hosting):

- Cloudflare Dashboard → **Pages** → project → **Deployments** → click prior deployment → **Promote to active**

D1 (database):

- Destructive operations like `DELETE` are irreversible without a backup. To restore, re-run `npm run db:init:remote` and re-seed (loses any data added after seed).
- For backup/restore strategy see **Daily backups** below.

---

## Daily snapshots (Cron Worker — ACTIVE)

The `[triggers]` block in `wrangler.toml` schedules a daily run at 02:00 UTC
(09:00 WIB). The `scheduled` handler (exported from `src/index.ts`) calls
`generateDashboardSnapshots()` (`src/scheduled/snapshot.ts`) which pre-aggregates
the last 6 months of dashboard stats into the `dashboard_snapshots` table.

- Admin dashboard charts then read ~6 pre-computed rows instead of running
  GROUP BY over all registrations on every load.
- Manual backfill (e.g. right after first deploy):
  `POST /api/dashboard/snapshots/generate` with an admin Bearer token.
- Test the cron locally: restart `wrangler dev --test-scheduled`, then
  `curl "http://localhost:8787/__scheduled?cron=0+2+*+*+*"`.
- Note: the first deploy must apply `schema.sql` (Step 3) so the
  `dashboard_snapshots` table exists before the cron first fires — otherwise
  the scheduled run logs an error and retries next day (non-fatal).

Optional future use: the same scheduled handler is a natural place to add a
D1 → R2 nightly backup dump.

---

## Budget monitoring (free tier)

After deploy, monitor daily burn rate against the Cloudflare free-tier limits:

- **Dashboard widget** — log in as admin; the Dashboard page shows
  "Konsumsi Free Tier Hari Ini" (UsageGauge) with per-service progress bars,
  refreshed every 5 minutes.
- **API** — `GET /api/admin/usage` (Bearer token) returns today's counters,
  cache hit-rate, `% of budget` per service, and a 14-day history. Sets
  `X-Budget-Warning` header when any service exceeds 80% of its daily limit.
- **Per-request headers** — every API response carries `X-D1-Reads`,
  `X-D1-Writes`, `X-KV-Reads/Writes`, `X-Cache-Hits/Misses`,
  `X-Response-Time-Ms` for quick hotspot hunting.

Thresholds and the ≥80% playbook: see [`docs/budget.md`](./docs/budget.md).
Architecture of the cache layers + instrumentation: [`docs/architecture.md`](./docs/architecture.md).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Build fails: "database_id is required" | placeholder still in wrangler.toml | Run `npm run setup:cf` and paste real IDs |
| Worker returns 500 on first request | KV or R2 binding missing | Verify wrangler.toml `[[kv_namespaces]]` and `[[r2_buckets]]` sections |
| Dashboard login returns 401 | API URL not pointing at deployed Worker | Set `VITE_API_BASE` env var when building dashboard |
| Images 404 | R2 bucket not yet populated | Upload via admin CMS → Files tab |
| `turnstile verify failed` | TURNSTILE_SECRET not set as secret | `wrangler secret put TURNSTILE_SECRET` |

---

## Smoke tests after deploy

Quick smoke tests from a remote shell:

```bash
# Cache verification (Task C)
curl -si https://api.djuniors.id/api/classes | grep -iE 'x-cache|cache-control'
# Expect: x-cache: HIT, Cache-Control: public, max-age=300

# KV verification (Task D)
curl -si https://api.djuniors.id/api/cms/public/all | grep -i x-cms-cache
# Expect: X-Cms-Cache: KV-HIT (after first warm-up call)

# Fonts (Task G) — should never hit fonts.googleapis.com
curl -s https://djuniors.id/ | grep -c "fonts.googleapis"
# Expect: 0

# Code split (Task B) — should serve multiple JS chunks
curl -s https://admin.djuniors.id/login | grep -c '<script'
# Expect: ≥ 2

# Budget monitoring — usage endpoint (needs admin token)
curl -si -H "Authorization: Bearer $TOKEN" https://api.djuniors.id/api/admin/usage | head -30
# Expect: JSON with budgetPercent, and X-Budget-Warning header only when ≥80%

# Dashboard snapshots — backfill right after deploy
curl -si -X POST -H "Authorization: Bearer $TOKEN" https://api.djuniors.id/api/dashboard/snapshots/generate
# Expect: {"success":true,"months_written":6,...}
```

---

## Local dev quick reference

```bash
# Run all 3 local services:
python3 -m http.server 8080  --directory public   # landing
npx wrangler dev                                   # API on :8787
cd dashboard && npm run dev                        # dashboard on :5173

# Login locally: admin / admin123 (seeded in seed.sql)
```

---

Last updated: 2026-08-25 (Task H)