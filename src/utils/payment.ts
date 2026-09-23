// ============================================
// Djuniors - Payment Utilities (Manual Transfer)
// ============================================

import { BankAccount } from '../types';

/**
 * Get active bank accounts from database
 */
export async function getBankAccounts(db: D1Database): Promise<BankAccount[]> {
    const result = await db.prepare(
        'SELECT * FROM bank_accounts WHERE is_active = 1'
    ).all();
    return result.results as unknown as BankAccount[];
}

/**
 * Get bank account by ID
 */
export async function getBankAccountById(db: D1Database, id: string): Promise<BankAccount | null> {
    const result = await db.prepare(
        'SELECT * FROM bank_accounts WHERE id = ? AND is_active = 1'
    ).bind(id).first();
    return result as BankAccount | null;
}

/**
 * Generate payment instruction message
 */
export function generatePaymentInstruction(
    bank: BankAccount,
    amount: number,
    orderId: string
): string {
    return `💳 *Instruksi Pembayaran*

🏦 Bank: *${bank.bank_name}*
📄 No. Rekening: *${bank.account_number}*
👤 Atas Nama: *${bank.account_name}*
💰 Nominal: *Rp ${amount.toLocaleString('id-ID')}*
🔖 Kode Pesanan: *${orderId}*

⚠️ *PENTING:*
Transfer tepat sampai digit terakhir (contoh: Rp 99.001)
Agar pembayaran bisa otomatis terdeteksi!

📸 Setelah transfer, kirim bukti transfer ke admin.`;
}

/**
 * Generate unique amount with random suffix (for auto-detection)
 * Example: 99000 → 99123
 */
export function generateUniqueAmount(baseAmount: number): number {
    const randomSuffix = Math.floor(Math.random() * 900) + 100; // 100-999
    return baseAmount + randomSuffix;
}

/**
 * Format currency to Indonesian Rupiah
 */
export function formatRupiah(amount: number): string {
    return `Rp ${amount.toLocaleString('id-ID')}`;
}

/**
 * Validate payment amount (check if within tolerance)
 */
export function validatePaymentAmount(
    expectedAmount: number,
    receivedAmount: number,
    tolerance: number = 1000
): boolean {
    return Math.abs(expectedAmount - receivedAmount) <= tolerance;
}

/**
 * Simpan bukti bayar ke R2.
 *
 * Halaman lacak mengirim bukti sebagai data-URL base64 (JSON). Menyimpannya
 * mentah-mentah ke D1 membesar-besarkan baris & tidak bisa di-cache, jadi
 * kita konversi ke object R2 dan kembalikan URL publik `/api/files/...`.
 *
 * Bila `proofUrl` bukan data-URL (mis. sudah URL) atau R2 tidak tersedia,
 * nilai asli dikembalikan apa adanya.
 */
export async function saveProofToR2(
    env: { R2?: R2Bucket },
    keyBase: string,
    proofUrl: string
): Promise<string> {
    if (!proofUrl || !proofUrl.startsWith('data:') || !env.R2) {
        return proofUrl;
    }
    try {
        const match = proofUrl.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/);
        if (!match) return proofUrl;
        const mime = match[1] || 'image/jpeg';
        const isBase64 = Boolean(match[2]);
        const payload = match[3];
        const ext = mime.includes('png') ? 'png'
            : mime.includes('webp') ? 'webp'
            : mime.includes('gif') ? 'gif'
            : 'jpg';
        const bytes = isBase64
            ? Uint8Array.from(atob(payload), (ch) => ch.charCodeAt(0))
            : new TextEncoder().encode(decodeURIComponent(payload));
        const key = `${keyBase}.${ext}`;
        await env.R2.put(key, bytes.buffer as ArrayBuffer, {
            httpMetadata: { contentType: mime },
        });
        return `/api/files/${key}`;
    } catch (err) {
        // Fallback: simpan data-URL asli agar upload tetap berhasil.
        console.warn('[proof] R2 save failed:', (err as Error).message);
        return proofUrl;
    }
}
