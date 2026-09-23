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

// ============================================
// Info pembayaran (metode → rekening yang sesuai)
// ============================================
// Detail pembayaran hanya ditampilkan SETELAH pendaftaran dibuat, dan hanya
// untuk metode yang benar-benar dipilih pendaftar. Rekening default per metode
// dipilih server-side (bukan dari client) agar tidak bisa dipalsukan.

export type PaymentMethod = 'bank_transfer' | 'ewallet' | 'qris';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
    bank_transfer: 'Transfer Bank',
    ewallet: 'E-Wallet',
    qris: 'QRIS',
};

/** Normalisasi input metode pembayaran apa pun ke salah satu metode resmi. */
export function normalizePaymentMethod(value: unknown): PaymentMethod {
    const v = String(value || '').trim().toLowerCase();
    if (v === 'qris') return 'qris';
    if (v === 'ewallet' || v === 'e-wallet' || v === 'wallet' || v === 'dana') return 'ewallet';
    return 'bank_transfer';
}

/** Tipe akun pembayaran yang dipakai tiap metode. */
function accountTypeForMethod(method: PaymentMethod): 'bank' | 'ewallet' | 'qris' {
    if (method === 'qris') return 'qris';
    if (method === 'ewallet') return 'ewallet';
    return 'bank';
}

/**
 * Ambil rekening default untuk sebuah metode pembayaran.
 *
 * Urutan: akun aktif bertipe sesuai metode → (khusus transfer bank) akun aktif
 * apa pun sebagai fallback data lama yang belum punya kolom `type`.
 */
export async function getDefaultPaymentAccount(
    db: D1Database,
    method: PaymentMethod
): Promise<BankAccount | null> {
    const wanted = accountTypeForMethod(method);
    const typed = await db.prepare(
        `SELECT * FROM bank_accounts
          WHERE is_active = 1 AND COALESCE(type, 'bank') = ?
          ORDER BY created_at ASC LIMIT 1`
    ).bind(wanted).first();
    if (typed) return typed as unknown as BankAccount;

    if (method === 'bank_transfer') {
        const fallback = await db.prepare(
            'SELECT * FROM bank_accounts WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1'
        ).first();
        return (fallback as unknown as BankAccount) || null;
    }
    return null;
}

export interface PaymentInfo {
    method: PaymentMethod;
    method_label: string;
    /** Nominal yang harus ditransfer (tagihan + kode unik). */
    amount: number;
    /** Tagihan asli sebelum kode unik ditambahkan. */
    base_amount: number;
    /** Kode unik yang ditambahkan ke nominal (0 bila fitur dimatikan). */
    unique_code: number;
    account: { name: string; number: string; holder: string } | null;
    instructions: string;
}

/**
 * Susun info pembayaran lengkap (metode + rekening + nominal + instruksi)
 * yang aman dikirim ke halaman publik/popup pendaftaran.
 *
 * `amount` adalah nominal yang harus ditransfer; bila ada `uniqueCode`, nominal
 * tagihan aslinya tetap dilaporkan lewat `base_amount` supaya pendaftar paham
 * angka unik itu bagian dari tagihan.
 */
export function buildPaymentInfo(params: {
    method: unknown;
    amount: number;
    account: { bank_name?: string | null; account_number?: string | null; account_name?: string | null } | null;
    registrationNumber?: string | null;
    uniqueCode?: number;
}): PaymentInfo {
    const method = normalizePaymentMethod(params.method);
    const amount = Math.max(0, Number(params.amount) || 0);
    const acc = params.account;
    const hasAccount = Boolean(acc && (acc.account_number || acc.bank_name));
    const uniqueCode = Math.max(0, Math.floor(Number(params.uniqueCode) || 0));
    const baseAmount = Math.max(0, amount - uniqueCode);

    const account = hasAccount
        ? {
            name: String(acc!.bank_name || ''),
            number: String(acc!.account_number || ''),
            holder: String(acc!.account_name || ''),
        }
        : null;

    const nominal = `Rp ${amount.toLocaleString('id-ID')}`;
    const uniqueNote = uniqueCode > 0
        ? ` Transfer tepat ${nominal} (tagihan Rp ${baseAmount.toLocaleString('id-ID')} + kode unik ${uniqueCode}) agar pembayaran Anda mudah dicocokkan.`
        : '';
    let instructions: string;
    if (!hasAccount) {
        instructions =
            'Detail pembayaran belum tersedia. Silakan hubungi admin D’Juniors untuk instruksi transfer.';
    } else if (method === 'qris') {
        instructions = `Scan QRIS resmi D’Juniors sebesar ${nominal}, lalu unggah bukti pembayaran Anda.${uniqueNote}`;
    } else if (method === 'ewallet') {
        instructions = `Kirim saldo ${nominal} ke ${account!.name} ${account!.number} (a.n. ${account!.holder}), lalu unggah bukti pembayaran Anda.${uniqueNote}`;
    } else {
        instructions = `Transfer ${nominal} ke ${account!.name} ${account!.number} (a.n. ${account!.holder}), lalu unggah bukti pembayaran Anda.${uniqueNote}`;
    }

    return {
        method,
        method_label: PAYMENT_METHOD_LABELS[method],
        amount,
        base_amount: baseAmount,
        unique_code: uniqueCode,
        account,
        instructions,
    };
}

