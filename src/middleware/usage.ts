// ============================================
// Djuniors - Usage metrics middleware
// ============================================
// Tracks per-request D1/KV/Cache-API calls and reports them as response
// headers (`X-D1-Reads`, `X-KV-Reads`, `X-KV-Writes`, `X-Cache-API`).
// Designed for diagnostics + production monitoring. Update COUNT_THRESHOLD
// to emit `X-Hot-Path` warnings.
//
// No external service required — the admin dashboard reads these headers
// to display budget consumption in real time.
import { Context, Next } from 'hono';
import { Bindings } from '../types';

export interface UsageCounters {
    d1Reads: number;
    d1Writes: number;
    d1RowsRead: number;
    kvReads: number;
    kvWrites: number;
    kvDeletes: number;
    cacheHits: number;
    cacheMisses: number;
    cacheStores: number;
    r2Reads: number;
}

// Per-request counters are stored in a module-level WeakMap keyed by the
// Hono Context object. This sidesteps `c.var` entirely: the same Context
// reference always maps to the same counters object for the lifetime of the
// request, so increments performed inside DB/KV/R2 proxy closures are visible
// when usageTracker re-fetches the counters after `await next()`.
const counters = new WeakMap<object, UsageCounters>();

const createEmpty = (): UsageCounters => ({
    d1Reads: 0,
    d1Writes: 0,
    d1RowsRead: 0,
    kvReads: 0,
    kvWrites: 0,
    kvDeletes: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheStores: 0,
    r2Reads: 0,
});

export const usage = (c: Context<{ Bindings: Bindings; Variables: any }>): UsageCounters => {
    let u = counters.get(c);
    if (!u) {
        u = createEmpty();
        counters.set(c, u);
    }
    return u;
};

/**
 * Middleware that wraps the handler and emits usage headers + (optional)
 * structured log. Attach FIRST so it can wrap everything.
 *
 *   X-D1-Reads       — number of D1 .first() / .all() / .run() calls
 *   X-D1-Writes      — number of .run() that mutated rows
 *   X-KV-Reads       — KV .get() calls
 *   X-KV-Writes      — KV .put() calls
 *   X-KV-Deletes     — KV .delete() calls
 *   X-Cache-Hits     — Cache API matches
 *   X-Cache-Misses   — Cache API non-matches
 *   X-R2-Reads       — R2 .get() calls
 */
export const usageTracker = async (c: Context<{ Bindings: Bindings; Variables: any }>, next: Next) => {
    usage(c); // initialize
    const t0 = Date.now();
    await next();
    const u = usage(c);
    const ms = Date.now() - t0;
    c.header('X-D1-Reads', String(u.d1Reads));
    c.header('X-D1-Writes', String(u.d1Writes));
    c.header('X-KV-Reads', String(u.kvReads));
    c.header('X-KV-Writes', String(u.kvWrites));
    c.header('X-KV-Deletes', String(u.kvDeletes));
    c.header('X-Cache-Hits', String(u.cacheHits));
    c.header('X-Cache-Misses', String(u.cacheMisses));
    c.header('X-Cache-Stores', String(u.cacheStores));
    c.header('X-R2-Reads', String(u.r2Reads));
    c.header('X-Response-Time-Ms', String(ms));

    // Fold into the daily burn-rate accumulator; flush to KV after the
    // response is sent (waitUntil) at most every FLUSH_INTERVAL_MS.
    recordDailyUsage(u);
    try {
        const waitUntil = (c as any).executionCtx?.waitUntil?.bind((c as any).executionCtx);
        await maybeFlushDailyUsage(c.env, waitUntil);
    } catch {
        /* monitoring must never break the request */
    }

    // Optional: log hot paths for offline analysis. Disabled by default.
    // Enable via `wrangler secret put USAGE_LOG_ENABLED=true` if needed.
    if ((c.env as any).USAGE_LOG_ENABLED === 'true') {
        // eslint-disable-next-line no-console
        console.log(`[usage] ${c.req.method} ${c.req.path} d1=${u.d1Reads}/${u.d1Writes} kv=${u.kvReads}/${u.kvWrites} cache=${u.cacheHits}/${u.cacheMisses} ${ms}ms`);
    }
};

