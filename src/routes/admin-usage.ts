// ============================================
// Djuniors - Admin Usage / Burn-Rate Endpoint
// ============================================
// Reports the aggregated daily usage counters (D1 reads/rows, KV ops,
// cache hit-rate, R2 reads) that the usage middleware accumulates per
// isolate and flushes to KV (key `usage:daily`, see middleware/usage.ts).
//
// One KV read per call — admin-only, deliberately NOT cached (freshness
// matters more than the negligible read cost here).
//
// Free-tier budgets (Cloudflare Workers free plan) are embedded so the
// dashboard can render % of budget consumed without extra config.

import { Hono } from 'hono';
import { Bindings } from '../types';
import { adminAuthMiddleware } from '../middleware/auth';
import { getDailyUsageHistory, DailyUsage } from '../middleware/usage';

const adminUsage = new Hono<{ Bindings: Bindings }>();

// Cloudflare free-tier daily limits used for the burn-rate gauges.
export const FREE_TIER_LIMITS = {
    requests: 100_000,        // Workers requests/day
    d1RowsRead: 5_000_000,    // D1 rows read/day
    d1Writes: 100_000,        // D1 rows written/day
    kvReads: 100_000,         // KV reads/day
    kvWrites: 1_000,          // KV writes/day
    r2Reads: 10_000_000,      // R2 class A+B ops/day (generous umbrella)
};

const pct = (used: number, limit: number): number =>
    limit > 0 ? Math.round((used / limit) * 1000) / 10 : 0;

adminUsage.get('/', adminAuthMiddleware, async (c) => {
    const history = await getDailyUsageHistory(c.env);

    // Days sorted ascending; today is the last entry (if present).
    const days = Object.keys(history).sort();
    const todayKey = new Date().toISOString().slice(0, 10);
    const today: DailyUsage = history[todayKey] ?? {
        requests: 0, d1Reads: 0, d1Writes: 0, d1RowsRead: 0,
        kvReads: 0, kvWrites: 0, kvDeletes: 0,
        cacheHits: 0, cacheMisses: 0, cacheStores: 0, r2Reads: 0,
    };

    const totalCacheLookups = today.cacheHits + today.cacheMisses;
    const cacheHitRate = totalCacheLookups > 0
        ? Math.round((today.cacheHits / totalCacheLookups) * 1000) / 10
        : null;

    // Burn-rate alert: >80% of any budget consumed → warning header.
    const budget = {
        requests:      pct(today.requests, FREE_TIER_LIMITS.requests),
        d1RowsRead:    pct(today.d1RowsRead, FREE_TIER_LIMITS.d1RowsRead),
        d1Writes:      pct(today.d1Writes, FREE_TIER_LIMITS.d1Writes),
        kvReads:       pct(today.kvReads, FREE_TIER_LIMITS.kvReads),
        kvWrites:      pct(today.kvWrites + today.kvDeletes, FREE_TIER_LIMITS.kvWrites),
        r2Reads:       pct(today.r2Reads, FREE_TIER_LIMITS.r2Reads),
    };
    const worst = Math.max(...Object.values(budget));
    if (worst >= 80) {
        c.header('X-Budget-Warning', `${worst}%`);
    }

    return c.json({
        success: true,
        today: todayKey,
        usage: today,
        cacheHitRate,
        budgetPercent: budget,
        limits: FREE_TIER_LIMITS,
        history: days.map((d) => ({ day: d, ...history[d] })),
    });
});

export default adminUsage;
