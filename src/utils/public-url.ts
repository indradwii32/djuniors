// ============================================
// Djuniors - Alamat situs publik untuk tautan ke pelanggan
// ============================================
// Semua tautan yang dikirim ke PELANGGAN (link lacak pendaftaran, upload bukti
// pembayaran, link pembayaran) harus menunjuk ke situs publik tempat halaman
// itu benar-benar ada — bukan ke domain API.
//
// Kenapa perlu modul terpisah: sebelumnya setiap route memakai
//   (c.env as any).BASE_URL || new URL(c.req.url).origin
// dan `origin` pada Worker adalah domain API (api.djuniorslc.com). Karena
// BASE_URL tidak pernah diset di produksi, SEMUA link di pesan WhatsApp
// menunjuk ke domain API — pelanggan tidak bisa membukanya (404/tidak
// melayani halaman), jadi mereka tidak bisa melacak atau mengunggah bukti.
//
// Modul ini menutup celah itu di dua lapis: BASE_URL yang benar, dan
// penolakan eksplisit terhadap origin yang jelas-jelas bukan situs publik
// walau BASE_URL salah diisi.

const DEFAULT_PUBLIC_SITE = 'https://djuniorslc.com';

type BaseUrlEnv = {
    BASE_URL?: string;
    PUBLIC_SITE_URL?: string;
};

/** Buang garis miring di akhir supaya penggabungan path tidak jadi `//`. */
function normalize(url: string): string {
    return url.trim().replace(/\/+$/, '');
}

/**
 * Apakah sebuah origin jelas-jelas alamat API, bukan situs publik.
 * Dipakai sebagai pengaman: Worker diakses lewat api.* atau *.workers.dev,
 * dan tidak satu pun melayani halaman HTML pelanggan.
 */
export function looksLikeApiHost(url: string): boolean {
    const u = url.toLowerCase();
    if (u.includes('workers.dev')) return true;
    try {
        const host = new URL(u).hostname;
        return host === 'api' || host.startsWith('api.') || host.includes('.api.');
    } catch {
        return false;
    }
}

/**
 * Alamat situs publik untuk tautan pelanggan.
 *
 * Urutan: PUBLIC_SITE_URL → BASE_URL → default situs publik. Nilai yang
 * terdeteksi sebagai domain API dibuang (dengan peringatan di log) supaya
 * pesan WhatsApp tidak pernah berisi link yang tidak bisa dibuka pelanggan.
 *
 * `requestOrigin` sengaja HANYA dipakai sebagai pilihan terakhir kalau dia
 * bukan domain API — itulah bedanya dengan perilaku lama yang selalu memakai
 * origin Worker (domain API).
 */
export function getPublicSiteUrl(env: BaseUrlEnv, requestOrigin?: string): string {
    const candidates = [env.PUBLIC_SITE_URL, env.BASE_URL].filter(
        (v): v is string => typeof v === 'string' && v.trim() !== ''
    );

    for (const raw of candidates) {
        const url = normalize(raw);
        if (looksLikeApiHost(url)) {
            console.warn(`[public-url] diabaikan karena terlihat seperti domain API: ${url}`);
            continue;
        }
        return url;
    }

    if (requestOrigin) {
        const url = normalize(requestOrigin);
        if (!looksLikeApiHost(url)) return url;
    }

    return DEFAULT_PUBLIC_SITE;
}

/**
 * Alamat situs publik bila hanya punya Request/context (kasus paling umum di
 * route). Menggabungkan getPublicSiteUrl dengan origin request yang tersedia.
 */
export function getPublicSiteUrlFromRequest(env: BaseUrlEnv, reqUrl: string): string {
    let origin: string | undefined;
    try {
        origin = new URL(reqUrl).origin;
    } catch {
        origin = undefined;
    }
    return getPublicSiteUrl(env, origin);
}

/** URL halaman lacak pendaftaran & unggah bukti pembayaran. */
export function buildTrackUrl(env: BaseUrlEnv, regNumber: string, requestOrigin?: string): string {
    const base = getPublicSiteUrl(env, requestOrigin);
    return `${base}/lacak.html?number=${encodeURIComponent(regNumber)}`;
}

/**
 * Bentuk ringkas untuk dipakai di route Hono: ambil origin request sendiri,
 * lalu kembalikan alamat situs publik yang aman.
 */
export function publicSiteUrl(c: { env: unknown; req: { url: string } }): string {
    return getPublicSiteUrlFromRequest(c.env as BaseUrlEnv, c.req.url);
}
