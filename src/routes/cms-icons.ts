// ============================================
// Djuniors - CMS SVG Icons Routes
// ============================================

import { Hono } from 'hono';
import { Bindings, Variables, CMSIcon } from '../types';
import { adminAuthMiddleware } from '../middleware/auth';
import { cacheMiddleware, bumpCacheVersion } from '../middleware/cache';

const cmsIcons = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const cache = cacheMiddleware('cms-icons', 300);

// Helper to format icon record
function formatCmsIcon(row: any): CMSIcon {
    if (!row) return row;
    return {
        ...row,
        is_active: Boolean(row.is_active)
    };
}

/**
 * 1. GET /api/cms/icons
 * List SVG icons (public)
 * Query params: category, search, is_active, limit, offset
 */
cmsIcons.get('/', cache, async (c) => {
    try {
        const category = c.req.query('category');
        const isActive = c.req.query('is_active');
        const search = c.req.query('search');
        const limit = Math.min(parseInt(c.req.query('limit') || '200', 10), 500);
        const offset = parseInt(c.req.query('offset') || '0', 10);

        let query = 'SELECT * FROM cms_icons WHERE 1=1';
        const params: any[] = [];

        if (category && category !== 'all') {
            query += ' AND category = ?';
            params.push(category);
        }

        if (isActive !== undefined && isActive !== '') {
            const activeVal = isActive === 'true' || isActive === '1' ? 1 : 0;
            query += ' AND is_active = ?';
            params.push(activeVal);
        }

        if (search) {
            query += ' AND (name LIKE ? OR category LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY category ASC, name ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const result = await c.env.DB.prepare(query).bind(...params).all();
        const icons = (result.results || []).map(formatCmsIcon);

        // Fetch unique categories list
        const categoriesResult = await c.env.DB.prepare(
            'SELECT DISTINCT category FROM cms_icons ORDER BY category ASC'
        ).all();
        const categories = (categoriesResult.results || [])
            .map((r: any) => r.category)
            .filter(Boolean);

        return c.json({
            success: true,
            count: icons.length,
            categories,
            icons
        });
    } catch (error: any) {
        return c.json({ error: 'Failed to fetch icons', message: error.message }, 500);
    }
});

/**
 * 2. GET /api/cms/icons/:param
 * Get icons by category or by single ID (public)
 */
cmsIcons.get('/:param', cache, async (c) => {
    try {
        const param = c.req.param('param') as string;

        // First check if matching category
        const byCategory = await c.env.DB.prepare(
            'SELECT * FROM cms_icons WHERE category = ? ORDER BY name ASC'
        ).bind(param.toLowerCase()).all();

        if (byCategory.results && byCategory.results.length > 0) {
            const icons = (byCategory.results || []).map(formatCmsIcon);
            return c.json({
                success: true,
                count: icons.length,
                category: param,
                icons
            });
        }

        // Fallback: Check if matching ID
        const byId = await c.env.DB.prepare(
            'SELECT * FROM cms_icons WHERE id = ?'
        ).bind(param).first();

        if (byId) {
            const formatted = formatCmsIcon(byId);
            return c.json({
                success: true,
                icon: formatted,
                icons: [formatted]
            });
        }

        // If category is valid but empty
        return c.json({
            success: true,
            count: 0,
            category: param,
            icons: []
        });
    } catch (error: any) {
        return c.json({ error: 'Failed to fetch icon(s)', message: error.message }, 500);
    }
});

/**
 * 3. POST /api/cms/icons
 * Add new SVG icon (admin only)
 */
cmsIcons.post('/', adminAuthMiddleware, async (c) => {
    try {
        const body = await c.req.json();
        const { name, svg_code, category, is_active } = body;

        if (!name || !svg_code) {
            return c.json({
                error: 'Missing required fields',
                message: 'name and svg_code are required'
            }, 400);
        }

        // Basic SVG validation
        const trimmedSvg = svg_code.trim();
        if (!trimmedSvg.includes('<svg') || !trimmedSvg.includes('</svg>')) {
            return c.json({
                error: 'Invalid SVG code',
                message: 'svg_code must contain valid <svg> and </svg> tags'
            }, 400);
        }

        const id = `icon-${crypto.randomUUID().slice(0, 8)}`;
        const iconCategory = (category || 'general').trim().toLowerCase();
        const activeVal = is_active === false || is_active === 0 ? 0 : 1;

        await c.env.DB.prepare(`
            INSERT INTO cms_icons (id, name, svg_code, category, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(id, name.trim(), trimmedSvg, iconCategory, activeVal).run();

        const createdIcon: CMSIcon = {
            id,
            name: name.trim(),
            svg_code: trimmedSvg,
            category: iconCategory,
            is_active: Boolean(activeVal)
        };

        await bumpCacheVersion(c.env, 'cms-icons');
        return c.json({
            success: true,
            message: 'Icon SVG berhasil ditambahkan',
            id,
            icon: createdIcon
        }, 201);
    } catch (error: any) {
        return c.json({ error: 'Failed to create icon', message: error.message }, 500);
    }
});

/**
 * 4. PUT /api/cms/icons/:id
 * Update SVG icon (admin only)
 */
cmsIcons.put('/:id', adminAuthMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { name, svg_code, category, is_active } = body;

        const existing = await c.env.DB.prepare(
            'SELECT * FROM cms_icons WHERE id = ?'
        ).bind(id).first();

        if (!existing) {
            return c.json({ error: 'Icon not found' }, 404);
        }

        if (svg_code !== undefined) {
            const trimmedSvg = svg_code.trim();
            if (!trimmedSvg.includes('<svg') || !trimmedSvg.includes('</svg>')) {
                return c.json({
                    error: 'Invalid SVG code',
                    message: 'svg_code must contain valid <svg> and </svg> tags'
                }, 400);
            }
        }

        const activeVal = typeof is_active === 'boolean'
            ? (is_active ? 1 : 0)
            : (is_active !== undefined ? Number(is_active) : null);

        await c.env.DB.prepare(`
            UPDATE cms_icons SET
                name = COALESCE(?, name),
                svg_code = COALESCE(?, svg_code),
                category = COALESCE(?, category),
                is_active = COALESCE(?, is_active)
            WHERE id = ?
        `).bind(
            name !== undefined ? name.trim() : null,
            svg_code !== undefined ? svg_code.trim() : null,
            category !== undefined ? category.trim().toLowerCase() : null,
            activeVal,
            id
        ).run();

        await bumpCacheVersion(c.env, 'cms-icons');
        return c.json({
            success: true,
            message: 'Icon berhasil diperbarui',
            id
        });
    } catch (error: any) {
        return c.json({ error: 'Failed to update icon', message: error.message }, 500);
    }
});

/**
 * 5. DELETE /api/cms/icons/:id
 * Delete SVG icon by ID (admin only)
 */
cmsIcons.delete('/:id', adminAuthMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const result = await c.env.DB.prepare(
            'DELETE FROM cms_icons WHERE id = ?'
        ).bind(id).run();

        if (result.meta?.changes === 0) {
            return c.json({ error: 'Icon not found' }, 404);
        }

        await bumpCacheVersion(c.env, 'cms-icons');
        return c.json({
            success: true,
            message: 'Icon berhasil dihapus',
            id
        });
    } catch (error: any) {
        return c.json({ error: 'Failed to delete icon', message: error.message }, 500);
    }
});

export default cmsIcons;