/**
 * Wrapper for `c.env.DB` that automatically counts calls.
 *
 * Returns a Proxy: every prepare() produces a wrapped statement whose
 * .first() / .all() / .run() / .bind() calls are counted.
 *
 * NOTE: we must never assign bookkeeping properties on the returned Proxy
 * (e.g. `wrapped.__instrumented = true`). A Proxy without a `set` trap
 * forwards writes to the TARGET — the runtime's shared DB binding object —
 * which pollutes it across requests and breaks instrumentation (this was
 * the counter-sync bug). A marker is instead exposed through the `get` trap
 * (`__isInstrumented`) which never touches the target.
 *
 * NOTE 2: `.bind()` returns a NEW statement object — if we didn't re-wrap
 * it, every `.bind(...).first()` call would bypass the counters entirely.
 */
const wrapStmt = (stmt: any, u: UsageCounters): any => {
    return new Proxy(stmt, {
        get(stmtTarget, stmtProp: string | symbol) {
            const m = (stmtTarget as any)[stmtProp];
            if (stmtProp === 'bind' && typeof m === 'function') {
                return (...bindArgs: any[]) => wrapStmt(m.apply(stmtTarget, bindArgs), u);
            }
            if (stmtProp === 'run' && typeof m === 'function') {
                return async (...runArgs: any[]) => {
                    u.d1Reads += 1;
                    try {
                        const out = await m.apply(stmtTarget, runArgs);
                        // D1 rows-written count lives on result.meta.changes
                        try {
                            const changes = out?.meta?.changes ?? 0;
                            if (changes > 0) u.d1Writes += changes;
                            u.d1RowsRead += Number(out?.meta?.rows_read) || 0;
                        } catch (_) { /* meta missing — ignore */ }
                        return out;
                    } catch (e) {
                        u.d1Reads -= 1; // call failed — don't count
                        throw e;
                    }
                };
            }
            if ((stmtProp === 'first' || stmtProp === 'all') && typeof m === 'function') {
                return async (...qArgs: any[]) => {
                    u.d1Reads += 1;
                    try {
                        const out = await m.apply(stmtTarget, qArgs);
                        u.d1RowsRead += Number(out?.meta?.rows_read) || 0;
                        return out;
                    } catch (e) {
                        u.d1Reads -= 1;
                        throw e;
                    }
                };
            }
            return m;
        },
    });
};

export const instrumentDB = (c: Context<{ Bindings: Bindings; Variables: any }>) => {
    const u = usage(c);
    const env = c.env as any;
    const realDB = env.__raw ? env.__raw.DB : env.DB;
    if (!realDB) return realDB;

    const wrapped: any = new Proxy(realDB, {
        get(target, prop: string | symbol) {
            if (prop === '__isInstrumented') return true; // marker via trap — never written to target
            const value = (target as any)[prop];
            if (prop === 'prepare' && typeof value === 'function') {
                return (...args: any[]) => wrapStmt(value.apply(target, args), u);
            }
            // Direct .exec() / .batch() — count once for batch
            if (prop === 'exec' && typeof value === 'function') {
                return async (sql: string, ...rest: any[]) => {
                    u.d1Reads += 1;
                    try {
                        return await value.call(target, sql, ...rest);
                    } catch (e) {
                        u.d1Reads -= 1;
                        throw e;
                    }
                };
            }
            if (prop === 'batch' && typeof value === 'function') {
                return async (stmts: any[]) => {
                    u.d1Reads += stmts.length;
                    try {
                        return await value.call(target, stmts);
                    } catch (e) {
                        u.d1Reads -= stmts.length;
                        throw e;
                    }
                };
            }
            return value;
        },
    });
    return wrapped;
};

/**
 * Wrapper for `c.env.KV` that counts reads/writes/deletes automatically.
 */
