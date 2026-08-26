// ============================================
// Djuniors - Landing Page JavaScript (CMS Powered)
// ============================================

const API_BASE = window.API_BASE || (window.location.origin && window.location.origin.includes(':8787') ? '' : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8787' : ''));

// ============================================
// Fallback Default Content
// ============================================

const DEFAULT_FALLBACK_CMS = {
    header: {
        site_name: 'Djuniors Learning Center',
        logo_text: 'Djuniors',
        nav_items: [
            { label: 'Fitur', href: '#features' },
            { label: 'Pilihan Kelas', href: '#classes' },
            { label: 'Cara Kerja', href: '#how-it-works' },
            { label: 'Testimoni', href: '#testimonials' },
            { label: 'FAQ', href: '#faq' },
            { label: 'Lacak Pendaftaran', href: 'lacak.html' }
        ],
        cta_button_text: 'Daftar Sekarang'
    },
    footer: {
        footer_tagline: 'Belajar matematika jadi seru untuk anak Indonesia!',
        footer_email: 'hello@djuniors.id',
        footer_phone: '081234567890',
        footer_address: 'Jakarta, Indonesia',
        copyright: '2026 Djuniors Learning Center',
        // Used when the CMS fetch fails (offline deploy, network error, etc).
        // Each entry: { platform, label, url, icon, order }. Empty url = hidden.
        social_links: [
            { platform: 'facebook',  label: 'Facebook Djuniors',  url: 'https://facebook.com/djuniors',    icon: '📘', order: 1 },
            { platform: 'instagram', label: 'Instagram Djuniors', url: 'https://instagram.com/djuniors',   icon: '📸', order: 2 },
            { platform: 'tiktok',    label: 'TikTok Djuniors',    url: 'https://tiktok.com/@djuniors',      icon: '🎵', order: 3 },
            { platform: 'youtube',   label: 'YouTube Djuniors',   url: 'https://youtube.com/@djuniors',     icon: '📺', order: 4 },
            { platform: 'whatsapp',  label: 'WhatsApp Djuniors',  url: 'https://wa.me/6281234567890',       icon: '💬', order: 5 },
        ]
    },
    hero: {
        hero_badge: '🎯',
        hero_title: 'Kelas Matematika\nLive Interaktif untuk Anak!',
        hero_subtitle: 'Belajar matematika langsung dengan guru via Google Meet.\nInteraktif, seru, dan menyenangkan untuk anak usia TK & SD! 🎮',
        hero_cta_text: '🚀 Daftar Kelas Gratis!',
        hero_cta_link: 'daftar.html'
    },
    features: {
        features_title: 'Kenapa Pilih Djuniors?',
        features_subtitle: 'Kelas live interaktif yang bikin anak ketagihan belajar!',
        features_items: [
            {
                icon: '👩‍🏫',
                title: 'Live Class dengan Guru',
                description: 'Belajar langsung dengan guru berpengalaman via Google Meet. Bukan sekadar nonton video!'
            },
            {
                icon: '🤝',
                title: 'Interaktif & Real-Time',
                description: 'Anak bisa bertanya, berdiskusi, dan bermain game langsung di kelas. Belajar jadi menyenangkan!'
            },
            {
                icon: '👨‍👩‍👧',
                title: 'Kelas Kecil (Maks 8 Siswa)',
                description: 'Kelas kecil agar setiap anak mendapat perhatian penuh dari guru. Kualitas belajar terjamin!'
            },
            {
                icon: '📱',
                title: 'Akses dari Mana Saja',
                description: 'Cukup HP atau laptop dengan internet. Anak bisa belajar dari rumah tanpa ribet!'
            }
        ]
    },
    classes: {
        classes_title: 'Pilihan Kelas & Jadwal',
        classes_subtitle: 'Pilih kelas yang sesuai dengan usia dan jadwal belajar anak Anda!'
    },
    testimonials: {
        testimonials_title: 'Kata Orang Tua',
        testimonials_subtitle: 'Mereka sudah membuktikan anak jadi semangat belajar!',
        testimonials_items: [
            {
                name: 'Ibu Sarah',
                relation: 'Ibu dari Rizky (7 tahun)',
                text: 'Anak saya yang tadinya tidak suka matematika, sekarang minta belajar setiap hari! Kelas live-nya seru banget, guru-nya juga sabar.',
                rating: 5
            },
            {
                name: 'Bapak Ahmad',
                relation: 'Ayah dari Siti (5 tahun)',
                text: 'Kelas kecil jadi anak saya lebih percaya diri bertanya. Guru-gurunya juga selalu kasih feedback setelah kelas. Recommended banget!',
                rating: 5
            },
            {
                name: 'Ibu Dewi',
                relation: 'Ibu dari Budi (9 tahun)',
                text: 'Praktis banget! Gak perlu antar-jemput. Anak belajar dari rumah lewat Google Meet, tapi tetap interaktif. Nilai matematikanya naik!',
                rating: 5
            }
        ]
    },
    cta: {
        cta_title: 'Siap Belajar Live? 🚀',
        cta_subtitle: 'Daftar sekarang dan dapatkan 1 kelas gratis via Google Meet!',
        cta_button_text: 'Daftar Gratis Sekarang!'
    },
    meta: {
        meta_title: 'Djuniors - Kelas Matematika Live Interaktif untuk Anak! 🧮',
        meta_description: 'Kelas online matematika live interaktif untuk anak TK & SD via Google Meet. Belajar langsung dengan guru!',
        meta_keywords: 'matematika anak, kelas online live, Google Meet, TK, SD, math for kids, belajar interaktif'
    },
    style: {
        primary_color: '#4A90D9',
        secondary_color: '#FFD93D',
        accent_color: '#FF6B35',
        font_heading: 'Baloo 2',
        font_body: 'Nunito'
    }
};

// ============================================
// Fallback Default Media Assets
// ============================================

const DEFAULT_LOGO_IMAGE = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%234A90D9"/><text x="50" y="64" font-size="54" text-anchor="middle" dominant-baseline="middle">🧮</text></svg>`;

const DEFAULT_FAVICON = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🧮</text></svg>`;

const DEFAULT_HERO_IMAGE = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 450" width="600" height="450"><defs><linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23FFF8E7"/><stop offset="50%" stop-color="%23E8F4FD"/><stop offset="100%" stop-color="%23FFF0F5"/></linearGradient><linearGradient id="bubbleGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%234A90D9"/><stop offset="100%" stop-color="%23357abd"/></linearGradient></defs><rect width="600" height="450" rx="24" fill="url(%23bgGrad)"/><circle cx="300" cy="225" r="150" fill="%23FFFFFF" opacity="0.85"/><circle cx="120" cy="90" r="40" fill="%23FFD93D" opacity="0.3"/><circle cx="500" cy="360" r="55" fill="%23FF9CEE" opacity="0.3"/><circle cx="490" cy="110" r="45" fill="%236BCB77" opacity="0.25"/><text x="300" y="225" font-size="120" text-anchor="middle" dominant-baseline="middle">👩‍🏫</text><g transform="translate(160, 100)"><rect width="65" height="42" rx="10" fill="url(%23bubbleGrad)"/><text x="32" y="27" font-size="20" font-weight="bold" fill="white" text-anchor="middle">1+2</text></g><g transform="translate(380, 110)"><rect width="65" height="42" rx="10" fill="%23FF6B35"/><text x="32" y="27" font-size="20" font-weight="bold" fill="white" text-anchor="middle">5×3</text></g><g transform="translate(130, 310)"><rect width="70" height="42" rx="10" fill="%236BCB77"/><text x="35" y="27" font-size="20" font-weight="bold" fill="white" text-anchor="middle">10÷2</text></g><g transform="translate(410, 300)"><rect width="65" height="42" rx="10" fill="%23FFD93D"/><text x="32" y="27" font-size="20" font-weight="bold" fill="%232D3436" text-anchor="middle">💯</text></g><text x="500" y="90" font-size="34">✨</text><text x="90" y="230" font-size="30">⭐</text><text x="490" y="250" font-size="32">💫</text></svg>`;

const DEFAULT_CLASS_IMAGE = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 220" width="400" height="220"><defs><linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="%23EBF4FF"/><stop offset="100%" stop-color="%23FFF5EA"/></linearGradient></defs><rect width="400" height="220" rx="14" fill="url(%23cardGrad)"/><circle cx="200" cy="100" r="65" fill="%23FFFFFF" opacity="0.9"/><text x="200" y="108" font-size="60" text-anchor="middle" dominant-baseline="middle">🧮</text><g transform="translate(30, 25)"><circle cx="15" cy="15" r="15" fill="%23FFD93D"/><text x="15" y="21" font-size="15" text-anchor="middle" font-weight="bold" fill="%232D3436">✨</text></g><g transform="translate(340, 25)"><circle cx="15" cy="15" r="15" fill="%236BCB77"/><text x="15" y="21" font-size="15" text-anchor="middle" font-weight="bold" fill="white">★</text></g><rect x="50" y="170" width="300" height="30" rx="15" fill="%23FFFFFF" opacity="0.92"/><text x="200" y="190" font-size="13" font-weight="bold" fill="%234A90D9" text-anchor="middle" font-family="sans-serif">🎮 Kelas Live Interaktif via Meet</text></svg>`;

// ============================================
// Image Optimization helpers (Task F)
// ============================================
//
// `IMAGE_CDN_BASE` activates Cloudflare's `/cdn-cgi/image/` resizer when this
// site is served behind a Cloudflare proxy. Locally (localhost / python http
// server / non-CF host) we leave it empty and serve images at original size.
//
// Usage:
//   const url = imageUrl(rawUrl, { width: 400, format: 'auto' });
//   const attrs = imageAttrs(rawUrl, { width: 400, height: 220, alt: 'Hero' });
//
// `format: 'auto'` lets CF pick AVIF → WebP → JPEG → PNG automatically —
// best LCP win per byte. `quality: 'auto'` likewise.
const IMAGE_CDN_BASE = ''; // e.g. 'https://djuniors.id/cdn-cgi/image' in production — filled by deploy

/**
 * Returns a URL — CF-resized if CDN base is configured, otherwise the original.
 * No-op for data: URIs (inline SVG placeholders).
 */
function imageUrl(src, opts = {}) {
    if (!src) return src;
    if (src.startsWith('data:')) return src; // data URI — no resize possible
    if (!IMAGE_CDN_BASE) return src; // local dev: serve as-is
    const parts = [];
    if (opts.width)  parts.push(`width=${opts.width}`);
    if (opts.height) parts.push(`height=${opts.height}`);
    if (opts.fit)    parts.push(`fit=${opts.fit}`);
    if (opts.quality) parts.push(`quality=${opts.quality}`);
    // `format=auto` must come last per CF docs
    parts.push('format=' + (opts.format || 'auto'));
    return `${IMAGE_CDN_BASE}/${parts.join(',')}/${src}`;
}

/**
 * HTML-attribute-encode a string so it can be wrapped in double quotes safely.
 * Data URIs often contain `<svg xmlns="...">` which breaks attribute parsing.
 */
function attrEncode(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;');
}

/**
 * Renders the attributes string for an <img> with sensible defaults:
 * - lazy / async decoding (CLS + LCP win)
 * - explicit width/height (CLS prevention)
 * - srcset for the common breakpoints CF supports
 * - onerror fallback to a placeholder
 */
function imageAttrs(src, opts = {}) {
    const {
        alt = '',
        width = '',
        height = '',
        sizes = '',
        priority = false, // pass true for LCP images (hero); skips lazy
        fallback = '',
        className = '',
    } = opts;

    const mainUrl = imageUrl(src, { width: width || undefined, height: height || undefined, format: 'auto', quality: 'auto' });

    // Generate a small srcset so CF can pick the smallest variant that
    // fits the rendered layout. Skip for non-CF (local) to keep simple.
    let srcset = '';
    if (IMAGE_CDN_BASE && width && !src.startsWith('data:')) {
        const variants = [];
        // Halve the desired width for 1x, double for 2x / retina coverage.
        const baseW = Math.round(parseInt(width, 10) || 400);
        [Math.round(baseW * 0.5), baseW, Math.round(baseW * 2)].forEach((w) => {
            const u = imageUrl(src, { width: w, format: 'auto', quality: 'auto' });
            variants.push(`${u} ${w}w`);
        });
        srcset = variants.join(', ');
    }

    // Encode src/fallback because data URIs may contain `"` characters
    // that would prematurely close the HTML attribute.
    const srcAttr = attrEncode(mainUrl);
    const fallbackAttr = fallback ? attrEncode(fallback) : '';
    const onerror = fallbackAttr ? `this.onerror=null; this.src='${fallbackAttr.replace(/'/g, "\\'")}';` : '';
    const loading = priority ? 'eager' : 'lazy';
    const fetchpri = priority ? 'fetchpriority="high"' : '';
    const srcsetAttr = srcset ? `srcset="${attrEncode(srcset)}"` : '';
    const sizesAttr = sizes && srcset ? `sizes="${attrEncode(sizes)}"` : '';
    const classAttr = className ? `class="${attrEncode(className)}"` : '';
    const widthAttr  = width  ? `width="${width}"`  : '';
    const heightAttr = height ? `height="${height}"` : '';
    const altAttr    = `alt="${attrEncode(alt)}"`;

    return `${classAttr} src="${srcAttr}" ${srcsetAttr} ${sizesAttr} ${altAttr} ${widthAttr} ${heightAttr} loading="${loading}" decoding="async" ${fetchpri} onerror="${onerror}"`.replace(/\s+/g, ' ').trim();
}

// ============================================
// API Fetch Functions
// ============================================

/**
 * Fetch all CMS sections and settings from backend API
 */
async function fetchCmsData() {
    try {
        const response = await fetch(`${API_BASE}/api/cms/public/all`);
        if (response.ok) {
            const data = await response.json();
            if (data && data.sections && Object.keys(data.sections).length > 0) {
                return data.sections;
            }
        }
    } catch (error) {
        console.warn('Could not fetch all CMS content at once, trying individual sections:', error);
    }

    // Fallback: Fetch sections individually
    const sections = ['header', 'hero', 'features', 'classes', 'testimonials', 'cta', 'footer', 'meta', 'style'];
    const result = {};

    await Promise.allSettled(sections.map(async (sec) => {
        try {
            const res = await fetch(`${API_BASE}/api/cms/${sec}`);
            if (res.ok) {
                const data = await res.json();
                result[sec] = data.data || data;
            }
        } catch {
            // ignore individual section error
        }
    }));

    return Object.keys(result).length > 0 ? result : DEFAULT_FALLBACK_CMS;
}

/**
 * Fetch active levels from backend API
 */
async function fetchLevels() {
    try {
        const response = await fetch(`${API_BASE}/api/levels`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching levels:', error);
        return [];
    }
}

/**
 * Fetch active classes from backend API
 */
async function fetchClasses() {
    try {
        const response = await fetch(`${API_BASE}/api/classes`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching classes:', error);
        return [];
    }
}

// ============================================
// Media API Fetch Functions (CMS Files)
// ============================================

/**
 * Fetch media from CMS files API
 * - If type provided: GET /api/cms/files/:type
 * - If no type: GET /api/cms/files
 */
async function fetchMedia(type = '') {
    try {
        const endpoint = type ? `${API_BASE}/api/cms/files/${encodeURIComponent(type)}` : `${API_BASE}/api/cms/files`;
        const response = await fetch(endpoint);
        if (!response.ok) {
            console.warn(`Media API returned ${response.status} for ${type || 'all'}`);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.warn(`Error fetching media for ${type || 'all'}:`, error);
        return null;
    }
}

/**
 * Fetch active logo from CMS
 * GET /api/cms/files/logo
 */
async function fetchLogo() {
    try {
        const data = await fetchMedia('logo');
        return data?.file?.file_url || null;
    } catch (error) {
        console.warn('Error fetching logo:', error);
        return null;
    }
}

/**
 * Fetch active favicon from CMS
 * GET /api/cms/files/favicon
 */
async function fetchFavicon() {
    try {
        const data = await fetchMedia('favicon');
        return data?.file?.file_url || null;
    } catch (error) {
        console.warn('Error fetching favicon:', error);
        return null;
    }
}

/**
 * Fetch active hero image from CMS
 * GET /api/cms/files/hero_image
 */
async function fetchHeroImage() {
    try {
        const data = await fetchMedia('hero_image');
        if (data?.file?.file_url) return data.file.file_url;
        const fallbackHero = await fetchMedia('hero');
        return fallbackHero?.file?.file_url || null;
    } catch (error) {
        console.warn('Error fetching hero image:', error);
        return null;
    }
}

/**
 * Fetch active class images from CMS
 * GET /api/cms/files/class_image
 */
async function fetchClassImages() {
    try {
        const data = await fetchMedia('class_image');
        return data?.files || (data?.file ? [data.file] : []);
    } catch (error) {
        console.warn('Error fetching class images:', error);
        return [];
    }
}

/**
 * Fetch all media assets concurrently
 */
async function fetchAllMedia() {
    try {
        const [logoData, faviconData, heroData, classImgData] = await Promise.allSettled([
            fetchLogo(),
            fetchFavicon(),
            fetchHeroImage(),
            fetchClassImages()
        ]);

        return {
            logo: logoData.status === 'fulfilled' ? logoData.value : null,
            favicon: faviconData.status === 'fulfilled' ? faviconData.value : null,
            hero: heroData.status === 'fulfilled' ? heroData.value : null,
            classImages: classImgData.status === 'fulfilled' && Array.isArray(classImgData.value) ? classImgData.value : []
        };
    } catch (error) {
        console.warn('Error in fetchAllMedia:', error);
        return { logo: null, favicon: null, hero: null, classImages: [] };
    }
}

// ============================================
// Helper Functions
// ============================================

function parseJsonField(field, defaultValue) {
    if (!field) return defaultValue;
    if (typeof field === 'object') return field;
    try {
        return JSON.parse(field);
    } catch {
        return defaultValue;
    }
}

function parseScheduleSlots(slotsData) {
    if (!slotsData) return [];
    let rawList = [];
    if (Array.isArray(slotsData)) {
        rawList = slotsData;
    } else if (typeof slotsData === 'string') {
        try {
            const parsed = JSON.parse(slotsData);
            if (Array.isArray(parsed)) {
                rawList = parsed;
            }
        } catch {
            rawList = [];
        }
    }
    return rawList.map(s => ({
        day: s.day || 'Hari Belajar',
        start_time: s.start_time || s.start || '15:00',
        end_time: s.end_time || s.end || '16:00'
    }));
}

// ============================================
// CMS Render Functions
// ============================================

/**
 * Apply CMS Meta Tags and Custom Theme Styles
 */
function renderMetaAndStyles(cmsData) {
    const meta = cmsData.meta || DEFAULT_FALLBACK_CMS.meta;
    const style = cmsData.style || DEFAULT_FALLBACK_CMS.style;

    // Meta Title
    if (meta.meta_title) {
        document.title = meta.meta_title;
        const titleEl = document.getElementById('meta-title');
        if (titleEl) titleEl.textContent = meta.meta_title;
    }

    // Meta Description
    if (meta.meta_description) {
        const descEl = document.getElementById('meta-description') || document.querySelector('meta[name="description"]');
        if (descEl) descEl.setAttribute('content', meta.meta_description);
    }

    // Meta Keywords
    if (meta.meta_keywords) {
        const keyEl = document.getElementById('meta-keywords') || document.querySelector('meta[name="keywords"]');
        if (keyEl) keyEl.setAttribute('content', meta.meta_keywords);
    }

    // Dynamic Theme Colors & Fonts
    const primaryColor = style.primary_color || '#4A90D9';
    const secondaryColor = style.secondary_color || '#FFD93D';
    const accentColor = style.accent_color || '#FF6B35';

    let customStyleEl = document.getElementById('djuniors-cms-dynamic-styles');
    if (!customStyleEl) {
        customStyleEl = document.createElement('style');
        customStyleEl.id = 'djuniors-cms-dynamic-styles';
        document.head.appendChild(customStyleEl);
    }

    customStyleEl.textContent = `
        :root {
            --primary: ${primaryColor};
            --primary-blue: ${primaryColor};
            --secondary: ${secondaryColor};
            --sunshine-yellow: ${secondaryColor};
            --accent: ${accentColor};
            --happy-orange: ${accentColor};
        }
        ${style.font_body ? `body, p, span, a, input, select, textarea, button { font-family: '${style.font_body}', sans-serif !important; }` : ''}
        ${style.font_heading ? `h1, h2, h3, h4, h5, .logo-text, .section-header h2 { font-family: '${style.font_heading}', cursive, sans-serif !important; }` : ''}
    `;
}

/**
 * Render Logo in Navbar & Footer.
 *
 * Brand: the official wordmark lives at `images/djuniors-logo-wordmark.png`
 * (aspect ratio ~3.17:1, transparent background). Admin can still override
 * via the CMS "Logo" media field — when a custom URL is supplied we
 * generate a Cloudflare-resized variant for retina.
 */
function renderLogo(logoUrl, headerData = {}) {
    // Default = the real wordmark (transparent PNG, 3.17:1 aspect).
    const FALLBACK = 'images/djuniors-logo-wordmark.png';
    const activeLogoUrl = logoUrl ? imageUrl(logoUrl, { width: 280, format: 'auto' }) : FALLBACK;

    // Navbar logo
    const siteLogoImg = document.getElementById('site-logo');
    if (siteLogoImg) {
        siteLogoImg.src = activeLogoUrl;
        siteLogoImg.onerror = function() {
            this.onerror = null;
            this.src = FALLBACK;
        };
        siteLogoImg.style.display = 'inline-block';
    }

    // Footer logo
    const footerLogoImg = document.getElementById('footer-logo');
    if (footerLogoImg) {
        footerLogoImg.src = activeLogoUrl;
        footerLogoImg.onerror = function() {
            this.onerror = null;
            this.src = FALLBACK;
        };
    }

    // Navbar logo text fallback (now empty by default since wordmark has its own text)
    const logoTextEl = document.getElementById('navbar-logo-text');
    if (logoTextEl && (headerData.logo_text || headerData.site_name)) {
        logoTextEl.textContent = headerData.logo_text || headerData.site_name;
    }

    // Footer tagline: prepend "Djuniors Learning Center" if CMS provides just a tagline
    const taglineEl = document.getElementById('footer-tagline');
    if (taglineEl && (headerData.tagline || headerData.footer_tagline)) {
        taglineEl.innerHTML = '<strong>Djuniors Learning Center</strong> — ' + (headerData.tagline || headerData.footer_tagline);
    }
}

/**
 * Render Favicon in Document Head
 * Default: the brand smiley favicon (32px light variant).
 *
 * Note: the static <link rel="icon"> tags in HTML cover most cases via
 * `media="(prefers-color-scheme: ...)"` so the visitor's browser tab adapts
 * automatically. This function only kicks in if the CMS has a custom
 * favicon URL configured (rare).
 */
function renderFavicon(faviconUrl) {
    const FALLBACK = 'images/favicon/favicon-32.png';
    const activeFaviconUrl = faviconUrl ? imageUrl(faviconUrl, { width: 64, format: 'auto' }) : FALLBACK;
    let faviconLink = document.getElementById('site-favicon') || document.querySelector("link[rel*='icon']");

    if (!faviconLink) {
        faviconLink = document.createElement('link');
        faviconLink.id = 'site-favicon';
        faviconLink.rel = 'icon';
        document.head.appendChild(faviconLink);
    }

    faviconLink.href = activeFaviconUrl;
}

/**
 * Render Hero Section Image
 * Hero is the LCP image — load eagerly at native size.
 */
function renderHeroImage(heroImageUrl) {
    const activeHeroUrl = heroImageUrl || DEFAULT_HERO_IMAGE;
    const heroImg = document.getElementById('hero-image');
    if (!heroImg) return;

    // Set src
    heroImg.src = activeHeroUrl;

    // For non-data URLs (real uploads), build srcset via the helper. The CF
    // resizer picks AVIF/WebP based on Accept headers, and serves the closest
    // width to the rendered size.
    if (!activeHeroUrl.startsWith('data:')) {
        const srcset = [];
        [400, 600, 900, 1200].forEach((w) => {
            srcset.push(`${imageUrl(activeHeroUrl, { width: w, format: 'auto', quality: 'auto' })} ${w}w`);
        });
        heroImg.srcset = srcset.join(', ');
        heroImg.sizes = '(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 600px';
    }

    heroImg.onerror = function() {
        this.onerror = null;
        this.src = DEFAULT_HERO_IMAGE;
    };
}

/**
 * Render Header & Navbar
 */
function renderHeader(headerData = {}, logoUrl = null) {
    const data = { ...DEFAULT_FALLBACK_CMS.header, ...headerData };

    const logoTextEl = document.getElementById('navbar-logo-text');
    if (logoTextEl) {
        logoTextEl.textContent = data.logo_text || data.site_name || 'Djuniors';
    }

    // Update logo image
    renderLogo(logoUrl, data);

    const ctaBtn = document.getElementById('navbar-cta-btn');
    if (ctaBtn && data.cta_button_text) {
        ctaBtn.textContent = data.cta_button_text;
    }

    const navItems = parseJsonField(data.nav_items, DEFAULT_FALLBACK_CMS.header.nav_items);
    const navMenu = document.getElementById('navbar-menu');
    if (navMenu && Array.isArray(navItems) && navItems.length > 0) {
        const ctaText = data.cta_button_text || 'Daftar Sekarang';
        const itemsHtml = navItems.map(item => `
            <li><a href="${item.href}">${item.label}</a></li>
        `).join('');

        navMenu.innerHTML = `
            ${itemsHtml}
            <li><a href="daftar.html" class="btn-nav" id="navbar-cta-btn">${ctaText}</a></li>
        `;
    }

    // Sync footer nav links
    const footerNav = document.getElementById('footer-nav-links');
    if (footerNav && Array.isArray(navItems)) {
        footerNav.innerHTML = navItems.map(item => `
            <li><a href="${item.href}">${item.label}</a></li>
        `).join('') + '<li><a href="daftar.html">Daftar Sekarang</a></li>';
    }
}

/**
 * Render Hero Section
 */
function renderHero(heroData = {}, heroImageUrl = null) {
    const data = { ...DEFAULT_FALLBACK_CMS.hero, ...heroData };

    const titleEl = document.getElementById('hero-title');
    if (titleEl && data.hero_title) {
        const badge = data.hero_badge ? `<span id="hero-badge">${data.hero_badge}</span>` : '';
        // If hero_title contains breaklines or highlight
        if (data.hero_title.includes('<span')) {
            titleEl.innerHTML = `${data.hero_title} ${badge}`;
        } else {
            const formatted = data.hero_title.replace(/\n/g, '<br>');
            titleEl.innerHTML = `${formatted} ${badge}`;
        }
    }

    const subEl = document.getElementById('hero-subtitle');
    if (subEl && data.hero_subtitle) {
        subEl.innerHTML = data.hero_subtitle.replace(/\n/g, '<br>');
    }

    const ctaBtn = document.getElementById('hero-cta-btn');
    if (ctaBtn) {
        if (data.hero_cta_text) ctaBtn.textContent = data.hero_cta_text;
        if (data.hero_cta_link) ctaBtn.setAttribute('href', data.hero_cta_link);
    }

    renderHeroImage(heroImageUrl);
}

/**
 * Render Features Section
 */
function renderFeatures(featuresData = {}) {
    const data = { ...DEFAULT_FALLBACK_CMS.features, ...featuresData };

    const titleEl = document.getElementById('features-title');
    if (titleEl && data.features_title) {
        titleEl.innerHTML = data.features_title.includes('<span') ? data.features_title : `${data.features_title} 🌟`;
    }

    const subEl = document.getElementById('features-subtitle');
    if (subEl && data.features_subtitle) {
        subEl.textContent = data.features_subtitle;
    }

    const items = parseJsonField(data.features_items, DEFAULT_FALLBACK_CMS.features.features_items);
    const grid = document.getElementById('features-grid');
    if (grid && Array.isArray(items) && items.length > 0) {
        const colors = ['blue', 'green', 'orange', 'pink', 'purple', 'teal'];
        grid.innerHTML = items.map((item, idx) => {
            const color = colors[idx % colors.length];
            return `
                <div class="feature-card" data-color="${color}">
                    <div class="feature-icon">${item.icon || '⭐'}</div>
                    <h3>${item.title || 'Keunggulan'}</h3>
                    <p>${item.description || ''}</p>
                </div>
            `;
        }).join('');
    }
}

/**
 * Render Classes Section Header
 */
function renderClassesSection(classesData = {}) {
    const data = { ...DEFAULT_FALLBACK_CMS.classes, ...classesData };

    const titleEl = document.getElementById('classes-title');
    if (titleEl && data.classes_title) {
        titleEl.innerHTML = data.classes_title.includes('<span') ? data.classes_title : `${data.classes_title} 🧮`;
    }

    const subEl = document.getElementById('classes-subtitle');
    if (subEl && data.classes_subtitle) {
        subEl.textContent = data.classes_subtitle;
    }
}

/**
 * Render Testimonials Section
 */
function renderTestimonials(testimonialsData = {}) {
    const data = { ...DEFAULT_FALLBACK_CMS.testimonials, ...testimonialsData };

    const titleEl = document.getElementById('testimonials-title');
    if (titleEl && data.testimonials_title) {
        titleEl.innerHTML = data.testimonials_title.includes('<span') ? data.testimonials_title : `${data.testimonials_title} 🥰`;
    }

    const subEl = document.getElementById('testimonials-subtitle');
    if (subEl && data.testimonials_subtitle) {
        subEl.textContent = data.testimonials_subtitle;
    }

    const items = parseJsonField(data.testimonials_items, DEFAULT_FALLBACK_CMS.testimonials.testimonials_items);
    const grid = document.getElementById('testimonials-grid');
    if (grid && Array.isArray(items) && items.length > 0) {
        const avatars = ['👩', '👨', '👩‍🦰', '👨‍🦱', '👩‍💼'];
        grid.innerHTML = items.map((t, idx) => {
            const isFeatured = idx === 1;
            const stars = '⭐'.repeat(Number(t.rating) || 5);
            const avatar = avatars[idx % avatars.length];
            return `
                <div class="testimonial-card ${isFeatured ? 'featured' : ''}">
                    <div class="testimonial-stars">${stars}</div>
                    <p class="testimonial-text">"${t.text || ''}"</p>
                    <div class="testimonial-author">
                        <div class="author-avatar">${avatar}</div>
                        <div class="author-info">
                            <strong>${t.name || 'Orang Tua'}</strong>
                            <span>${t.relation || 'Wali Murid'}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

/**
 * Render CTA Section
 */
function renderCTA(ctaData = {}) {
    const data = { ...DEFAULT_FALLBACK_CMS.cta, ...ctaData };

    const titleEl = document.getElementById('cta-title');
    if (titleEl && data.cta_title) {
        titleEl.textContent = data.cta_title;
    }

    const subEl = document.getElementById('cta-subtitle');
    if (subEl && data.cta_subtitle) {
        subEl.textContent = data.cta_subtitle;
    }

    const btnTextEl = document.getElementById('cta-btn-text');
    if (btnTextEl && data.cta_button_text) {
        btnTextEl.textContent = data.cta_button_text;
    }
}

/**
 * Render Footer Section
 */
function renderFooter(footerData = {}) {
    const data = { ...DEFAULT_FALLBACK_CMS.footer, ...footerData };

    const logoTextEl = document.getElementById('footer-logo-text');
    if (logoTextEl) {
        logoTextEl.textContent = data.logo_text || 'Djuniors';
    }

    const taglineEl = document.getElementById('footer-tagline');
    if (taglineEl && data.footer_tagline) {
        // Always brand the tagline so "Djuniors Learning Center" reaches the
        // visitor even when the CMS admin only fills the tag phrase.
        taglineEl.innerHTML = `<strong>Djuniors Learning Center</strong> — ${data.footer_tagline}`;
    }

    const emailEl = document.getElementById('footer-email');
    if (emailEl && data.footer_email) {
        emailEl.textContent = `📧 ${data.footer_email}`;
    }

    const phoneEl = document.getElementById('footer-phone');
    if (phoneEl && data.footer_phone) {
        phoneEl.textContent = `📱 ${data.footer_phone}`;
    }

    const addressEl = document.getElementById('footer-address');
    if (addressEl && data.footer_address) {
        addressEl.textContent = `📍 ${data.footer_address}`;
    }

    const copyrightEl = document.getElementById('footer-copyright');
    if (copyrightEl && data.copyright) {
        copyrightEl.textContent = `© ${data.copyright}. Dibuat dengan ❤️ untuk anak Indonesia.`;
    }

    // Social media links (icons appear if a non-empty url is set in CMS).
    renderSocialLinks(data.social_links);
}

/**
 * Render the footer social-media bar.
 *
 * The CMS stores a JSON array under `cms_content.footer.social_links` where
 * each entry is `{ platform, label, url, icon, order }`. We render only
 * entries with a non-empty URL (admin leaves Telegram/others with `url=''`
 * to hide them until they're ready).
 *
 * Icons: known platforms get their official brand SVG (from simple-icons,
 * CC0) rendered inline — monochrome glyphs that inherit the footer's white
 * color and match the real platform identity. Unknown/custom platforms fall
 * back to the emoji stored in the CMS entry.
 */
const SOCIAL_BRAND_SVGS = {
    facebook: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647',
    instagram: 'M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z',
    tiktok: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z',
    youtube: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
    whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z',
    telegram: 'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
    x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
    linkedin: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z',
    threads: 'M16.525 10.525c-.178-.087-.359-.17-.542-.254-.308-4.2-2.63-6.609-6.733-6.674-.003 0-.163-.001-.167-.001-3.61 0-5.914 2.229-6.053 5.898-.087 2.301.582 4.212 1.935 5.509 1.114 1.068 2.646 1.586 4.473 1.466.046-.114.088-.23.126-.348.242-.758.322-1.728.245-2.75-.003-.038-.005-.076-.008-.114-.08-1.06-.16-2.156.354-2.96.357-.557.978-.886 1.822-.963.666.06 1.152.362 1.414.883.398.79.255 1.78-.063 2.637l-.026.07c-.363.983-1.066 2.167-2.236 2.981.093.195.2.381.32.557.63.835 1.548 1.306 2.657 1.363 3.08-.093 4.958-2.987 5.045-5.684.07-2.166-.696-3.922-2.213-5.088-1.364-1.047-3.244-1.482-5.357-1.238l.152.985c1.833-.211 3.435.157 4.56 1.02 1.225.94 1.838 2.373 1.778 4.147-.07 2.173-1.542 4.462-4.083 4.552-.788-.043-1.386-.358-1.823-.956 1.187-.939 1.887-2.202 2.26-3.21l.026-.071c.28-.757.416-1.7.063-2.4-.382-.758-1.198-1.168-2.29-1.154-1.198.099-2.104.592-2.623 1.402-.668 1.042-.562 2.388-.472 3.578.002.028.005.056.007.084.063.855.015 1.636-.135 2.219-.064.25-.145.471-.241.664-.452-.11-.858-.296-1.205-.566-1.083-.841-1.609-2.425-1.543-4.204.115-2.979 1.878-4.896 4.712-4.896l.151.001c3.36.053 5.263 1.964 5.506 5.535-1.012.382-1.85 1.04-2.426 1.94-.696 1.087-.9 2.416-.656 3.646.095.478.251.923.466 1.33.128.243.273.47.434.681-.152.033-.312.05-.48.05-1.39 0-2.519-.86-3.08-1.453-.464.325-1.008.616-1.638.864.63.882 2.062 2.21 4.147 2.21 3.954 0 7.037-3.12 7.116-6.535.06-2.583-1.062-4.568-2.63-5.905z',
    discord: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.2216-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.0922 2.4189Z',
};

function renderSocialLinks(socialJson) {
    const container = document.getElementById('footer-social-links');
    if (!container) return;

    let links = [];
    try {
        links = typeof socialJson === 'string' ? JSON.parse(socialJson) : (socialJson || []);
    } catch (err) {
        console.warn('[social-links] failed to parse:', err);
        links = [];
    }
    if (!Array.isArray(links)) links = [];

    // Filter & sort
    const visible = links
        .filter(l => l && typeof l.url === 'string' && l.url.trim() !== '' && l.url.trim() !== '#')
        .sort((a, b) => (a.order || 99) - (b.order || 99));

    // XSS-safe: build with DOM APIs instead of innerHTML
    container.textContent = '';
    if (visible.length === 0) {
        // Optionally hide the whole row when no platforms are configured.
        container.style.display = 'none';
        return;
    }
    container.style.display = '';

    for (const link of visible) {
        const a = document.createElement('a');
        a.href = link.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', link.label || link.platform);
        a.title = link.label || link.platform;

        const platform = (link.platform || '').toLowerCase().trim();
        const svgPath = SOCIAL_BRAND_SVGS[platform];
        if (svgPath) {
            // Official brand glyph (simple-icons, CC0) — monochrome SVG that
            // inherits color from CSS (footer text color), so it adapts to
            // theme automatically. Brand color per platform as accent.
            const BRAND_COLORS = {
                facebook: '#1877F2', instagram: '#E4405F', tiktok: '#FFFFFF',
                youtube: '#FF0000', whatsapp: '#25D366', telegram: '#26A5E4',
                x: '#FFFFFF', linkedin: '#0A66C2', threads: '#FFFFFF', discord: '#5865F2',
            };
            const ns = 'http://www.w3.org/2000/svg';
            const svg = document.createElementNS(ns, 'svg');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('width', '22');
            svg.setAttribute('height', '22');
            svg.setAttribute('aria-hidden', 'true');
            svg.setAttribute('fill', BRAND_COLORS[platform] || 'currentColor');
            svg.style.display = 'block';
            const path = document.createElementNS(ns, 'path');
            path.setAttribute('d', svgPath);
            svg.appendChild(path);
            a.appendChild(svg);
        } else {
            // Unknown/custom platform: fall back to the emoji stored in CMS.
            const glyph = document.createElement('span');
            glyph.setAttribute('aria-hidden', 'true');
            glyph.textContent = link.icon || '🔗';
            glyph.style.fontSize = '1.2rem';
            a.appendChild(glyph);
        }
        container.appendChild(a);
    }
}

/**
 * Render dynamic levels in Features section
 */
function renderLevels(levels) {
    const container = document.getElementById('levels-grid');
    if (!container) return;

    if (!levels || levels.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #636e72; grid-column: 1/-1;">Belum ada jenjang program belajar yang tersedia.</p>';
        return;
    }

    const icons = ['🐣', '🎒', '🚀', '🧮', '📐', '⭐'];
    const colors = ['blue', 'green', 'orange', 'pink'];

    container.innerHTML = levels.map((level, index) => {
        const icon = icons[index % icons.length];
        const color = colors[index % colors.length];
        const ageRange = (level.min_age && level.max_age)
            ? `Usia ${level.min_age} - ${level.max_age} Tahun`
            : (level.grade_range || 'Semua Usia');

        return `
            <div class="level-card" data-color="${color}">
                <div class="feature-icon">${icon}</div>
                <span class="level-badge-tag">${level.grade_range || level.name}</span>
                <h3>Level ${level.name}</h3>
                <div class="level-age-badge">${ageRange}</div>
                <p>${level.description || 'Program belajar interaktif yang dirancang khusus untuk perkembangan logika dan matematika anak.'}</p>
                <a href="daftar.html?level=${encodeURIComponent(level.id)}" class="btn-level">Daftar Level Ini →</a>
            </div>
        `;
    }).join('');
}

/**
 * Render dynamic classes in Classes section with CMS media images
 */
function renderClasses(classes, classImages = []) {
    const container = document.getElementById('classes-grid');
    if (!container) return;

    if (!classes || classes.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #636e72; grid-column: 1/-1;">Belum ada pilihan kelas yang tersedia saat ini.</p>';
        return;
    }

    container.innerHTML = classes.map((cls, index) => {
        const isPopular = index === 1 || classes.length === 1;
        const levelBadge = cls.level_name ? cls.level_name.toUpperCase() : 'SEMUA LEVEL';
        const priceFormatted = Number(cls.price) === 0
            ? 'Gratis'
            : `Rp ${Number(cls.price).toLocaleString('id-ID')}`;
        const slots = parseScheduleSlots(cls.schedule_slots);

        // Find associated class image: 1) cls.image_url from DB, 2) CMS media, 3) default
        let classImgUrl = DEFAULT_CLASS_IMAGE;
        if (cls.image_url) {
            classImgUrl = cls.image_url;
        } else if (Array.isArray(classImages) && classImages.length > 0) {
            const matched = classImages.find(img => {
                if (!img) return false;
                const meta = typeof img.metadata === 'string' ? parseJsonField(img.metadata, {}) : (img.metadata || {});
                return (
                    meta.class_id === cls.id ||
                    meta.class_id === String(cls.id) ||
                    (img.name && img.name.toLowerCase().includes(cls.name.toLowerCase()))
                );
            });
            if (matched && matched.file_url) {
                classImgUrl = matched.file_url;
            } else if (classImages[0] && classImages[0].file_url) {
                // Fallback to class image from history
                classImgUrl = classImages[index % classImages.length].file_url || DEFAULT_CLASS_IMAGE;
            }
        }

        const slotsHtml = slots.length > 0
            ? slots.map(s => `
                <div class="class-slot-badge">
                    <span>⏰</span>
                    <span><strong>${s.day}</strong>: ${s.start_time} - ${s.end_time} WIB</span>
                </div>
            `).join('')
            : '<div class="class-slot-empty">Jadwal fleksibel / konfirmasi via WhatsApp</div>';

        return `
            <div class="class-card ${isPopular ? 'popular' : ''}">
                ${isPopular ? '<div class="class-badge-popular">⭐ POPULER</div>' : ''}
                <div class="class-image-container">
                    <img ${imageAttrs(classImgUrl, {
                        className: 'class-image',
                        alt: cls.name,
                        width: 400,
                        height: 220,
                        sizes: '(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 400px',
                        fallback: DEFAULT_CLASS_IMAGE
                    })}>
                </div>
                <div class="class-level-tag">${levelBadge}</div>
                <h3 class="class-title">${cls.name}</h3>
                <div class="class-price">
                    <span class="price-val">${priceFormatted}</span>
                    <span class="price-unit">/ bulan</span>
                </div>
                <p class="class-desc">${cls.description || 'Program interaktif live via Google Meet bersama mentor berpengalaman.'}</p>
                <div class="class-capacity">
                    👥 Maks. ${cls.max_students || 8} siswa per kelas
                </div>
                <div class="class-schedules">
                    <div class="schedule-title">📅 Pilihan Jadwal Belajar:</div>
                    ${slotsHtml}
                </div>
                <a href="daftar.html?class=${encodeURIComponent(cls.id)}" class="btn-class ${isPopular ? 'btn-popular' : ''}">
                    Pilih Kelas Ini →
                </a>
            </div>
        `;
    }).join('');
}

/**
 * Initialize and load dynamic data on the landing page
 */
async function initLandingData() {
    try {
        const [cmsData, levels, classes, media] = await Promise.all([
            fetchCmsData(),
            fetchLevels(),
            fetchClasses(),
            fetchAllMedia()
        ]);

        // Render all CMS sections
        if (cmsData) {
            renderMetaAndStyles(cmsData);
            renderHeader(cmsData.header, media?.logo);
            renderHero(cmsData.hero, media?.hero);
            renderFeatures(cmsData.features);
            renderClassesSection(cmsData.classes);
            renderTestimonials(cmsData.testimonials);
            renderCTA(cmsData.cta);
            renderFooter(cmsData.footer);
        }

        // Render CMS Media (Logo, Favicon, Hero)
        if (media) {
            renderLogo(media.logo, cmsData?.header);
            renderFavicon(media.favicon);
            renderHeroImage(media.hero);
        }

        // Render dynamic database levels & classes with CMS class images
        renderLevels(levels);
        renderClasses(classes, media?.classImages || []);
    } catch (error) {
        console.error('Error initializing landing page data:', error);
    }
}

// ============================================
// DOM Content Loaded Handler & Interactivity
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Load dynamic data from backend API
    initLandingData();

    // Mobile Navigation Toggle
    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });

        // Close mobile menu when clicking any link inside nav-menu (event delegation persists across CMS re-renders)
        navMenu.addEventListener('click', (e) => {
            if (e.target.closest('a')) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#') && href.length > 1) {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });

    // Navbar background on scroll
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.style.boxShadow = '0 5px 30px rgba(0,0,0,0.15)';
            } else {
                navbar.style.boxShadow = '0 2px 20px rgba(0,0,0,0.1)';
            }
        }
    });

    // Scroll reveal animation
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all sections
    document.querySelectorAll('section').forEach(section => {
        section.classList.add('reveal');
        observer.observe(section);
    });

    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(button => {
        button.addEventListener('click', () => {
            const faqItem = button.parentElement;
            const isActive = faqItem.classList.contains('active');

            // Close all
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });

            // Open clicked (if not already open)
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });

    // Confetti effect on CTA button
    const confettiBtn = document.getElementById('confetti-btn');
    if (confettiBtn) {
        confettiBtn.addEventListener('click', (e) => {
            createConfetti(e.clientX, e.clientY);
        });
    }

    // Stats counter animation
    const stats = document.querySelectorAll('.stat-number');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    stats.forEach(stat => statsObserver.observe(stat));

    // Floating numbers parallax
    document.addEventListener('mousemove', (e) => {
        const numbers = document.querySelectorAll('.number');
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        numbers.forEach((number, index) => {
            const speed = (index + 1) * 0.5;
            const xOffset = (x - 0.5) * speed * 20;
            const yOffset = (y - 0.5) * speed * 20;
            number.style.transform = `translate(${xOffset}px, ${yOffset}px)`;
        });
    });

    // Button ripple effect
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-primary, .btn-cta, .btn-pricing, .btn-level, .btn-class');
        if (!btn) return;

        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            background: rgba(255,255,255,0.5);
            border-radius: 50%;
            transform: scale(0);
            animation: ripple 0.6s linear;
            pointer-events: none;
        `;
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${e.clientX - rect.left - size/2}px`;
        ripple.style.top = `${e.clientY - rect.top - size/2}px`;
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });

    console.log('🧮 Djuniors Landing Page loaded successfully with CMS dynamic content!');
});

// Confetti function
function createConfetti(x, y) {
    const colors = ['#FFD93D', '#FF6B35', '#6BCB77', '#4A90D9', '#FF9CEE'];

    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            width: 10px;
            height: 10px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            z-index: 9999;
            animation: confettiFall 1s ease-out forwards;
        `;

        const angle = Math.random() * Math.PI * 2;
        const velocity = 100 + Math.random() * 100;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;

        confetti.style.setProperty('--vx', `${vx}px`);
        confetti.style.setProperty('--vy', `${vy}px`);

        document.body.appendChild(confetti);

        setTimeout(() => confetti.remove(), 1000);
    }
}

// Counter animation function
function animateCounter(element) {
    const target = parseFloat(element.dataset.target);
    const isDecimal = target % 1 !== 0;
    const duration = 2000;
    const start = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = target * easeOut;

        if (isDecimal) {
            element.textContent = current.toFixed(1);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}
