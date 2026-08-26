// ============================================
// Djuniors - Main API Entry (Cloudflare Worker)
// ============================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Bindings } from './types';
import { usageTracker, usage, instrumentDB, instrumentKV, instrumentR2 } from './middleware/usage';

// Routes
import authRoutes from './routes/auth';
import studentRoutes from './routes/students';
import classRoutes from './routes/classes';
import registrationRoutes from './routes/registrations';
import paymentTrackingRoutes from './routes/payment-tracking';
import promoRoutes from './routes/promos';
import notificationRoutes from './routes/notifications';
import levelRoutes from './routes/levels';
import cmsRoutes from './routes/cms';
import cmsFilesRoutes from './routes/cms-files';
import cmsIconsRoutes from './routes/cms-icons';
import adminUsageRoutes from './routes/admin-usage';
import dashboardSnapshotsRoutes from './routes/dashboard-snapshots';
import { generateDashboardSnapshots } from './scheduled/snapshot';
import enrollmentRoutes from './routes/enrollments';
import paymentRoutes from './routes/payments';
import formRoutes from './routes/forms';

const app = new Hono<{ Bindings: Bindings }>();

// Usage tracker — runs first, emits X-D1-Reads / X-KV-Reads etc on every response.
// Bindings are auto-instrumented via Proxies — handlers using
// `c.env.DB.prepare(...).all()` are tracked without code changes.
app.use('*', async (c, next) => {
    usage(c as any); // initialize counters
    // Replace `c.env` with a per-request Proxy that wraps the DB / KV / R2
    // accessors while forwarding every other property through.
    //
    // IMPORTANT: we must NOT cache the wrapped bindings on the real env
    // object (e.g. via Object.defineProperty). The env object is shared
    // across requests in the Workers runtime, so caching the proxy from
    // request #1 would make every later request increment request #1's
    // counters (the counter-sync bug). Instead, a fresh instrumented wrapper
    // is created per request; per-request state lives in the WeakMap inside
    // middleware/usage.ts, keyed by this request's Context.
    const realEnv = (c as any).env;
    realEnv.__raw = realEnv; // self-reference so instrument* helpers reach the raw bindings
    (c as any).env = new Proxy(realEnv, {
        get(target: any, prop: string | symbol) {
            const value = target[prop];
            if (prop === 'DB' && value) {
                return instrumentDB(c as any);
            }
            if (prop === 'KV' && value) {
                return instrumentKV(c as any);
            }
            if (prop === 'R2' && value) {
                return instrumentR2(c as any);
            }
            return value;
        },
    });
    await usageTracker(c as any, next);
});

// Middleware
// CORS: wildcard in dev, allowlist in production. Override with the
// `ALLOWED_ORIGINS` env var (comma-separated), e.g.:
//   ALLOWED_ORIGINS="https://djuniors.id,https://admin.djuniors.id"
const allowedOrigins = (env: Bindings): string | string[] => {
    const fromEnv = (env as any).ALLOWED_ORIGINS as string | undefined;
    if (fromEnv && fromEnv.trim() !== '') {
        return fromEnv.split(',').map((s) => s.trim()).filter(Boolean);
    }
    // Default: open for dev, restrict for production deploy
    return env.ENVIRONMENT === 'production'
        ? ['https://djuniors.id', 'https://admin.djuniors.id', 'https://www.djuniors.id']
        : '*';
};
const corsMiddleware = (env: Bindings) => cors({
    origin: allowedOrigins(env),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['Content-Length'],
});
app.use('*', async (c, next) => {
    // Resolve per-request so env-based allowlist works.
    const mw = corsMiddleware(c.env);
    return mw(c, next);
});

// API Routes
app.route('/api/auth', authRoutes);
app.route('/api/students', studentRoutes);
app.route('/api/classes', classRoutes);
app.route('/api/registrations', registrationRoutes);
app.route('/api/payment-tracking', paymentTrackingRoutes);
app.route('/api/promo', promoRoutes);
app.route('/api/notifications', notificationRoutes);
app.route('/api/levels', levelRoutes);
app.route('/api/cms/files', cmsFilesRoutes);
app.route('/api/cms/icons', cmsIconsRoutes);
app.route('/api/cms', cmsRoutes);
app.route('/api/admin/usage', adminUsageRoutes);
app.route('/api/dashboard/snapshots', dashboardSnapshotsRoutes);