/** Masking nomor telepon untuk tampilan publik: 0812****8206 */
export function maskPhone(phone: unknown): string {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 7) return digits ? '****' : '-';
    return `${digits.slice(0, 4)}****${digits.slice(-3)}`;
}

// ============================================
// Metode pembayaran yang diatur admin
// ============================================
// Admin "mengatur" metode pembayaran dengan menambahkan rekening bertipe
// bank / ewallet / qris di Pengaturan Sistem → Rekening. Pendaftar hanya boleh
// memilih dari metode yang benar-benar tersedia, dan info pembayaran yang
// tampil mengikuti pilihan mereka.

export interface PaymentMethodOption {
    method: PaymentMethod;
    label: string;
    icon: string;
}

const METHOD_ICONS: Record<PaymentMethod, string> = {
    bank_transfer: '🏦',
    ewallet: '💳',
    qris: '📱',
};

/** Urutan tampil metode di form pendaftaran. */
const METHOD_ORDER: PaymentMethod[] = ['bank_transfer', 'ewallet', 'qris'];

function toOption(method: PaymentMethod): PaymentMethodOption {
    return { method, label: PAYMENT_METHOD_LABELS[method], icon: METHOD_ICONS[method] };
}

/**
 * Daftar metode pembayaran yang aktif (punya minimal satu akun aktif).
 * Bila admin belum mengatur satu pun rekening, kembalikan Transfer Bank sebagai
 * default agar alur pendaftaran tidak buntu (server akan memakai fallback akun
 * pertama yang aktif, atau memberi instruksi "hubungi admin").
 */
export async function getAvailablePaymentMethods(db: D1Database): Promise<PaymentMethodOption[]> {
    const rows = await db.prepare(
        `SELECT DISTINCT COALESCE(type, 'bank') AS type
           FROM bank_accounts
          WHERE is_active = 1`
    ).all();

    const available = new Set((rows.results || []).map((r: any) => String(r.type)));
    const options = METHOD_ORDER
        .filter((method) => available.has(accountTypeForMethod(method)))
        .map(toOption);

    return options.length > 0 ? options : [toOption('bank_transfer')];
}

/** Apakah sebuah metode pembayaran punya akun aktif (siap dipakai pendaftar)? */
export async function isPaymentMethodAvailable(
    db: D1Database,
    method: PaymentMethod
): Promise<boolean> {
    const row = await db.prepare(
        `SELECT id FROM bank_accounts
          WHERE is_active = 1 AND COALESCE(type, 'bank') = ?
          LIMIT 1`
    ).bind(accountTypeForMethod(method)).first();
    return Boolean(row);
}

/**
 * Pilih metode pembayaran efektif untuk sebuah pendaftaran.
 * Metode pilihan pendaftar dipakai bila tersedia; kalau tidak (mis. admin baru
 * menonaktifkan rekeningnya), jatuh ke metode pertama yang tersedia agar
 * pendaftaran tidak gagal.
 */
export async function resolvePaymentMethod(
    db: D1Database,
    requested: unknown
): Promise<{ method: PaymentMethod; adjusted: boolean }> {
    const wanted = normalizePaymentMethod(requested);
    if (await isPaymentMethodAvailable(db, wanted)) {
        return { method: wanted, adjusted: false };
    }
    const options = await getAvailablePaymentMethods(db);
    const fallback = options[0]?.method || 'bank_transfer';
    return { method: fallback, adjusted: fallback !== wanted };
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
