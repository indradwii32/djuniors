// ============================================
// Djuniors - Public GET Cache Middleware
// ============================================
//
// Cloudflare Cache API-backed cache for slow-changing public read endpoints
// (classes, levels, CMS content, CMS files, CMS icons).
//
// Strategy
// --------
// * Reads (`GET` only) become cacheable for `maxAge` seconds.
// * Cache key includes a per-domain version stamp pulled from KV at request
//   time, so any admin write can "bump the version" and instantly invalidate
//   every cached response for that domain without enumerating URLs.
// * Only HTTP 200 responses are stored (errors don't poison the cache).
// * `Cache-Control: public, max-age=N` is set on the response so the edge
//   can serve the cached copy to other POPs / non-CF callers.
//
// Invalidation
// ------------
// Admin write handlers should call `bumpCacheVersion(c.env, 'classes')` (etc.)
// AFTER the DB write succeeds. This writes once to KV (well under the 1k/day
// free-tier write limit) and makes all previously cached reads instantly
// miss on the next request.
//
// Domains (use these exact strings when bumping):
//   'classes' | 'levels' | 'cms' | 'cms-files' | 'cms-icons' | 'registrations'
// ============================================

import { Context, Next } from 'hono';
import { Bindings } from '../types';
import { countCacheHit, countCacheMiss } from './usage';

export type CacheDomain =
    | 'classes'
    | 'levels'
    | 'cms'
    | 'cms-files'
    | 'cms-icons'
    | 'registrations';

/** KV key for the per-domain cache version stamp. */
const versionKey = (domain: CacheDomain) => `cache:ver:${domain}`;

/**
 * Bump the cache version for a domain. All subsequent cached reads will miss
 * until the version is read again and cached at the new value. Safe to call
 * concurrently (KV last-write-wins is fine here — both writers just want a
 * fresh stamp).
 */
export async function bumpCacheVersion(env: Bindings, domain: CacheDomain): Promise<void> {
    try {
        await env.KV.put(versionKey(domain), String(Date.now()));
    } catch (err) {
        // Don't block the user's write on a cache-invalidation failure.
        console.warn(`[cache] bump ${domain} failed:`, (err as Error).message);
    }
}

/**
 * Read the current version stamp, falling back to a constant if KV read fails.
 * The fallback ensures reads still succeed (just bypass domain invalidation).
 */
async function readVersion(env: Bindings, domain: CacheDomain): Promise<string> {
    try {
        const v = await env.KV.get(versionKey(domain));
        return v || '0';
    } catch {
        return '0';
    }
}

/**
 * Build a Request whose URL is the public-origin URL of the inbound request
 * suffixed with `?v=<domain version>`. We can't mutate `c.req.url` directly
 * without affecting downstream route matching, so we synthesize a new one.
 */
function cacheKeyFor(c: Context<{ Bindings: Bindings }>, domain: CacheDomain, version: string): Request {
    const url = new URL(c.req.url);
    url.searchParams.set('__cv', version); // internal — not user-visible
    // Preserve the original path's other query params so we don't conflate
    // different filter combinations into one cache entry.
    return new Request(url.toString(), { method: 'GET', headers: c.req.raw.headers });
}

/**
 * Middleware factory. Pass the domain whose version controls invalidation.
 *
 * Usage:
 *   const cache = cacheMiddleware('classes', 300);
 *   classes.get('/', cache, async (c) => { ... })
 */
export function cacheMiddleware(domain: CacheDomain, maxAgeSeconds = 300) {
    return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
        // Only cache plain GETs with no Authorization header — we don't want
        // auth'd responses leaking across users.
        if (c.req.method !== 'GET' || c.req.header('Authorization')) {
            await next();
            return;
        }

        const version = await readVersion(c.env, domain);
        const cacheKey = cacheKeyFor(c, domain, version);

        // 1. Try cache
        const cache = caches.default;
        const hit = await cache.match(cacheKey);
        if (hit) {
            countCacheHit(c as any);
            // Forward cache status + age for debugging through `cf-cache-status` style header
            const headers = new Headers(hit.headers);
            headers.set('X-Cache', 'HIT');
            headers.set('X-Cache-Domain', domain);
            return new Response(hit.body, { status: hit.status, statusText: hit.statusText, headers });
        }
        countCacheMiss(c as any);

        // 2. Miss: run downstream, then capture
        await next();

        // 3. Store if the downstream produced a cacheable response
        const res = c.res;
        if (res && res.status === 200) {
            // Clone before mutating headers (Response bodies are single-use)
            const headers = new Headers(res.headers);
            headers.set('Cache-Control', `public, max-age=${maxAgeSeconds}`);
            headers.set('X-Cache', 'MISS');
            headers.set('X-Cache-Domain', domain);
            const cacheable = new Response(res.clone().body, {
                status: res.status,
                statusText: res.statusText,
                headers,
            });
            try {
                await cache.put(cacheKey, cacheable.clone());
            } catch (err) {
                console.warn('[cache] put failed:', (err as Error).message);
            }
            // Serve the SAME annotated response to the client so a cold miss
            // also carries Cache-Control / X-Cache: MISS headers (the stored
            // copy is only reachable on subsequent requests).
            c.res = cacheable;
        }
    };
}
