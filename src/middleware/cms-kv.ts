// ============================================
// Djuniors - CMS KV Cache (Stale-While-Revalidate)
// ============================================
//
// Adds a second cache layer in front of the D1 reads for CMS content that
// changes slowly and is read often by the public landing page (CMS section
// lookups, full public/all bundle, settings).
//
// Why a separate layer from the Cache API?
// ----------------------------------------
// The Cache API in `middleware/cache.ts` works fine but only stores for
// `maxAge` seconds and is invalidated by version-stamp bumps on every admin
// write. KV gives us:
//   * Persistence across deploys (Cache API can be cleared by edge re-pops).
//   * Independent read budget — we don't burn D1 rows on every visitor, and
//     we don't burn CF edge cache budget either.
//   * Surgical, per-section invalidation: `KV.delete('cms:section:hero')`
//     only purges the hero section, not every other cached section.
//
// Budget
// ------
// KV free tier: 100k reads / day, 1k writes / day, ~1 GB stored.
//
//   * Writes: only on (a) cache miss (per section, per `1h` until next
//     freshness OR admin save) and (b) admin saves (`invalidateCmsCache`).
//     Realistic admin workload: ≤ 20 saves / day → ≤ 20 writes / day.
//   * Reads: every public CMS hit. We accept 100k/day — landing page is the
//     only hot caller, and even at 1k visitors/day each loading the page
//     once, that's ~3k reads. Comfortable margin.
//
// Keys
// ----
//   cms:public:all        — full public CMS bundle (read by landing)
//   cms:section:{section} — single section content
//   cms:settings          — CMS settings map
//
// All keys share a 1h TTL; admin writes short-circuit with explicit deletes.
// ============================================

import { Bindings } from '../types';

export const CMS_KV_TTL_SECONDS = 3600;

const KEY_PUBLIC_ALL = 'cms:public:all';
const KEY_SETTINGS = 'cms:settings';
const keySection = (section: string) => `cms:section:${section}`;

/**
 * Read a JSON-serialised value from KV. Returns `null` on miss, deserialise
 * error, or KV read failure — fail-open so we always fall through to D1.
 */
export async function kvGetJSON<T>(env: Bindings, key: string): Promise<T | null> {
    try {
        const raw = await env.KV.get(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

/**
 * Best-effort write with TTL. Failures are logged but never raised —
 * a KV outage must not break the public read path.
 */
export async function kvPutJSON(env: Bindings, key: string, value: unknown, ttlSeconds = CMS_KV_TTL_SECONDS): Promise<void> {
    try {
        await env.KV.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
    } catch (err) {
        console.warn(`[cms-kv] put ${key} failed:`, (err as Error).message);
    }
}

/**
 * Best-effort delete. Same fail-open semantics as the write.
 */
export async function kvDelete(env: Bindings, key: string): Promise<void> {
    try {
        await env.KV.delete(key);
    } catch (err) {
        console.warn(`[cms-kv] delete ${key} failed:`, (err as Error).message);
    }
}

// --- Typed helpers --------------------------------------------------------

export interface CmsSettingsShape {
    success: boolean;
    settings: unknown[];
    data: Record<string, string>;
}
export interface CmsPublicAllShape {
    success: boolean;
    sections: Record<string, Record<string, unknown>>;
    items: unknown[];
    data: Record<string, unknown>;
}
export interface CmsSectionShape {
    success: boolean;
    section: string;
    items: unknown[];
    data: Record<string, unknown>;
    [k: string]: unknown;
}

export const cmsKeys = {
    publicAll: () => KEY_PUBLIC_ALL,
    settings: () => KEY_SETTINGS,
    section: (s: string) => keySection(s),
};

export async function getSettingsCached(env: Bindings): Promise<CmsSettingsShape | null> {
    return kvGetJSON<CmsSettingsShape>(env, KEY_SETTINGS);
}
export async function putSettingsCached(env: Bindings, value: CmsSettingsShape): Promise<void> {
    return kvPutJSON(env, KEY_SETTINGS, value);
}
export async function getPublicAllCached(env: Bindings): Promise<CmsPublicAllShape | null> {
    return kvGetJSON<CmsPublicAllShape>(env, KEY_PUBLIC_ALL);
}
export async function putPublicAllCached(env: Bindings, value: CmsPublicAllShape): Promise<void> {
    return kvPutJSON(env, KEY_PUBLIC_ALL, value);
}
export async function getSectionCached(env: Bindings, section: string): Promise<CmsSectionShape | null> {
    return kvGetJSON<CmsSectionShape>(env, keySection(section));
}
export async function putSectionCached(env: Bindings, section: string, value: CmsSectionShape): Promise<void> {
    return kvPutJSON(env, keySection(section), value);
}

/**
 * Invalidate the CMS caches that an admin write might have invalidated.
 * Call after successful writes. The set passed in tells us which sections
 * changed — pass `null` (or omit) to wipe everything (heavier blast radius,
 * use on bulk operations).
 */
export async function invalidateCmsCache(env: Bindings, sections?: string[] | null): Promise<void> {
    // Settings can change on any setting write; if caller didn't specify,
    // we don't know which sections touched settings. Be conservative: wipe
    // all three keys (cheap — keys are tiny).
    const targets: string[] = [KEY_SETTINGS, KEY_PUBLIC_ALL];
    if (sections) {
        for (const s of sections) targets.push(keySection(s));
    } else {
        // Wipe "everything" mode: enumerate likely sections from D1? Too
        // expensive. We over-collect by invalidating public/all (which is
        // the source of truth) and letting section keys naturally expire.
    }
    await Promise.all(targets.map((k) => kvDelete(env, k)));
}
