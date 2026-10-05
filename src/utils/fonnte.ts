// ============================================
// Djuniors - Fonnte WhatsApp API Integration
// ============================================

// Fonnte token management — stored in D1 settings table, editable from dashboard Settings.
// Falls back to env var WA_FONNTE_TOKEN for backward compatibility.

import { D1Database } from '@cloudflare/workers-types';

const FONNTE_TOKEN_KEY = 'fonnte_token';
const FONNTE_BASE_KEY = 'fonnte_base_url';

export async function getFonnteToken(env: { DB: D1Database; WA_FONNTE_TOKEN?: string }): Promise<string> {
    // 1. Try D1 settings table first (dashboard-editable)
    try {
        const row = await env.DB.prepare(
            `SELECT value FROM settings WHERE key = ?`
        ).bind(FONNTE_TOKEN_KEY).first<{ value: string }>();

        if (row?.value && row.value.trim() !== '') {
            return row.value;
        }
    } catch {
        // Table might not exist yet
    }

    // 2. Fallback to env var (backward compat)
    if (env.WA_FONNTE_TOKEN && env.WA_FONNTE_TOKEN.trim() !== '') {
        return env.WA_FONNTE_TOKEN;
    }

    return '';
}

/**
 * Base URL endpoint Fonnte.
 *
 * Disimpan di settings (`fonnte_base_url`) supaya bisa diarahkan ke proxy/mock
 * lokal saat diagnosa, tanpa harus deploy ulang. Tidak diset = default resmi
 * Fonnte. Baca gagal = tetap default, jadi perubahan ini tidak pernah bisa
 * membuat pengiriman mati.
 */
export async function getFonnteBaseUrl(env: { DB: D1Database }): Promise<string> {
    try {
        const row = await env.DB.prepare(
            `SELECT value FROM settings WHERE key = ?`
        ).bind(FONNTE_BASE_KEY).first<{ value: string }>();
        const v = (row?.value || '').trim().replace(/\/+$/, '');
        if (v) return v;
    } catch {
        // abaikan
    }
    return 'https://api.fonnte.com';
}

export interface FonnteConfig {
    token: string;
    baseUrl?: string;
}

export interface FonnteResponse {
    status: boolean;
    message?: string;
    id?: string;
}

/**
 * Normalisasi nomor tujuan ke format Fonnte (digits saja, tanpa 0 depan).
 *
 * "0812..." -> "62812...", "62812-3456-789" -> "628123456789", dan "8..."
 * juga diubah jadi "628..." karena lazim dipakai orang Indonesia.
 */
function normalizeTarget(phone: string): string {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('0')) {
        digits = '62' + digits.slice(1);
    } else if (digits.startsWith('8')) {
        digits = '62' + digits;
    }
    return digits;
}

/**
 * Kirim pesan WhatsApp via Fonnte API.
 *
 * PENTING — format body: Fonnte TIDAK menerima application/json pada
 * `/send`. Dengan JSON, Fonnte membalas
 *   {"status":false,"reason":"invalid/empty body value"}
 * sementara HTTP-nya tetap 200 — jadi kegagalan tidak kelihatan sebagai
 * error, dan device tetap dilaporkan "connect" oleh `/device` (yang memang
 * menerima JSON). Itulah sebabnya dashboard bisa menampilkan Fonnte online
 * sementara setiap pesan gagal terkirim.
 *
 * Fonnte hanya menerima `application/x-www-form-urlencoded` atau
 * `multipart/form-data` pada `/send`. Yang dipakai di sini: form-urlencoded.
 *
 * Docs: https://docs.fonnte.com
 */