export const instrumentKV = (c: Context<{ Bindings: Bindings; Variables: any }>) => {
    const u = usage(c);
    const env = c.env as any;
    const realKV = env.__raw ? env.__raw.KV : env.KV;
    if (!realKV) return realKV;

    const wrapped: any = new Proxy(realKV, {
        get(target, prop: string | symbol) {
            if (prop === '__isInstrumented') return true; // marker via trap — never written to target
            const value = (target as any)[prop];
            if (prop === 'get' && typeof value === 'function') {
                return async (...args: any[]) => {
                    u.kvReads += 1;
                    return value.apply(target, args);
                };
            }
            if (prop === 'getWithMetadata' && typeof value === 'function') {
                return async (...args: any[]) => {
                    u.kvReads += 1;
                    return value.apply(target, args);
                };
            }
            if (prop === 'put' && typeof value === 'function') {
                return async (...args: any[]) => {
                    u.kvWrites += 1;
                    return value.apply(target, args);
                };
            }
            if (prop === 'delete' && typeof value === 'function') {
                return async (...args: any[]) => {
                    u.kvDeletes += 1;
                    return value.apply(target, args);
                };
            }
            if (prop === 'list' && typeof value === 'function') {
                return async (...args: any[]) => {
                    u.kvReads += 1;
                    return value.apply(target, args);
                };
            }
            return value;
        },
    });
    return wrapped;
};

/**
 * Wrapper for `c.env.R2` that counts reads automatically.
 */
export const instrumentR2 = (c: Context<{ Bindings: Bindings; Variables: any }>) => {
    const u = usage(c);
    const env = c.env as any;
    const realR2 = env.__raw ? env.__raw.R2 : env.R2;
    if (!realR2) return realR2;

    const wrapped: any = new Proxy(realR2, {
        get(target, prop: string | symbol) {
            if (prop === '__isInstrumented') return true; // marker via trap — never written to target
            const value = (target as any)[prop];
            if (prop === 'get' && typeof value === 'function') {
                return async (...args: any[]) => {
                    u.r2Reads += 1;
                    return value.apply(target, args);
                };
            }
            if (prop === 'head' && typeof value === 'function') {
                return async (...args: any[]) => {
                    u.r2Reads += 1;
                    return value.apply(target, args);
                };
            }
            return value;
        },
    });
    (wrapped as any).__instrumented = true;
    return wrapped;
};

/**
 * Mutator that lets middleware/cache.ts bump cache hits/misses.
 * Use freely — these counters are per-request only.
 */
export const countCacheHit  = (c: Context, by = 1) => { usage(c).cacheHits   += by; };
export const countCacheMiss = (c: Context, by = 1) => { usage(c).cacheMisses += by; };
export const countCacheStore= (c: Context, by = 1) => { usage(c).cacheStores += by; };

// ============================================
// Daily usage aggregation (burn-rate monitoring)
// ============================================
// Per-request counters are ephemeral. To monitor free-tier budget burn rate
// (D1 rows read/day, KV writes/day, …) we accumulate them in-memory per
// isolate and flush to a single KV key periodically.
//
// Budget math (KV free tier: 100k reads/day, 1k writes/day):
//   - Flush at most every 3 minutes → ≤ 480 writes/day worst case (isolate
//     handling traffic all day) — comfortably under the 1k limit. In
//     practice far fewer, since flushes only happen on traffic.
//   - The admin usage endpoint reads exactly 1 KV key.
//
// Multi-isolate caveat (accepted): concurrent isolates flushing the same KV
// key use read-merge-write, which can lose a small slice of increments under
// racing writes. For burn-rate *monitoring* this precision is more than
// enough — the alternative (Durable Objects) is not available on free tier.

export interface DailyUsage {
    requests: number;
    d1Reads: number;
    d1Writes: number;
    d1RowsRead: number;
    kvReads: number;
    kvWrites: number;
    kvDeletes: number;
    cacheHits: number;
    cacheMisses: number;
    cacheStores: number;
    r2Reads: number;
}

