// ============================================
// Djuniors - Fonnte WhatsApp API Integration
// ============================================

// Fonnte token management — stored in D1 settings table, editable from dashboard Settings.
// Falls back to env var WA_FONNTE_TOKEN for backward compatibility.

const FONNTE_TOKEN_KEY = 'fonnte_token';

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
 * Send WhatsApp message via Fonnte API
 * Docs: https://fonnte.com/api
 */
export async function sendWAFonnte(
    config: FonnteConfig,
    phone: string,
    message: string,
    options?: { typing?: boolean; delay?: number }
): Promise<FonnteResponse> {
    const baseUrl = config.baseUrl || 'https://api.fonnte.com';

    // Format phone number (remove + or spaces, ensure starts with country code)
    let formattedPhone = phone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '62' + formattedPhone.substring(1);
    }

    try {
        const response = await fetch(`${baseUrl}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': config.token
            },
            body: JSON.stringify({
                target: formattedPhone,
                message: message,
                typing: options?.typing ?? true,
                delay: options?.delay ?? 0
            })
        });

        const data = await response.json() as any;

        return {
            status: data.status || false,
            message: data.message,
            id: data.id
        };
    } catch (error) {
        console.error('Fonnte API error:', error);
        return {
            status: false,
            message: 'Failed to send message'
        };
    }
}

/**
 * Send bulk WhatsApp messages via Fonnte
 */
export async function sendBulkWAFonnte(
    config: FonnteConfig,
    targets: Array<{ phone: string; message: string }>
): Promise<FonnteResponse> {
    const baseUrl = config.baseUrl || 'https://api.fonnte.com';

    const formattedTargets = targets.map(t => {
        let formattedPhone = t.phone.replace(/[^0-9]/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.substring(1);
        }
        return {
            target: formattedPhone,
            message: t.message
        };
    });

    try {
        const response = await fetch(`${baseUrl}/sendBulk`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': config.token
            },
            body: JSON.stringify({
                targets: formattedTargets,
                typing: true,
                delay: 1000 // 1 second delay between messages
            })
        });

        const data = await response.json() as any;

        return {
            status: data.status || false,
            message: data.message
        };
    } catch (error) {
        console.error('Fonnte bulk API error:', error);
        return {
            status: false,
            message: 'Failed to send bulk messages'
        };
    }
}

/**
 * Check Fonnte API connection status
 */
export async function checkFonnteStatus(config: FonnteConfig): Promise<boolean> {
    const baseUrl = config.baseUrl || 'https://api.fonnte.com';

    try {
        const response = await fetch(`${baseUrl}/status`, {
            headers: {
                'Authorization': config.token
            }
        });

        const data = await response.json() as any;
        return data.status === true;
    } catch {
        return false;
    }
}

/**
 * WA Message Templates (Fonnte format)
 */
export const FonnteTemplates = {
    welcome: (name: string) =>
        `🎮 *Selamat Datang di Djuniors!* 🎉\n\nHalo ${name}!\n\nTerima kasih sudah bergabung dengan Djuniors. Siap belajar matematika jadi seru? 🚀\n\n📞 Hubungi kami jika ada pertanyaan!\n🌐 www.djuniors.id`,

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