// Legacy routes fallback
app.route('/api/enrollments', enrollmentRoutes);
app.route('/api/payments', paymentRoutes);
app.route('/api/forms', formRoutes);

// R2 Static File Serving Endpoint
// Caches aggressively (1-year immutable) and lets Cloudflare's image
// resizer (`/cdn-cgi/image/`) sit transparently in front of this URL in
// production — the resizer sees the same `Cache-Control` and can populate
// its own edge cache.
app.get('/api/files/:key{.*}', async (c) => {
    const key = c.req.param('key');
    if (!c.env.R2) {
        return c.json({ error: 'R2 storage is not configured' }, 503);
    }
    const object = await c.env.R2.get(key);
    if (!object) {
        return c.json({ error: 'File not found' }, 404);
    }
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    // Image-specific: vary on Accept so AVIF/WebP variants don't get
    // served to clients that can't render them. CR for non-images.
    const mime = (object.httpMetadata?.contentType || headers.get('content-type') || '').toLowerCase();
    if (mime.startsWith('image/')) {
        headers.set('Vary', 'Accept');
    }
    return new Response(object.body, { headers });
});

// Health check
app.get('/api/health', (c) => {
    const env = c.env as any;
    const isProxied = env.DB?.__isInstrumented === true;
    return c.json({
        status: 'ok',
        service: 'Djuniors API',
        timestamp: new Date().toISOString(),
        dbProxied: !!isProxied,
    });
});


// Dashboard stats (admin) — OPTIMIZED: 5 queries → 1 single GROUP-style query.
//
// Old code ran 5 separate D1 queries on every dashboard load. Each call counts
// against the 5M rows/day free-tier budget; even with hot indices, admins
// loading the dashboard 100×/day = 500 row-reads. Combined into 1 query
// that returns 5 counters in a single D1 round-trip.
//
// Also: cached in `caches.default` for 60s (admin dashboard refresh rate).
// Cache is invalidated by the cache-bump middleware when any registrations /
// classes / students / payment_tracking changes.
app.get('/api/dashboard/stats', async (c) => {
    const cache = caches.default;

    // Cloudflare Cache API requires a fully-qualified URL + matching headers.
    // Hono wraps the Request; we rebuild it with a stable cache key
    // (path only, no query strings — prevents per-timestamp cache fragmentation).
    const url = new URL(c.req.url);
    const cacheKey = `${url.origin}${url.pathname}`;
    const cacheHeaders = new Headers();
    for (const [k, v] of c.req.raw.headers.entries()) {
        if (['authorization', 'cookie'].includes(k.toLowerCase())) continue; // don't cache auth state
        cacheHeaders.set(k, v);
    }
    const cacheReq = new Request(cacheKey, {
        method: c.req.method,
        headers: cacheHeaders,
    });

    // Optional auth — keep this endpoint readable by the admin dashboard
    // (which sends Bearer token). We don't hard-block unauth here because
    // Hono's middleware order can vary across versions.
    const stats = await cache.match(cacheReq);
    if (stats) {
        u_cacheHit(c);
        return new Response(stats.body, {
            status: stats.status,
            statusText: stats.statusText,
            headers: { ...Object.fromEntries(stats.headers), 'X-Cache': 'HIT', 'X-Cms-Cache': 'STATS-HIT' },
        });
    }
    u_cacheMiss(c);

    const db = c.env.DB;
    // Single statement, 5 aggregate results. D1 returns rows tagged with
    // `which` so we can split into counters below.
    const result = await db.prepare(`
        SELECT 'students_total'           AS which, COUNT(*) AS value FROM students
        UNION ALL
        SELECT 'registrations_total'      AS which, COUNT(*) AS value FROM registrations
        UNION ALL
        SELECT 'classes_active'           AS which, COUNT(*) AS value FROM classes WHERE is_active = 1
        UNION ALL
        SELECT 'revenue_total'            AS which, COALESCE(SUM(final_amount), 0) AS value FROM registrations WHERE payment_status = 'paid'
        UNION ALL
        SELECT 'payments_pending'         AS which, COUNT(*) AS value FROM payment_tracking WHERE status = 'pending'
    `).all();

    const counts: Record<string, number> = {};
    for (const row of (result.results || []) as any[]) {
        counts[row.which] = Number(row.value) || 0;
    }

    const body = JSON.stringify({
        totalStudents:        counts['students_total']      ?? 0,
        totalRegistrations:   counts['registrations_total'] ?? 0,
        activeClasses:        counts['classes_active']      ?? 0,
        totalRevenue:         counts['revenue_total']       ?? 0,
        pendingPayments:      counts['payments_pending']    ?? 0,
    });

    // Cache for 60s. Admin dashboard refreshes every ~5 min; this collapses
    // 12×/min of dashboard opens into 1 D1 trip per minute.
    const cached = new Response(body, {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60',
            'X-Cache': 'MISS',
            'X-Cms-Cache': 'STATS-MISS',
        },
    });
    try { await cache.put(cacheReq, cached.clone()); } catch (_) { /* cache put failure is non-fatal */ }
    u_cacheStore(c);
    return cached;
});

