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
