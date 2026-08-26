// ============================================
// Djuniors - CMS (Content Management System) Routes
// ============================================

import { Hono } from 'hono';
import { Bindings, Variables, CMSContent, CMSSetting } from '../types';
import { adminAuthMiddleware } from '../middleware/auth';
import { cacheMiddleware, bumpCacheVersion } from '../middleware/cache';
import {
    getSettingsCached,
    putSettingsCached,
    getPublicAllCached,
    putPublicAllCached,
    getSectionCached,
    putSectionCached,
    invalidateCmsCache,
} from '../middleware/cms-kv';

const cms = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const cache = cacheMiddleware('cms', 300);

// Helper to build key-value map from array of items
function buildDataMap(items: CMSContent[]): Record<string, any> {
    const map: Record<string, any> = {};
    for (const item of items) {
        if (item.type === 'json') {
            try {
                map[item.key] = JSON.parse(item.value);
            } catch {
                map[item.key] = item.value;
            }
        } else {
            map[item.key] = item.value;
        }
    }
    return map;
}

// ============================================
// CMS Settings Endpoints
// ============================================

// 1. Get all CMS settings (public)
// Reads from KV first; on miss queries D1 and writes back to KV with TTL.
cms.get('/settings', cache, async (c) => {
    try {
        const cached = await getSettingsCached(c.env);
        if (cached) {
            // Mark the response as KV-warm for easy verification.
            c.header('X-Cms-Cache', 'KV-HIT');
            return c.json(cached);
        }

        const result = await c.env.DB.prepare(
            'SELECT * FROM cms_settings ORDER BY category ASC, key ASC'
        ).all();

        const items = (result.results || []) as unknown as CMSSetting[];
        const settingsMap: Record<string, string> = {};
        for (const item of items) {
            settingsMap[item.key] = item.value;
        }

        const payload = {
            success: true,
            settings: items,
            data: settingsMap
        };
        await putSettingsCached(c.env, payload);
        c.header('X-Cms-Cache', 'KV-MISS');
        return c.json(payload);
    } catch (error: any) {
        return c.json({ error: 'Failed to fetch CMS settings', message: error.message }, 500);
    }
});

// 2. Bulk update CMS settings (admin only)
cms.put('/settings/bulk', adminAuthMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const settings = Array.isArray(body) ? body : (body.settings || []);

        if (!Array.isArray(settings) || settings.length === 0) {
            return c.json({ error: 'Invalid settings array' }, 400);
        }

        const stmts = settings.map((s: { key: string; value: string; category?: string }) => {
            const id = `set-${crypto.randomUUID().slice(0, 8)}`;
            return c.env.DB.prepare(`
                INSERT INTO cms_settings (id, key, value, category, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(key) DO UPDATE SET
                    value = excluded.value,
                    category = COALESCE(excluded.category, cms_settings.category),
                    updated_at = CURRENT_TIMESTAMP
            `).bind(id, s.key, String(s.value ?? ''), s.category || 'general');
        });

        await c.env.DB.batch(stmts);
        await bumpCacheVersion(c.env, 'cms');
        await invalidateCmsCache(c.env, null); // wipe all: settings + public/all
        return c.json({ success: true, count: settings.length });
    } catch (error: any) {
        return c.json({ error: 'Failed to bulk update settings', message: error.message }, 500);
    }
});

// 3. Update single CMS setting by key (admin only)
cms.put('/settings/:key', adminAuthMiddleware, async (c) => {
    try {
        const key = c.req.param('key');
        const body = await c.req.json();
        const { value, category } = body;

        if (value === undefined) {
            return c.json({ error: 'Missing required field: value is required' }, 400);
        }

        const id = `set-${crypto.randomUUID().slice(0, 8)}`;
        await c.env.DB.prepare(`
            INSERT INTO cms_settings (id, key, value, category, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                category = COALESCE(excluded.category, cms_settings.category),
                updated_at = CURRENT_TIMESTAMP
        `).bind(id, key, String(value), category || 'general').run();

        await bumpCacheVersion(c.env, 'cms');
        await invalidateCmsCache(c.env, []);
        return c.json({ success: true, key });
    } catch (error: any) {
        return c.json({ error: 'Failed to update setting', message: error.message }, 500);
    }
});

