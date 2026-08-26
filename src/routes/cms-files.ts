// ============================================
// Djuniors - CMS Files & Media Routes
// ============================================

import { Hono } from 'hono';
import { Bindings, Variables, CMSFile } from '../types';
import { adminAuthMiddleware } from '../middleware/auth';
import { verifyJWT } from '../utils/jwt';
import { cacheMiddleware, bumpCacheVersion } from '../middleware/cache';

const cmsFiles = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const cache = cacheMiddleware('cms-files', 300);

// Helper to format CMS file record
function formatCmsFile(row: any): CMSFile {
    if (!row) return row;
    let metadata = row.metadata;
    if (typeof metadata === 'string') {
        try {
            metadata = JSON.parse(metadata);
        } catch {
            metadata = {};
        }
    }
    return {
        ...row,
        metadata: metadata || {},
        is_active: Boolean(row.is_active)
    };
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * 1. POST /api/cms/files/upload
 * Upload file media (admin only)
 */
cmsFiles.post('/upload', adminAuthMiddleware, async (c) => {
    try {
        const contentType = c.req.header('content-type') || '';
        let name = '';
        let fileType = 'general';
        let fileUrl = '';
        let fileSize = 0;
        let mimeType = 'image/png';
        let metadata: Record<string, any> = {};
        let isActive = 1;

        let originalName = '';
        if (contentType.includes('multipart/form-data')) {
            const body = await c.req.parseBody();
            const uploadedFile = body.file as File | undefined;

            if (typeof body.name === 'string' && body.name.trim()) {
                name = body.name.trim();
            }
            if (typeof body.original_name === 'string' && body.original_name.trim()) {
                originalName = body.original_name.trim();
            }
            if (typeof body.file_type === 'string' && body.file_type.trim()) {
                fileType = body.file_type.trim();
            }
            if (typeof body.is_active !== 'undefined') {
                isActive = body.is_active === 'false' || body.is_active === '0' ? 0 : 1;
            }
            if (typeof body.metadata === 'string') {
                try {
                    metadata = JSON.parse(body.metadata);
                } catch {
                    metadata = { raw: body.metadata };
                }
            } else if (typeof body.metadata === 'object' && body.metadata !== null) {
                metadata = body.metadata as Record<string, any>;
            }

            if (typeof body.class_id === 'string' && body.class_id.trim()) {
                metadata.class_id = body.class_id.trim();
            }

            if (uploadedFile && typeof uploadedFile.arrayBuffer === 'function') {
                originalName = originalName || uploadedFile.name;
                name = name || uploadedFile.name;
                fileSize = uploadedFile.size;
                mimeType = uploadedFile.type || 'application/octet-stream';

                const arrayBuffer = await uploadedFile.arrayBuffer();

                if (c.env.R2) {
                    const cleanName = uploadedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                    const fileKey = `cms/${fileType}/${Date.now()}-${cleanName}`;
                    await c.env.R2.put(fileKey, arrayBuffer, {
                        httpMetadata: { contentType: mimeType }
                    });
                    fileUrl = `/api/files/${fileKey}`;
                } else {
                    // Fallback to Base64 Data URL if R2 is unavailable
                    const base64 = arrayBufferToBase64(arrayBuffer);
                    fileUrl = `data:${mimeType};base64,${base64}`;
                }
            } else if (typeof body.file_url === 'string' && body.file_url.trim()) {
                fileUrl = body.file_url.trim();
                name = name || `${fileType}-media`;
                originalName = originalName || name;
            } else {
                return c.json({ error: 'Missing file or file_url' }, 400);
            }
        } else {
            // JSON body
            const body = await c.req.json();
            name = body.name || '';
            originalName = body.original_name || body.name || '';
            fileType = body.file_type || 'general';
            fileUrl = body.file_url || '';
            fileSize = body.file_size || 0;
            mimeType = body.mime_type || 'image/png';
            metadata = body.metadata || {};
            isActive = body.is_active === false || body.is_active === 0 ? 0 : 1;

            if (body.class_id) {
                metadata.class_id = body.class_id;
            }

            if (!fileUrl) {
                return c.json({ error: 'file_url is required for JSON upload' }, 400);
            }
            if (!name) {
                name = `${fileType}-media`;
            }
            if (!originalName) {
                originalName = name;
            }
        }

        const id = `file-${crypto.randomUUID().slice(0, 8)}`;

        // If this is a singleton type (logo, favicon, hero_image, hero) and isActive=1,
        // optionally deactivate other active files of the same type
        if (isActive === 1 && ['logo', 'favicon', 'hero_image', 'hero'].includes(fileType)) {
            await c.env.DB.prepare(
                'UPDATE cms_files SET is_active = 0 WHERE file_type = ?'
            ).bind(fileType).run();
        }

        const metadataStr = JSON.stringify(metadata);

        await c.env.DB.prepare(`
            INSERT INTO cms_files (id, name, original_name, file_type, file_url, file_size, mime_type, metadata, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(id, name, originalName, fileType, fileUrl, fileSize, mimeType, metadataStr, isActive).run();

        const createdFile: CMSFile = {
            id,
            name,
            original_name: originalName,
            file_type: fileType,
            file_url: fileUrl,
            file_size: fileSize,
            mime_type: mimeType,
            metadata,
            is_active: Boolean(isActive)
        };

        await bumpCacheVersion(c.env, 'cms-files');
        return c.json({
            success: true,
            message: 'File berhasil diunggah',
            id,
            file: createdFile
        }, 201);
    } catch (error: any) {
        console.error('File upload error:', error);
        return c.json({ error: 'Failed to upload file', message: error.message }, 500);
    }
});

/**
 * 2. GET /api/cms/files
 * List files (public returns active only, admin with Bearer token can see all)
 */
cmsFiles.get('/', cache, async (c) => {
    try {
        const authHeader = c.req.header('Authorization');
        let isAdmin = false;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const payload = await verifyJWT(token, c.env.JWT_SECRET);
            if (payload && payload.type === 'admin') {
                const session = await c.env.KV.get(`admin-session:${payload.userId}`);
                if (session) {
                    isAdmin = true;
                }
            }
        }

        const type = c.req.query('type');
        const isActive = c.req.query('is_active');
        const search = c.req.query('search');
        const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 200);
        const offset = parseInt(c.req.query('offset') || '0', 10);

        let query = 'SELECT * FROM cms_files WHERE 1=1';
        const params: any[] = [];

        // If not admin, restrict to is_active = 1
        if (!isAdmin) {
            query += ' AND is_active = 1';
        } else if (isActive !== undefined && isActive !== '') {
            const activeVal = isActive === 'true' || isActive === '1' ? 1 : 0;
            query += ' AND is_active = ?';
            params.push(activeVal);
        }

        if (type && type !== 'all') {
            query += ' AND file_type = ?';
            params.push(type);
        }

        if (search) {
            query += ' AND name LIKE ?';
            params.push(`%${search}%`);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const result = await c.env.DB.prepare(query).bind(...params).all();
        const files = (result.results || []).map(formatCmsFile);

        return c.json({
            success: true,
            count: files.length,
            files
        });
    } catch (error: any) {
        return c.json({ error: 'Failed to fetch files', message: error.message }, 500);
    }
});

/**
 * 3. GET /api/cms/files/:type
 * Get active file(s) by type (public)
 */
cmsFiles.get('/:type', cache, async (c) => {
    try {
        const fileType = c.req.param('type');

        const result = await c.env.DB.prepare(`
            SELECT * FROM cms_files
            WHERE file_type = ? AND is_active = 1
            ORDER BY created_at DESC
        `).bind(fileType).all();

        const files = (result.results || []).map(formatCmsFile);
        const latestFile = files.length > 0 ? files[0] : null;

        return c.json({
            success: true,
            type: fileType,
            file: latestFile,
            files
        });
    } catch (error: any) {
        return c.json({ error: 'Failed to fetch file by type', message: error.message }, 500);
    }
});

/**
 * 4. DELETE /api/cms/files/:id
 * Delete file by ID (admin only)
 */
cmsFiles.delete('/:id', adminAuthMiddleware, async (c) => {
    try {
        const id = c.req.param('id');

        // Check if file exists
        const file = await c.env.DB.prepare(
            'SELECT * FROM cms_files WHERE id = ?'
        ).bind(id).first();

        if (!file) {
            return c.json({ error: 'File not found' }, 404);
        }

        // If stored in R2, delete from R2
        if (c.env.R2 && typeof file.file_url === 'string' && file.file_url.startsWith('/api/files/')) {
            const key = file.file_url.replace('/api/files/', '');
            try {
                await c.env.R2.delete(key);
            } catch (r2Err) {
                console.warn('Could not delete from R2:', r2Err);
            }
        }

        await c.env.DB.prepare('DELETE FROM cms_files WHERE id = ?').bind(id).run();

        await bumpCacheVersion(c.env, 'cms-files');
        return c.json({
            success: true,
            message: 'File berhasil dihapus',
            id
        });
    } catch (error: any) {
        return c.json({ error: 'Failed to delete file', message: error.message }, 500);
    }
});

/**
 * 5. PUT /api/cms/files/:id
 * Update file details or toggle active status (admin only)
 */
cmsFiles.put('/:id', adminAuthMiddleware, async (c) => {
    try {
        const id = c.req.param('id');
        const body = await c.req.json();
        const { name, is_active, metadata, file_type } = body;

        const existing = await c.env.DB.prepare(
            'SELECT * FROM cms_files WHERE id = ?'
        ).bind(id).first();

        if (!existing) {
            return c.json({ error: 'File not found' }, 404);
        }

        const activeVal = typeof is_active === 'boolean' ? (is_active ? 1 : 0) : is_active;
        const targetType = file_type || existing.file_type;

        // If setting active on singleton types, deactivate other files
        if (activeVal === 1 && ['logo', 'favicon', 'hero_image'].includes(targetType as string)) {
            await c.env.DB.prepare(
                'UPDATE cms_files SET is_active = 0 WHERE file_type = ? AND id != ?'
            ).bind(targetType, id).run();
        }

        const metadataStr = metadata !== undefined
            ? (typeof metadata === 'object' ? JSON.stringify(metadata) : String(metadata))
            : null;

        await c.env.DB.prepare(`
            UPDATE cms_files SET
                name = COALESCE(?, name),
                file_type = COALESCE(?, file_type),
                is_active = COALESCE(?, is_active),
                metadata = COALESCE(?, metadata)
            WHERE id = ?
        `).bind(
            name !== undefined ? name : null,
            file_type !== undefined ? file_type : null,
            activeVal !== undefined ? activeVal : null,
            metadataStr,
            id
        ).run();

        await bumpCacheVersion(c.env, 'cms-files');
        return c.json({
            success: true,
            message: 'File berhasil diperbarui',
            id
        });
    } catch (error: any) {
        return c.json({ error: 'Failed to update file', message: error.message }, 500);
    }
});

export default cmsFiles;