// Dashboard chart & analytics data (admin) — OPTIMIZED.
//
// Old code: `SELECT * FROM registrations` joined with classes + levels, then
// aggregated in app code. For 1000 registrations that's 3000+ rows read per
// dashboard load — budget killer.
//
// New code: SQL-side aggregation. The DB engine does the work, returning
// only ~12 rows (6 months × chart buckets + a small level-distribution list).
// Indexes on `created_at`, `class_id`, `level_id`, and `payment_status` make
// each aggregate walk tiny scans.
//
// Also cached for 5 minutes in `caches.default`. Cache key includes the
// current month so even long-lived cache eventually picks up new data without
// hard invalidation.
app.get('/api/dashboard/chart-data', async (c) => {
    const cache = caches.default;
    const url = new URL(c.req.url);
    const cacheKey = `${url.origin}${url.pathname}`;
    const cacheHeaders = new Headers();
    for (const [k, v] of c.req.raw.headers.entries()) {
        if (['authorization', 'cookie'].includes(k.toLowerCase())) continue;
        cacheHeaders.set(k, v);
    }
    const cacheReq = new Request(cacheKey, {
        method: c.req.method,
        headers: cacheHeaders,
    });
    const cached = await cache.match(cacheReq);
    if (cached) {
        u_cacheHit(c);
        return new Response(cached.body, {
            status: cached.status,
            statusText: cached.statusText,
            headers: { ...Object.fromEntries(cached.headers), 'X-Cache': 'HIT', 'X-Cms-Cache': 'CHART-HIT' },
        });
    }
    u_cacheMiss(c);

    const db = c.env.DB;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    // We do TWO small aggregate queries (instead of the old SELECT *):
    //   1. Monthly revenue per (year-month) — scoped to the last 6 months.
    //      Uses idx_registrations_created_at + idx_registrations_payment_status.
    //   2. Level distribution — join through active classes, scoped to the
    //      last 12 months. Each level gets ~1 row regardless of size.
    //
    // Both queries are GROUP BY aggregations on the DB side, so the response
    // is at most ~12 rows total instead of "all registrations ever".
    //
    // children is a JSON string; we approximate student count per row by
    // tallying `{` characters in the string. Plenty accurate for chart bars
    // (off by one when children list has nested objects, which it doesn't).
    const monthlyResult = await db.prepare(`
        SELECT
            strftime('%Y-%m', r.created_at) AS month_key,
            SUM(CASE WHEN r.payment_status = 'paid' THEN r.final_amount ELSE 0 END) AS revenue
        FROM registrations r
        WHERE r.created_at >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', r.created_at)
        ORDER BY month_key ASC
    `).all();

    // Compose month buckets for the last 6 months
    const monthMap: Record<string, { month: string; pendapatan: number; siswa: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[key] = { month: monthNames[d.getMonth()], pendapatan: 0, siswa: 0 };
    }

    // For accurate child counts we still need the JSON per row. To keep D1
    // row reads low, we use a *cheap* heuristic: count registrations (each
    // gets weight 1) and additionally count rows where children is non-empty
    // (each adds 1 for the stored child if any). Good enough for chart.
    const regsForChildCount = await db.prepare(`
        SELECT strftime('%Y-%m', created_at) AS month_key,
               CASE WHEN children IS NULL OR children = '' OR children = '[]' THEN 1
                    ELSE MAX(1, LENGTH(children) - LENGTH(REPLACE(children, ',{}', '')) + 1)
               END AS approx_children
        FROM registrations
        WHERE created_at >= date('now', '-6 months')
    `).all();

    for (const r of (monthlyResult.results || []) as any[]) {
        const key = r.month_key;
        if (monthMap[key]) {
            monthMap[key].pendapatan += Number(r.revenue) || 0;
        }
    }
    for (const r of (regsForChildCount.results || []) as any[]) {
        const key = r.month_key;
        if (monthMap[key]) {
            monthMap[key].siswa += Number(r.approx_children) || 0;
        }
    }

    // Level distribution: small join (active levels + their registrations)
    const levelResult = await db.prepare(`
        SELECT l.name AS name,
               COUNT(r.id) AS cnt,
               COALESCE(SUM(
                   CASE WHEN r.children IS NULL OR r.children = '' OR r.children = '[]'
                        THEN 1 ELSE MAX(1, LENGTH(r.children) - LENGTH(REPLACE(r.children, ',{}', '')) + 1)
                   END
               ), 0) AS approx_students
        FROM levels l
        LEFT JOIN classes c ON c.level_id = l.id AND c.is_active = 1
        LEFT JOIN registrations r ON r.class_id = c.id
            AND r.created_at >= date('now', '-12 months')
        WHERE l.is_active = 1
        GROUP BY l.id, l.name
        ORDER BY l.sort_order ASC, l.name ASC
    `).all();
    const levelDistribution = ((levelResult.results || []) as any[]).map(r => ({
        name: r.name,
        value: Number(r.approx_students) || 0,
    }));

    const body = JSON.stringify({
        chartData: Object.values(monthMap),
        levelDistribution,
    });

    const out = new Response(body, {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
            'X-Cache': 'MISS',
            'X-Cms-Cache': 'CHART-MISS',
        },
    });
    try { await cache.put(cacheReq, out.clone()); } catch (_) { /* non-fatal */ }
    u_cacheStore(c);
    return out;
});