// ============================================
// CMS Content Endpoints
// ============================================

// Public endpoint to get all CMS content grouped by section
// Reads from KV first; on miss queries D1 and writes back to KV with TTL.
cms.get('/public/all', cache, async (c) => {
    try {
        const cached = await getPublicAllCached(c.env);
        if (cached) {
            c.header('X-Cms-Cache', 'KV-HIT');
            return c.json(cached);
        }

        const result = await c.env.DB.prepare(
            'SELECT * FROM cms_content ORDER BY section ASC, key ASC'
        ).all();

        const items = (result.results || []) as unknown as CMSContent[];
        const sections: Record<string, Record<string, any>> = {};

        for (const item of items) {
            if (!sections[item.section]) {
                sections[item.section] = {};
            }
            if (item.type === 'json') {
                try {
                    sections[item.section][item.key] = JSON.parse(item.value);
                } catch {
                    sections[item.section][item.key] = item.value;
                }
            } else {
                sections[item.section][item.key] = item.value;
            }
        }

        const payload = {
            success: true,
            sections,
            items,
            data: buildDataMap(items)
        };
        await putPublicAllCached(c.env, payload);
        c.header('X-Cms-Cache', 'KV-MISS');
        return c.json(payload);
    } catch (error: any) {
        return c.json({ error: 'Failed to fetch public CMS content', message: error.message }, 500);
    }
});

// 4. Get all CMS content (admin)
cms.get('/', adminAuthMiddleware, async (c) => {
    try {
        const result = await c.env.DB.prepare(
            'SELECT * FROM cms_content ORDER BY section ASC, key ASC'
        ).all();

        const items = (result.results || []) as unknown as CMSContent[];
        return c.json({
            success: true,
            items,
            data: buildDataMap(items)
        });
    } catch (error: any) {
        return c.json({ error: 'Failed to fetch CMS content', message: error.message }, 500);
    }
});

// 5. Bulk create/update CMS content (admin only)
cms.put('/bulk', adminAuthMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const items = Array.isArray(body) ? body : (body.items || []);

        if (!Array.isArray(items) || items.length === 0) {
            return c.json({ error: 'Invalid items array' }, 400);
        }

        const stmts = items.map((item: { id?: string; section: string; key: string; value: any; type?: string }) => {
            const id = item.id || `cms-${crypto.randomUUID().slice(0, 8)}`;
            const valStr = typeof item.value === 'object' && item.value !== null ? JSON.stringify(item.value) : String(item.value ?? '');
            const itemType = item.type || (typeof item.value === 'object' ? 'json' : 'text');

            return c.env.DB.prepare(`
                INSERT INTO cms_content (id, section, key, value, type, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(section, key) DO UPDATE SET
                    value = excluded.value,
                    type = excluded.type,
                    updated_at = CURRENT_TIMESTAMP
            `).bind(id, item.section, item.key, valStr, itemType);
        });

        await c.env.DB.batch(stmts);
        await bumpCacheVersion(c.env, 'cms');
        // Bulk may touch many sections — collect unique sections to invalidate per-section.
        const sections = Array.from(new Set(items.map((it: { section: string }) => it.section)));
        await invalidateCmsCache(c.env, sections);
        return c.json({ success: true, count: items.length });
    } catch (error: any) {
        return c.json({ error: 'Failed to bulk update CMS content', message: error.message }, 500);
    }
});

