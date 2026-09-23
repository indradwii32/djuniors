// ============================================
// Djuniors - Rate Limiter (KV sliding window)
// ============================================
// Melindungi endpoint publik (lacak pendaftaran & form pendaftaran) dari
// enumerasi/brute-force dan spam.
//
// Prinsip:
//  * Fail-open — bila KV bermasalah, request tetap dilanjutkan. Rate limit
//    tidak boleh membuat situs mati.
//  * Kunci = prefix + IP klien (+ optional extra key, mis. nomor registrasi).
//  * Hitungan disimpan per bucket waktu (window) sehingga hanya 1 write KV
//    per request; bucket lama kedaluwarsa sendiri via `expirationTtl`.

import { Context, Next } from 'hono';
import { Bindings } from '../types';

export interface RateLimitOptions {
    /** Nama domain pembatas, mis. 'track' atau 'register'. */
    name: string;
    /** Jumlah maksimum request dalam satu window. */
    limit: number;
    /** Panjang window dalam detik. */
    windowSeconds: number;
    /** Ambil kunci tambahan dari request (opsional). */
    keyFrom?: (c: Context<{ Bindings: Bindings }>) => string | null;
    /** Pesan error yang dikembalikan saat limit terlampaui. */
    message?: string;
}

/** Ambil IP klien dari header Cloudflare, fallback ke header umum. */
export function clientIp(c: Context<{ Bindings: Bindings }>): string {
    return (
        c.req.header('CF-Connecting-IP') ||
        c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
        c.req.header('X-Real-IP') ||
        'unknown'
    );
}

/**
 * Middleware factory. Contoh:
 *   const limiter = rateLimit({ name: 'track', limit: 30, windowSeconds: 600 });
 *   registrations.get('/track/:number', limiter, handler)
 */
export function rateLimit(options: RateLimitOptions) {
    const { name, limit, windowSeconds, keyFrom, message } = options;

    return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
        const bucket = Math.floor(Date.now() / (windowSeconds * 1000));
        const extra = keyFrom ? keyFrom(c) : null;
        const subject = extra ? `${clientIp(c)}:${extra}` : clientIp(c);
        const kvKey = `rl:${name}:${bucket}:${subject}`;

        try {
            const current = Number((await c.env.KV.get(kvKey)) || '0');
            if (current >= limit) {
                const retryAfter = windowSeconds - Math.floor((Date.now() / 1000) % windowSeconds);
                c.header('Retry-After', String(Math.max(1, retryAfter)));
                return c.json(
                    {
                        error: 'Too many requests',
                        message:
                            message ||
                            `Terlalu banyak percobaan. Coba lagi dalam ${Math.max(1, Math.ceil(retryAfter / 60))} menit.`,
                    },
                    429
                );
            }
            await c.env.KV.put(kvKey, String(current + 1), {
                expirationTtl: Math.max(60, windowSeconds * 2),
            });
        } catch (err) {
            // Fail-open: KV error tidak boleh memblokir pengguna sah.
            console.warn(`[rate-limit:${name}] skipped:`, (err as Error).message);
        }

        await next();
    };
}