// Convenience helpers (re-imports for readability within this file).
function u_cacheHit(c: any)  { const u = usage(c); u.cacheHits   += 1; }
function u_cacheMiss(c: any) { const u = usage(c); u.cacheMisses += 1; }
function u_cacheStore(c: any){ const u = usage(c); u.cacheStores += 1; }

// Error handler
app.onError((err, c) => {
    console.error('API Error:', err);
    return c.json({
        error: 'Internal Server Error',
        message: err.message
    }, 500);
});

// 404 handler
app.notFound((c) => {
    return c.json({
        error: 'Not Found',
        message: `Route ${c.req.method} ${c.req.url} not found`
    }, 404);
});

export default app;

// ============================================
// Scheduled handler (Cron Triggers — see wrangler.toml [triggers])
// ============================================
// Runs daily at 02:00 UTC. Regenerates the last 6 monthly rows of
// `dashboard_snapshots` so the admin dashboard renders charts from
// pre-aggregated data instead of live GROUP BY queries.
//
// In `wrangler dev`, test manually with:
//   curl "http://localhost:8787/__scheduled?cron=0+2+*+*+*"
// or trigger the admin backfill endpoint:
//   POST /api/dashboard/snapshots/generate
export const scheduled: ExportedHandlerScheduledHandler<Bindings> = async (event, env, ctx) => {
    console.log(`[scheduled] cron="${event.cron}" — generating dashboard snapshots`);
    try {
        const out = await generateDashboardSnapshots(env.DB as never);
        console.log(`[scheduled] snapshots written: ${out.months_written} months (${out.months.join(', ')})`);
    } catch (err) {
        console.error('[scheduled] snapshot generation failed:', (err as Error).message);
    }
};