const DAILY_USAGE_KV_KEY = 'usage:daily';
const FLUSH_INTERVAL_MS = 3 * 60 * 1000; // flush at most every 3 minutes

// In-memory accumulator for THIS isolate. Keyed by UTC date string so a
// long-lived isolate naturally rolls over at midnight UTC.
let acc: { day: string; usage: DailyUsage; dirty: boolean; lastFlush: number } | null = null;

const dayKey = (d = new Date()): string => d.toISOString().slice(0, 10);

const emptyDaily = (): DailyUsage => ({
    requests: 0,
    d1Reads: 0,
    d1Writes: 0,
    d1RowsRead: 0,
    kvReads: 0,
    kvWrites: 0,
    kvDeletes: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheStores: 0,
    r2Reads: 0,
});

/**
 * Fold a finished request's counters into the isolate's daily accumulator.
 * Called from usageTracker after `await next()` — cheap (in-memory only).
 */
export const recordDailyUsage = (u: UsageCounters): void => {
    const today = dayKey();
    if (!acc || acc.day !== today) {
        acc = { day: today, usage: emptyDaily(), dirty: false, lastFlush: 0 };
    }
    acc.usage.requests += 1;
    acc.usage.d1Reads += u.d1Reads;
    acc.usage.d1Writes += u.d1Writes;
    acc.usage.d1RowsRead += u.d1RowsRead;
    acc.usage.kvReads += u.kvReads;
    acc.usage.kvWrites += u.kvWrites;
    acc.usage.kvDeletes += u.kvDeletes;
    acc.usage.cacheHits += u.cacheHits;
    acc.usage.cacheMisses += u.cacheMisses;
    acc.usage.cacheStores += u.cacheStores;
    acc.usage.r2Reads += u.r2Reads;
    acc.dirty = true;
};

/**
 * Read-merge-write the isolate's accumulator into the shared KV record.
 * Non-fatal on any error (monitoring must never break the request path).
 * @param waitUntil executionCtx.waitUntil — flush runs after response sent
 */
export const maybeFlushDailyUsage = async (
    env: Bindings,
    waitUntil?: (p: Promise<unknown>) => void
): Promise<void> => {
    if (!acc || !acc.dirty) return;
    const now = Date.now();
    if (now - acc.lastFlush < FLUSH_INTERVAL_MS) return;

    // Claim the flush slot immediately (prevents concurrent flushes in this
    // isolate double-spending the same window).
    acc.lastFlush = now;
    acc.dirty = false;
    const snapshot = acc.usage;
    const day = acc.day;

    const flush = async () => {
        try {
            const kv = (env as any).__raw?.KV ?? env.KV;
            if (!kv) return;
            const raw = await kv.get(DAILY_USAGE_KV_KEY);
            let stored: Record<string, DailyUsage> = {};
            try { stored = raw ? JSON.parse(raw) : {}; } catch { stored = {}; }
            const cur = stored[day] ?? emptyDaily();
            for (const k of Object.keys(cur) as (keyof DailyUsage)[]) {
                cur[k] = (cur[k] ?? 0) + (snapshot[k] ?? 0);
            }
            stored[day] = cur;
            // Keep only the last 14 days to bound the payload size.
            const days = Object.keys(stored).sort();
            for (const d of days.slice(0, Math.max(0, days.length - 14))) delete stored[d];
            await kv.put(DAILY_USAGE_KV_KEY, JSON.stringify(stored), { expirationTtl: 30 * 24 * 3600 });
        } catch {
            /* best-effort: monitoring must never throw */
        }
    };

    if (waitUntil) waitUntil(flush());
    else await flush();
};

/**
 * Read the aggregated daily usage history from KV (admin endpoint helper).
 */
export const getDailyUsageHistory = async (env: Bindings): Promise<Record<string, DailyUsage>> => {
    try {
        const kv = (env as any).__raw?.KV ?? env.KV;
        if (!kv) return {};
        const raw = await kv.get(DAILY_USAGE_KV_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
};