export async function sendWAFonnte(
    config: FonnteConfig,
    phone: string,
    message: string,
    options?: { typing?: boolean; delay?: number }
): Promise<FonnteResponse> {
    const baseUrl = config.baseUrl || 'https://api.fonnte.com';

    const target = normalizeTarget(phone);

    // Token kosong: jangan kirim request sama sekali. Tanpa cek ini,
    // Fonnte membalas error generik dan sulit dibedakan dari token salah.
    if (!config.token || config.token.trim() === '') {
        return { status: false, message: 'Token Fonnte kosong' };
    }
    if (!target) {
        return { status: false, message: 'Nomor tujuan tidak valid' };
    }
    if (!message || !message.trim()) {
        return { status: false, message: 'Pesan kosong' };
    }

    // Batas Fonnte: 4096 karakter per pesan. Melewati batas → Fonnte menolak
    // seluruh request, bukan memotong.
    if (message.length > 4096) {
        return { status: false, message: `Pesan terlalu panjang (${message.length}/4096 karakter)` };
    }

    try {
        const body = new URLSearchParams();
        body.set('target', target);
        body.set('message', message);
        body.set('typing', String(options?.typing ?? true));
        body.set('delay', String(options?.delay ?? 0));

        const response = await fetch(`${baseUrl}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': config.token
            },
            body: body.toString(),
            // Jangan pernah menahan response request lain bila Fonnte lambat/matikan
            signal: AbortSignal.timeout(20_000)
        });

        const text = await response.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            // Fonnte kadang balas HTML/teks bila gateway-nya bermasalah.
            return {
                status: false,
                message: `Respons Fonnte tidak valid: ${text.slice(0, 120)}`
            };
        }

        if (data.status !== true) {
            // Fonnte menyertakan `reason` untuk body salah / device masalah.
            const reason = data.reason || data.detail || data.message || 'ditolak Fonnte';
            return { status: false, message: String(reason) };
        }

        return {
            status: true,
            message: data.detail || data.message || 'terkirim',
            id: Array.isArray(data.id) ? String(data.id[0]) : (data.id ? String(data.id) : undefined)
        };
    } catch (error) {
        console.error('Fonnte API error:', error);
        return {
            status: false,
            message: error instanceof Error ? error.message : 'Gagal menghubungi Fonnte'
        };
    }
}

/**
 * Kirim banyak pesan sekaligus (satu device, banyak target).
 */
export async function sendBulkWAFonnte(
    config: FonnteConfig,
    targets: Array<{ phone: string; message: string }>
): Promise<FonnteResponse> {
    const baseUrl = config.baseUrl || 'https://api.fonnte.com';

    if (!config.token || config.token.trim() === '') {
        return { status: false, message: 'Token Fonnte kosong' };
    }

    const prepared = targets
        .filter((t) => t && t.message && t.message.trim())
        .map((t) => ({ target: normalizeTarget(t.phone), message: t.message }));

    if (prepared.length === 0) {
        return { status: false, message: 'Tidak ada target yang valid' };
    }

    try {
        // /sendBulk juga menolak JSON — harus form-urlencoded.
        const body = new URLSearchParams();
        // targets[][] adalah nama field yang diharapkan Fonnte untuk array.
        prepared.forEach((t) => {
            body.append('targets[][]', `${t.target}|${t.message}`);
        });
        body.set('typing', 'true');
        body.set('delay', '1000');

        const response = await fetch(`${baseUrl}/sendBulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': config.token
            },
            body: body.toString(),
            signal: AbortSignal.timeout(30_000)
        });

        const text = await response.text();
        let data: any;
        try {
            data = JSON.parse(text);
        } catch {
            return {
                status: false,
                message: `Respons Fonnte tidak valid: ${text.slice(0, 120)}`
            };
        }

        if (data.status !== true) {
            const reason = data.reason || data.detail || data.message || 'ditolak Fonnte';
            return { status: false, message: String(reason) };
        }

        return { status: true, message: data.detail || data.message || 'terkirim' };
    } catch (error) {
        console.error('Fonnte bulk API error:', error);
        return {
            status: false,
            message: error instanceof Error ? error.message : 'Gagal menghubungi Fonnte'
        };
    }
}

/**
 * Check Fonnte API connection status.
 *
 * PENTING: endpoint Fonnte `/status` sudah DEPRECATED. Fonnte membalas
 * `{status:false, reason:"this API is deprecated, use webhook update message
 * status instead"}` untuk token yang sepenuhnya valid — jadi memakai /status
 * membuat dashboard selalu menampilkan "offline" padahal token baik.
 *
 * `/device` adalah pemeriksa koneksi yang benar: mengembalikan info device,
 * status koneksi, kuota, dan masa berlaku. Status "connect" + kuota > 0 =
 * gateway benar-benar bisa dipakai.
 */