// 6. Create or Upsert CMS Content (admin only)
cms.post('/', adminAuthMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const { id: customId, section, key, value, type } = body;

        if (!section || !key) {
            return c.json({ error: 'Missing required fields: section and key are required' }, 400);
        }

        const id = customId || `cms-${crypto.randomUUID().slice(0, 8)}`;
        const valStr = typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '');
        const itemType = type || (typeof value === 'object' ? 'json' : 'text');

        await c.env.DB.prepare(`
            INSERT INTO cms_content (id, section, key, value, type, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(section, key) DO UPDATE SET
                value = excluded.value,
                type = excluded.type,
                updated_at = CURRENT_TIMESTAMP
        `).bind(id, section, key, valStr, itemType).run();

        await bumpCacheVersion(c.env, 'cms');
        await invalidateCmsCache(c.env, [section]);
        return c.json({ success: true, id, section, key }, 201);
    } catch (error: any) {
        return c.json({ error: 'Failed to create CMS content', message: error.message }, 500);
    }
});

// 7. Get content by section (public)
// Reads from KV first; on miss queries D1 and writes back to KV with TTL.
cms.get('/:section', cache, async (c) => {
    try {
        const section = c.req.param('section');
        if (!section) {
            return c.json({ error: 'Missing section parameter' }, 400);
        }

        const cached = await getSectionCached(c.env, section);
        if (cached) {
            c.header('X-Cms-Cache', 'KV-HIT');
            return c.json(cached);
        }

        const result = await c.env.DB.prepare(
            'SELECT * FROM cms_content WHERE section = ? ORDER BY key ASC'
        ).bind(section).all();

        const items = (result.results || []) as unknown as CMSContent[];
        const dataMap = buildDataMap(items);

        const payload = {
            success: true,
            section,
            items,
            data: dataMap,
            ...dataMap
        };
        await putSectionCached(c.env, section, payload);
        c.header('X-Cms-Cache', 'KV-MISS');
        return c.json(payload);
    } catch (error: any) {
        return c.json({ error: 'Failed to fetch section content', message: error.message }, 500);
    }
});

// 8. Update CMS content by ID (admin only)
cms.put('/:id', adminAuthMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { value, type, section, key } = body;

        const existing = await c.env.DB.prepare('SELECT * FROM cms_content WHERE id = ?').bind(id).first();
        if (!existing) {
            return c.json({ error: 'Content item not found' }, 404);
        }

        const valStr = typeof value === 'object' && value !== null ? JSON.stringify(value) : (value !== undefined ? String(value) : null);

        await c.env.DB.prepare(`
            UPDATE cms_content SET
                value = COALESCE(?, value),
                type = COALESCE(?, type),
                section = COALESCE(?, section),
                key = COALESCE(?, key),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).bind(
            valStr,
            type !== undefined ? type : null,
            section !== undefined ? section : null,
            key !== undefined ? key : null,
            id
        ).run();

        await bumpCacheVersion(c.env, 'cms');
        // Invalidate both the original section and any target section (in case section was moved).
        const sectionsToInvalidate = Array.from(
            new Set([(existing as any).section, section].filter(Boolean))
        ) as string[];
        await invalidateCmsCache(c.env, sectionsToInvalidate);
        return c.json({ success: true, id });
    } catch (error: any) {
        return c.json({ error: 'Failed to update CMS content', message: error.message }, 500);
    }
});

// 9. Delete CMS content by ID (admin only)
cms.delete('/:id', adminAuthMiddleware, async (c) => {
    try {
        const id = c.req.param('id');

        // Look up first so we know which section's KV key to invalidate.
        const existing = await c.env.DB.prepare('SELECT section FROM cms_content WHERE id = ?').bind(id).first();
        const result = await c.env.DB.prepare('DELETE FROM cms_content WHERE id = ?').bind(id).run();

        if (result.meta?.changes === 0) {
            return c.json({ error: 'Content item not found' }, 404);
        }

        await bumpCacheVersion(c.env, 'cms');
        if (existing && (existing as any).section) {
            await invalidateCmsCache(c.env, [(existing as any).section]);
        } else {
            // Fall back: nothing recorded. Drop the public bundle so the next read
            // recomputes from D1 — section keys TTL out within the hour.
            await invalidateCmsCache(c.env, []);
        }
        return c.json({ success: true, id });
    } catch (error: any) {
        return c.json({ error: 'Failed to delete CMS content', message: error.message }, 500);
    }
});

export default cms;