export async function checkFonnteStatus(config: FonnteConfig): Promise<boolean> {
    const baseUrl = config.baseUrl || 'https://api.fonnte.com';

    // Token kosong = pasti tidak terhubung. Tanpa cek ini, Authorization
    // kosong dikirim ke Fonnte dan hasilnya tidak bisa dibedakan dari
    // "token salah".
    if (!config.token || config.token.trim() === '') {
        return false;
    }

    try {
        const response = await fetch(`${baseUrl}/device`, {
            method: 'POST',
            headers: {
                'Authorization': config.token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(10_000)
        });

        const data = await response.json() as any;
        // `status:true` berarti token diterima. `device_status` cuma
        // 'connect' kalau WhatsApp-nya benar-benar terhubung.
        if (data.status === true) {
            return data.device_status === 'connect' || !data.device_status;
        }
        return false;
    } catch {
        return false;
    }
}

/**
 * Kirim pesan dengan fallback token.
 *
 * Token utama (CS) dicoba lebih dulu. Bila gagal — token invalid, kuota
 * habis, atau Fonnte sedang bermasalah — pesan dicoba ulang memakai token
 * cadangan (token global/admin). Ini yang membuat "token admin digunakan
 * sebagai fallback" bekerja: CS tidak kehilangan notifikasi hanya karena
 * device Fonnte-nya sedang mati.
 *
 * `source` menjelaskan token mana yang akhirnya berhasil, supaya UI bisa
 * memberi tahu CS/admin bahwa pesan dikirim lewat token cadangan.
 */
export interface WaSendWithFallbackResult extends FonnteResponse {
    /** 'primary' = token utama sukses, 'fallback' = token cadangan yang berhasil. */
    source: 'primary' | 'fallback' | 'none';
    /** Alasan token utama gagal (untuk log/diagnosa). */
    primary_error?: string;
}

export async function sendWaWithFallback(
    env: { DB: D1Database; WA_FONNTE_TOKEN?: string },
    primaryToken: string,
    fallbackToken: string,
    phone: string,
    message: string,
    options?: { typing?: boolean; delay?: number }
): Promise<WaSendWithFallbackResult> {
    const primary = (primaryToken || '').trim();
    const fallback = (fallbackToken || '').trim();

    // Base URL dibaca sekali, lalu dipakai untuk kedua percobaan — supaya
    // kegagalan membaca settings tidak mengubah tujuan kiriman di tengah jalan.
    const baseUrl = await getFonnteBaseUrl(env);

    if (primary) {
        const result = await sendWAFonnte({ token: primary, baseUrl }, phone, message, options);
        if (result.status) {
            return { ...result, source: 'primary' };
        }
        // Token utama gagal → coba cadangan, kecuali keduanya token sama
        // (percobaan kedua sia-sia dan hanya membuang kuota).
        if (fallback && fallback !== primary) {
            const retry = await sendWAFonnte({ token: fallback, baseUrl }, phone, message, options);
            if (retry.status) {
                return { ...retry, source: 'fallback', primary_error: result.message || 'gagal' };
            }
            return {
                status: false,
                message: `Token CS gagal (${result.message || 'error'}) dan token cadangan juga gagal (${retry.message || 'error'})`,
                source: 'none',
                primary_error: result.message || 'gagal',
            };
        }
        return { ...result, source: 'none', primary_error: result.message || 'gagal' };
    }

    // Tidak ada token utama → langsung pakai cadangan.
    if (fallback) {
        const result = await sendWAFonnte({ token: fallback, baseUrl }, phone, message, options);
        return { ...result, source: result.status ? 'fallback' : 'none' };
    }

    return { status: false, message: 'Token Fonnte kosong', source: 'none' };
}

/**
 * WA Message Templates (Fonnte format)
 */
export const FonnteTemplates = {
    welcome: (name: string) =>
        `🎮 *Selamat Datang di Djuniors!* 🎉\n\nHalo ${name}!\n\nTerima kasih sudah bergabung dengan Djuniors. Siap belajar matematika jadi seru? 🚀\n\n📞 Hubungi kami jika ada pertanyaan!\n🌐 www.djuniorslc.com`,

    enrollmentConfirmed: (name: string, className: string) =>
        `✅ *Pendaftaran Berhasil!*\n\nHalo ${name}!\n\nKamu sudah terdaftar di kelas:\n📚 *${className}*\n\n📅 Jadwal dan materi akan dikirim segera.\n\nSemangat belajar! 💪`,

    paymentInstructions: (name: string, bank: string, account: string, amount: number, orderId: string) =>
        `💳 *Instruksi Pembayaran*\n\nHalo ${name}!\n\nUntuk menyelesaikan pendaftaran, silakan transfer ke:\n\n🏦 Bank: *${bank}*\n📄 Rekening: *${account}*\n💰 Nominal: *Rp ${amount.toLocaleString('id-ID')}*\n🔖 Kode: *${orderId}*\n\n⚠️ *PENTING:*\nTransfer tepat sampai digit terakhir (contoh: Rp 99.001)\nAgar pembayaran bisa otomatis terdeteksi!\n\n📸 Setelah transfer, kirim bukti transfer ke admin.`,

    paymentSuccess: (name: string, className: string) =>
        `💰 *Pembayaran Diterima!*\n\nHalo ${name}!\nPembayaran untuk kelas *${className}* sudah kami terima.\n\n✅ Status: Lunas\n\nSelamat belajar! 🎯`,

    classReminder: (name: string, className: string, time: string) =>
        `⏰ *Pengingat Kelas!*\n\nHalo ${name}!\nKelas *${className}* akan dimulai pukul *${time}*.\n\nSiap belajar ya! 📚`,

    promoAnnouncement: (name: string, promoCode: string, discount: string) =>
        `🎉 *Promo Spesial!* 🎉\n\nHalo ${name}!\n\nGunakan kode *${promoCode}* untuk mendapatkan diskon *${discount}*!\n\nBerlaku terbatas. Jangan sampai kehabisan! ⏰`
};
