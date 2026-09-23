// ============================================
// Djuniors - Tracking Page JavaScript
// ============================================
// Halaman publik "Lacak Status & Pembayaran".
//
// Aturan keamanan yang berlaku di sini (lihat juga src/routes/registrations.ts):
//  1. Detail pendaftaran HANYA terbuka setelah verifikasi 4 digit terakhir
//     nomor WhatsApp pendaftar (endpoint /track/:number?verify=).
//  2. Pencarian by nomor WA hanya mengembalikan ringkasan terbatas (tanpa nama
//     anak, kota, atau nomor telepon).
//  3. Nomor WhatsApp selalu ditampilkan dalam bentuk termask (0812****8206).
//  4. Info pembayaran yang tampil mengikuti metode yang dipilih pendaftar —
//     bukan semua metode/rekening sekaligus.

const API_BASE = window.API_BASE || (window.location.origin.includes(':8787') ? '' : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8787' : 'https://api.djuniorslc.com'));

// ============================================
// Image Optimization (Task F) — see main.js for full docs
// ============================================
const IMAGE_CDN_BASE = '';

function imageUrl(src, opts = {}) {
    if (!src || src.startsWith('data:') || !IMAGE_CDN_BASE) return src;
    const parts = [];
    if (opts.width)  parts.push(`width=${opts.width}`);
    if (opts.height) parts.push(`height=${opts.height}`);
    parts.push('format=' + (opts.format || 'auto'));
    return `${IMAGE_CDN_BASE}/${parts.join(',')}/${src}`;
}

class DjuniorsTracking {
    constructor() {
        this.currentData = null;
        this.currentPayment = null;
        this.selectedProofFile = null;
        this.proofBase64 = null;

        // Nomor registrasi yang menunggu verifikasi + nomor WA yang dipakai
        // saat mencari (untuk auto-verifikasi daftar hasil pencarian nomor).
        this.pendingRegNumber = null;
        this.searchedPhone = null;

        this.init();
    }

    init() {
        this.bindEvents();
        this.checkUrlParams();
    }

    bindEvents() {
        const form = document.getElementById('tracking-search-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = document.getElementById('search-query-input')?.value.trim();
                if (query) {
                    this.performSearch(query);
                }
            });
        }

        // Verifikasi kepemilikan pendaftaran
        const verifyBtn = document.getElementById('btn-verify-submit');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => this.submitVerification());
        }
        const verifyInput = document.getElementById('verify-input');
        if (verifyInput) {
            verifyInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.submitVerification();
                }
            });
        }
    }

    submitVerification() {
        const digits = (document.getElementById('verify-input')?.value || '').replace(/\D/g, '');
        if (digits.length !== 4) {
            alert('Masukkan tepat 4 digit terakhir nomor WhatsApp pendaftar.');
            return;
        }
        if (!this.pendingRegNumber) return;
        this.searchByNumber(this.pendingRegNumber, digits);
    }

    checkUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const number = params.get('number') || params.get('reg');
        const phone = params.get('phone');
        const q = params.get('q');
        const verify = params.get('verify');

        if (number) {
            const input = document.getElementById('search-query-input');
            if (input) input.value = number;
            this.searchByNumber(number, verify);
        } else if (phone) {
            const input = document.getElementById('search-query-input');
            if (input) input.value = phone;
            this.searchByPhone(phone);
        } else if (q) {
            const input = document.getElementById('search-query-input');
            if (input) input.value = q;
            this.performSearch(q);
        }
    }

    performSearch(query) {
        const cleanQuery = query.trim();
        const isRegNumber = cleanQuery.toUpperCase().startsWith('DJN') || cleanQuery.includes('-');

        if (isRegNumber) {
            this.searchByNumber(cleanQuery.toUpperCase());
        } else {
            this.searchByPhone(cleanQuery);
        }
    }

    showView(viewName) {
        const views = [
            'view-placeholder',
            'view-loading',
            'view-verify',
            'view-error',
            'view-single-result',
            'view-multi-result'
        ];

        views.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('hidden', id !== viewName);
        });
    }

    showError(title, message) {
        const titleEl = document.getElementById('error-title');
        const msgEl = document.getElementById('error-message');
        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        this.showView('view-error');
    }

    /**
     * Tampilkan form verifikasi 4 digit terakhir nomor WhatsApp.
     */
    showVerifyView(regNumber, message) {
        this.pendingRegNumber = regNumber;
        const msgEl = document.getElementById('verify-message');
        const numEl = document.getElementById('verify-reg-number');
        const input = document.getElementById('verify-input');
        if (msgEl && message) {
            msgEl.innerHTML = message;
        }
        if (numEl) numEl.textContent = regNumber;
        if (input) input.value = '';
        this.showView('view-verify');
        setTimeout(() => input?.focus(), 100);
    }

    /**
     * 1. Search by Registration Number
     * Membutuhkan verifikasi 4 digit terakhir nomor WA pendaftar.
     */
    async searchByNumber(regNumber, verify) {
        this.showView('view-loading');

        try {
            const qs = verify ? `?verify=${encodeURIComponent(verify)}` : '';
            const response = await fetch(`${API_BASE}/api/registrations/track/${encodeURIComponent(regNumber)}${qs}`);
            const data = await response.json();

            // 401 → butuh verifikasi kepemilikan
            if (response.status === 401) {
                this.showVerifyView(
                    regNumber,
                    data?.message ||
                        'Demi keamanan, masukkan <strong>4 digit terakhir nomor WhatsApp</strong> yang Anda pakai saat mendaftar.'
                );
                return;
            }

            // 429 → rate limit
            if (response.status === 429) {
                this.showError('Terlalu Banyak Percobaan', data?.message || 'Coba lagi beberapa menit kemudian.');
                return;
            }

            if (response.ok && data.success && data.registration) {
                this.currentData = data.registration;
                this.currentPayment = data.payment || null;
                this.renderSingleResult(data.registration, data.tracking, data.payment);
                this.showView('view-single-result');
                window.history.replaceState({}, '', `lacak.html?number=${encodeURIComponent(regNumber)}`);
                return;
            }

            // Tidak ditemukan → kalau bentuknya nomor telepon, coba lacak via nomor WA
            const digits = regNumber.replace(/\D/g, '');
            if (digits.length >= 8) {
                return this.searchByPhone(regNumber);
            }
            this.showError('Pendaftaran Tidak Ditemukan', `Nomor registrasi "${regNumber}" tidak ditemukan di database kami. Pastikan nomor sudah benar.`);
        } catch (error) {
            console.error('Tracking by number error:', error);
            this.showError('Terjadi Kesalahan', 'Gagal memuat data dari server. Silakan periksa koneksi internet Anda atau coba sesaat lagi.');
        }
    }

    /**
     * 2. Search by Phone Number
     * Hasilnya ringkasan terbatas; detail dibuka setelah verifikasi.
     */
    async searchByPhone(phone) {
        this.showView('view-loading');

        try {
            const digitsOnly = String(phone).replace(/\D/g, '');
            const response = await fetch(`${API_BASE}/api/registrations/track/phone/${encodeURIComponent(digitsOnly)}`);
            const data = await response.json();

            if (response.status === 429) {
                this.showError('Terlalu Banyak Percobaan', data?.message || 'Coba lagi beberapa menit kemudian.');
                return;
            }

            if (response.ok && data.success && Array.isArray(data.registrations)) {
                // Nomor yang dipakai untuk mencari → dipakai sebagai verifikasi
                // saat membuka detail (4 digit terakhir).
                this.searchedPhone = digitsOnly;

                if (data.registrations.length === 0) {
                    this.showError('Pendaftaran Tidak Ditemukan', `Tidak ada data pendaftaran yang terdaftar dengan nomor WhatsApp "${phone}".`);
                } else if (data.registrations.length === 1) {
                    const reg = data.registrations[0];
                    this.searchByNumber(reg.registration_number, digitsOnly.slice(-4));
                } else {
                    this.renderMultiResults(data.registrations, phone);
                    this.showView('view-multi-result');
                    window.history.replaceState({}, '', `lacak.html?phone=${encodeURIComponent(digitsOnly)}`);
                }
            } else {
                this.showError('Pendaftaran Tidak Ditemukan', data?.message || `Tidak ditemukan data untuk nomor "${phone}".`);
            }
        } catch (error) {
            console.error('Tracking by phone error:', error);
            this.showError('Terjadi Kesalahan', 'Gagal memuat data dari server. Silakan coba sesaat lagi.');
        }
    }

    /**
     * Render Single Registration Detail
     */
    renderSingleResult(reg, trackingList = [], payment = null) {
        const container = document.getElementById('view-single-result');
        if (!container) return;

        const statusMap = {
            pending: { text: '🟡 Menunggu Konfirmasi', class: 'pending' },
            confirmed: { text: '🟢 Terkonfirmasi', class: 'confirmed' },
            rejected: { text: '🔴 Ditolak', class: 'rejected' }
        };

        const paymentStatusMap = {
            unpaid: { text: '🔴 Belum Bayar', class: 'unpaid' },
            pending: { text: '🟡 Menunggu Verifikasi Bukti', class: 'pending' },
            paid: { text: '🟢 Lunas / Terverifikasi', class: 'paid' },
            rejected: { text: '🔴 Bukti Ditolak', class: 'rejected' }
        };

        const regStatus = statusMap[reg.status] || { text: reg.status, class: 'pending' };
        const payStatus = paymentStatusMap[reg.payment_status] || { text: reg.payment_status, class: 'pending' };

        let children = [];
        if (Array.isArray(reg.children)) {
            children = reg.children;
        } else if (typeof reg.children === 'string') {
            try {
                children = JSON.parse(reg.children);
            } catch {
                children = [{ name: reg.children }];
            }
        }

        let createdDateStr = '-';
        if (reg.created_at) {
            const date = new Date(reg.created_at);
            createdDateStr = date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        let step1Class = 'completed';
        let step2Class = reg.payment_status === 'unpaid' ? 'active' : 'completed';
        let step3Class = reg.payment_status === 'pending' ? 'active' : (reg.payment_status === 'paid' ? 'completed' : '');
        let step4Class = (reg.status === 'confirmed' && reg.payment_status === 'paid') ? 'completed' : '';

        const waMsg = `Halo Admin Djuniors! Saya ingin menanyakan status pendaftaran No: *${reg.registration_number}* atas nama *${reg.parent_name}*. Terima kasih!`;
        const waLink = `https://wa.me/6287714977001?text=${encodeURIComponent(waMsg)}`;

        container.innerHTML = `
            <!-- Result Header -->
            <div class="result-header">
                <div class="result-reg-title">
                    <span class="result-reg-label">Nomor Registrasi</span>
                    <div class="result-reg-value">
                        <span>${reg.registration_number}</span>
                        <button type="button" class="btn-copy" id="btn-copy-reg-single" data-copy="${reg.registration_number}">Salin</button>
                    </div>
                    <span style="font-size: 0.8rem; color: #64748b;">Didaftarkan pada: ${createdDateStr}</span>
                </div>
                <div class="result-badges">
                    <span class="status-badge ${regStatus.class}">Status: ${regStatus.text}</span>
                    <span class="status-badge ${payStatus.class}">Bayar: ${payStatus.text}</span>
                </div>
            </div>

            <!-- Stepper Timeline -->
            <div class="tracking-stepper-box">
                <div class="timeline-steps">
                    <div class="timeline-step ${step1Class}">
                        <div class="timeline-step-icon">1</div>
                        <span class="timeline-step-title">Registrasi Dibuat</span>
                    </div>
                    <div class="timeline-step ${step2Class}">
                        <div class="timeline-step-icon">2</div>
                        <span class="timeline-step-title">Unggah Bukti</span>
                    </div>
                    <div class="timeline-step ${step3Class}">
                        <div class="timeline-step-icon">3</div>
                        <span class="timeline-step-title">Verifikasi Admin</span>
                    </div>
                    <div class="timeline-step ${step4Class}">
                        <div class="timeline-step-icon">4</div>
                        <span class="timeline-step-title">Kelas Live Aktif</span>
                    </div>
                </div>
            </div>

            <!-- Result Body Details -->
            <div class="result-content-body">
                <div class="details-grid">
                    <!-- Class & Schedule -->
                    <div class="detail-card">
                        <div class="detail-card-title">🧮 Program & Jadwal</div>
                        <div class="detail-item">
                            <div class="detail-item-label">Nama Kelas</div>
                            <div class="detail-item-value">${reg.class_name || 'Kelas Djuniors'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-item-label">Jadwal Sesi Belajar</div>
                            <div class="detail-item-value">${reg.schedule_slot || 'Jadwal Fleksibel'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-item-label">Platform Kelas</div>
                            <div class="detail-item-value" style="color: var(--primary-blue);">📹 Live Google Meet</div>
                        </div>
                    </div>

                    <!-- Parent Info (nomor WA termask) -->
                    <div class="detail-card">
                        <div class="detail-card-title">👨‍👩‍👧 Data Orang Tua</div>
                        <div class="detail-item">
                            <div class="detail-item-label">Nama Orang Tua</div>
                            <div class="detail-item-value">${reg.parent_name}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-item-label">Nomor WhatsApp</div>
                            <div class="detail-item-value">${reg.parent_phone || '-'}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-item-label">Kota Domisili / Asal</div>
                            <div class="detail-item-value">${reg.parent_city || '-'}</div>
                        </div>
                    </div>
                </div>

                <div class="details-grid">
                    <!-- Students Info -->
                    <div class="detail-card">
                        <div class="detail-card-title">🧒 Daftar Anak Peserta (${children.length} Siswa)</div>
                        <div style="margin-top: 0.4rem;">
                            ${children.map((c, idx) => `
                                <div class="child-tag">
                                    🧒 <strong>${c.name || `Anak ${idx+1}`}</strong>
                                    <span style="color: #64748b; font-size: 0.775rem;">(${c.age_or_class || c.grade || '-'})</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Payment Summary -->
                    <div class="detail-card">
                        <div class="detail-card-title">💰 Rincian Biaya</div>
                        <div class="detail-item">
                            <div class="detail-item-label">Total Biaya Kursus</div>
                            <div class="detail-item-value">Rp ${(reg.total_amount || 0).toLocaleString('id-ID')}</div>
                        </div>
                        ${reg.discount_amount > 0 ? `
                        <div class="detail-item" style="color: var(--fresh-green);">
                            <div class="detail-item-label">Potongan Diskon Promo</div>
                            <div class="detail-item-value">- Rp ${(reg.discount_amount).toLocaleString('id-ID')}</div>
                        </div>
                        ` : ''}
                        <div class="detail-item" style="border-top: 1px dashed #cbd5e1; padding-top: 0.4rem; margin-top: 0.4rem;">
                            <div class="detail-item-label" style="font-weight: 800; color: var(--dark-text);">Total Akhir</div>
                            <div class="detail-item-value" style="font-size: 1.25rem; font-family: 'Baloo 2'; color: var(--happy-orange);">
                                Rp ${(reg.final_amount || 0).toLocaleString('id-ID')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Payment Proof & Action Box -->
                ${this.renderPaymentProofSection(reg, payment)}
            </div>

            <!-- Footer Action Bar -->
            <div class="result-action-bar">
                <a href="${waLink}" target="_blank" class="btn-wa-contact">
                    💬 Hubungi Admin WhatsApp
                </a>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="button" class="btn-print" onclick="window.print()">
                        🖨️ Cetak / Simpan
                    </button>
                    <button type="button" class="btn-print" onclick="window.scrollTo({top:0, behavior:'smooth'})">
                        🔍 Cari Lain
                    </button>
                </div>
            </div>
        `;

        this.bindSingleResultEvents(reg);
    }

    /**
     * Render Payment & Proof Section (unpaid, pending, paid).
     * Info pembayaran hanya untuk metode yang dipilih pendaftar.
     */
    renderPaymentProofSection(reg, payment) {
        if (reg.payment_status === 'paid') {
            return `
                <div class="payment-proof-box paid">
                    <div class="proof-header">
                        <span style="font-size: 1.8rem;">🎉</span>
                        <div>
                            <h4 style="color: #166534;">Pembayaran Lunas & Pendaftaran Aktif!</h4>
                            <p style="font-size: 0.85rem; color: #15803d; margin: 0;">Terima kasih! Tim Djuniors telah mengonfirmasi pembayaran Anda. Link Google Meet dan materi pengantar akan dikirimkan langsung ke nomor WhatsApp Anda.</p>
                        </div>
                    </div>
                    ${reg.payment_proof_url ? `
                        <div style="margin-top: 0.75rem;">
                            <span style="font-size: 0.8rem; font-weight: 700; color: #166534;">Bukti Pembayaran Terverifikasi:</span>
                            <div style="margin-top: 0.35rem;">
                                <img src="${imageUrl(reg.payment_proof_url, { width: 400, format: 'auto' })}" alt="Bukti Transfer" class="proof-preview-img" loading="lazy" decoding="async" style="max-height: 160px;">
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }

        if (reg.payment_status === 'pending') {
            return `
                <div class="payment-proof-box pending">
                    <div class="proof-header">
                        <span style="font-size: 1.8rem;">⏳</span>
                        <div>
                            <h4 style="color: #1e40af;">Bukti Pembayaran Sedang Diverifikasi</h4>
                            <p style="font-size: 0.85rem; color: #1d4ed8; margin: 0;">Bukti transfer Anda sudah kami terima dan sedang diverifikasi oleh admin Djuniors. Proses verifikasi biasanya memakan waktu 15-30 menit.</p>
                        </div>
                    </div>
                    ${reg.payment_proof_url ? `
                        <div style="margin-top: 0.75rem;">
                            <span style="font-size: 0.8rem; font-weight: 700; color: #1e40af;">Bukti yang Diunggah:</span>
                            <div style="margin-top: 0.35rem;">
                                <img src="${imageUrl(reg.payment_proof_url, { width: 400, format: 'auto' })}" alt="Bukti Transfer" class="proof-preview-img" loading="lazy" decoding="async" style="max-height: 180px;">
                            </div>
                        </div>
                    ` : ''}
                    <div style="margin-top: 1rem; border-top: 1px dashed #bfdbfe; padding-top: 0.75rem;">
                        <button type="button" class="btn-print" id="btn-toggle-reupload" style="background: white; font-size: 0.85rem;">
                            🔄 Unggah Ulang Bukti (Jika Salah File)
                        </button>
                    </div>
                    <div id="reupload-form-container" class="hidden" style="margin-top: 1rem;">
                        ${this.renderUploadFormHtml(reg)}
                    </div>
                </div>
            `;
        }

        // Unpaid or Rejected
        const isRejected = reg.payment_status === 'rejected';
        return `
            <div class="payment-proof-box">
                <div class="proof-header">
                    <span style="font-size: 1.8rem;">${isRejected ? '⚠️' : '💳'}</span>
                    <div>
                        <h4>${isRejected ? 'Bukti Pembayaran Ditolak - Silakan Unggah Ulang' : 'Selesaikan Pembayaran & Unggah Bukti Transfer'}</h4>
                        <p style="font-size: 0.85rem; color: #64748b; margin: 0;">
                            ${isRejected ? 'Bukti sebelumnya tidak dapat diverifikasi. Mohon unggah bukti transfer yang jelas dan sesuai.' : 'Silakan lakukan pembayaran sesuai metode yang Anda pilih, lalu unggah foto/tangkapan layar bukti pembayaran di bawah ini.'}
                        </p>
                    </div>
                </div>

                <!-- Instruksi pembayaran sesuai metode yang dipilih pendaftar -->
                ${this.renderPaymentInstructionHtml(payment, reg)}

                <!-- Upload Form -->
                ${this.renderUploadFormHtml(reg)}
            </div>
        `;
    }

    /**
     * Instruksi pembayaran (rekening/e-wallet/QRIS + nominal) — hanya untuk
     * metode yang dipilih pendaftar.
     */
    renderPaymentInstructionHtml(payment, reg) {
        const amount = Number(payment?.amount ?? reg.final_amount ?? 0) || 0;
        const nominal = `Rp ${amount.toLocaleString('id-ID')}`;

        if (!payment || !payment.account) {
            return `
                <div style="margin-bottom: 1.25rem; padding: 0.9rem 1rem; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc;">
                    <div style="font-size: 0.85rem; color: #475569;">
                        ${payment?.instructions || 'Detail pembayaran belum tersedia. Silakan hubungi admin D’Juniors melalui WhatsApp untuk instruksi pembayaran.'}
                    </div>
                    <div style="margin-top: 0.5rem; font-weight: 800; color: #1E293B;">Nominal: <span style="color: #FF6B35;">${nominal}</span></div>
                </div>
            `;
        }

        const label = payment.method === 'qris'
            ? '📱 QRIS Resmi D’Juniors'
            : payment.method === 'ewallet'
                ? '💳 Tujuan E-Wallet'
                : '🏦 Rekening Tujuan Transfer';

        return `
            <div style="margin-bottom: 1.25rem; padding: 0.9rem 1rem; border-radius: 12px; border: 1px solid #FFD8C2; background: #FFF9F5;">
                <div style="font-size: 0.78rem; font-weight: 800; color: #FF6B35; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.5rem;">
                    ${label} · ${payment.method_label}
                </div>
                <div class="bank-account-card">
                    <div>
                        <div class="bank-info-name">${payment.account.name}</div>
                        <div class="bank-info-number">${payment.account.number}</div>
                        <div class="bank-info-holder">a.n. ${payment.account.holder}</div>
                    </div>
                    <button type="button" class="btn-copy" data-copy="${payment.account.number}">Salin Nomor</button>
                </div>
                <div style="margin-top: 0.75rem; font-size: 1.05rem; font-weight: 800; color: #1E293B;">
                    Nominal: <span style="color: #FF6B35;">${nominal}</span>
                </div>
                <div style="margin-top: 0.35rem; font-size: 0.78rem; color: #64748b;">
                    ${payment.instructions}
                </div>
            </div>
        `;
    }

    renderUploadFormHtml(reg) {
        const currentMethod = reg.payment_method || 'bank_transfer';
        const methodLabel = currentMethod === 'qris' ? 'QRIS' : (currentMethod === 'ewallet' ? 'E-Wallet' : 'Transfer Bank');

        return `
            <form id="payment-upload-form" data-reg-id="${reg.id}" data-reg-number="${reg.registration_number}">
                <div class="upload-form-group">
                    <label for="payment-method-select">Metode Pembayaran yang Digunakan</label>
                    <select id="payment-method-select" style="width: 100%; padding: 0.8rem 1rem; border: 2px solid #e2e8f0; border-radius: 12px; font-family: 'Nunito', sans-serif;">
                        <option value="bank_transfer" ${currentMethod === 'bank_transfer' ? 'selected' : ''}>Transfer Bank</option>
                        <option value="qris" ${currentMethod === 'qris' ? 'selected' : ''}>QRIS</option>
                        <option value="ewallet" ${currentMethod === 'ewallet' ? 'selected' : ''}>E-Wallet</option>
                    </select>
                    <div style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.35rem;">
                        Terpilih saat pendaftaran: <strong>${methodLabel}</strong>. Ubah hanya bila Anda memakai metode lain.
                    </div>
                </div>

                <div class="upload-form-group">
                    <label>Unggah Foto / Screenshot Bukti Transfer <span class="required-mark" style="color: var(--happy-orange);">*</span></label>
                    <div class="file-dropzone" id="proof-dropzone">
                        <input type="file" id="proof-file-input" accept="image/*" required>
                        <div class="dropzone-icon">📸</div>
                        <div class="dropzone-text" id="dropzone-text">Pilih atau Seret Foto Bukti Transfer ke Sini</div>
                        <div class="dropzone-hint">Format JPG, PNG, WEBP (Maks. 5MB)</div>
                    </div>
                    <div class="proof-preview-container hidden" id="proof-preview-box">
                        <img id="proof-preview-img" src="" alt="Preview Bukti" class="proof-preview-img" loading="lazy" decoding="async">
                    </div>
                </div>

                <div class="upload-form-group">
                    <label for="proof-notes">Catatan Pembayaran (Opsional)</label>
                    <input type="text" id="proof-notes" placeholder="Contoh: Transfer dari rekening a.n. Siti Rahma" style="width: 100%; padding: 0.8rem 1rem; border: 2px solid #e2e8f0; border-radius: 12px;">
                </div>

                <button type="submit" class="btn-submit-proof" id="btn-submit-proof">
                    <span>📤</span> Kirim Bukti Pembayaran Sekarang
                </button>
            </form>
        `;
    }

    /**
     * Bind Single Result Event Handlers
     */
    bindSingleResultEvents(reg) {
        document.querySelectorAll('#view-single-result .btn-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.dataset.copy;
                if (text) {
                    navigator.clipboard.writeText(text).then(() => {
                        const original = btn.textContent;
                        btn.textContent = '✓ Disalin!';
                        btn.classList.add('copied');
                        setTimeout(() => {
                            btn.textContent = original;
                            btn.classList.remove('copied');
                        }, 2000);
                    });
                }
            });
        });

        const toggleReuploadBtn = document.getElementById('btn-toggle-reupload');
        const reuploadContainer = document.getElementById('reupload-form-container');
        if (toggleReuploadBtn && reuploadContainer) {
            toggleReuploadBtn.addEventListener('click', () => {
                reuploadContainer.classList.toggle('hidden');
                toggleReuploadBtn.textContent = reuploadContainer.classList.contains('hidden')
                    ? '🔄 Unggah Ulang Bukti (Jika Salah File)'
                    : 'Tutup Form Unggah';
            });
        }

        const fileInput = document.getElementById('proof-file-input');
        const previewBox = document.getElementById('proof-preview-box');
        const previewImg = document.getElementById('proof-preview-img');
        const dropzoneText = document.getElementById('dropzone-text');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                if (file) {
                    if (file.size > 5 * 1024 * 1024) {
                        alert('Ukuran file maksimal 5MB. Silakan kompres foto bukti transfer Anda.');
                        fileInput.value = '';
                        return;
                    }
                    this.selectedProofFile = file;
                    if (dropzoneText) dropzoneText.textContent = `File dipilih: ${file.name}`;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        this.proofBase64 = event.target.result;
                        if (previewImg && previewBox) {
                            previewImg.src = this.proofBase64;
                            previewBox.classList.remove('hidden');
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        const uploadForm = document.getElementById('payment-upload-form');
        if (uploadForm) {
            uploadForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleProofSubmit(reg);
            });
        }
    }

    /**
     * Submit Payment Proof
     */
    async handleProofSubmit(reg) {
        if (!this.proofBase64 && !this.selectedProofFile) {
            alert('Mohon pilih file foto/tangkapan layar bukti transfer terlebih dahulu!');
            return;
        }

        const submitBtn = document.getElementById('btn-submit-proof');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '⏳ Mengunggah Bukti...';
        }

        const paymentMethod = document.getElementById('payment-method-select')?.value || reg.payment_method || 'bank_transfer';
        const notes = document.getElementById('proof-notes')?.value.trim() || 'Bukti bayar diunggah via halaman lacak';

        try {
            const response = await fetch(`${API_BASE}/api/registrations/${reg.id}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proof_url: this.proofBase64,
                    payment_method: paymentMethod,
                    // Nominal yang benar-benar ditransfer (tagihan + kode unik bila aktif).
                    amount: Number(reg.payable_amount ?? ((reg.final_amount || 0) + (Number(reg.unique_code) || 0))),
                    notes: notes
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                alert('✅ Bukti pembayaran berhasil diunggah! Status telah diperbarui menjadi Menunggu Verifikasi.');
                // Muat ulang detail dengan verifikasi yang sama
                this.searchByNumber(reg.registration_number, (this.searchedPhone || '').slice(-4) || undefined);
            } else {
                throw new Error(data.message || data.error || 'Gagal mengunggah bukti');
            }
        } catch (error) {
            console.error('Payment upload error:', error);
            alert('Gagal mengunggah bukti pembayaran: ' + error.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span>📤</span> Kirim Bukti Pembayaran Sekarang';
            }
        }
    }

    /**
     * Render Multiple Registrations (ringkasan terbatas, tanpa data pribadi)
     */
    renderMultiResults(registrations, phone) {
        const titleEl = document.getElementById('multi-result-title');
        const container = document.getElementById('multi-results-container');
        if (titleEl) titleEl.textContent = `Ditemukan ${registrations.length} Pendaftaran untuk Nomor "${phone}":`;
        if (!container) return;

        const digits = String(phone).replace(/\D/g, '');

        container.innerHTML = registrations.map(reg => {
            const dateStr = reg.created_at ? new Date(reg.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }) : '-';

            const statusClass = reg.status === 'confirmed' ? 'confirmed' : (reg.status === 'rejected' ? 'rejected' : 'pending');
            const payClass = reg.payment_status === 'paid' ? 'paid' : (reg.payment_status === 'pending' ? 'pending' : 'unpaid');
            const childCount = Number(reg.children_count) || 1;

            return `
                <div class="reg-card-item" data-reg-number="${reg.registration_number}">
                    <div class="reg-card-info">
                        <div style="font-size: 0.775rem; color: #64748b; font-weight: 700;">No. Registrasi: ${reg.registration_number}</div>
                        <h4>${reg.class_name || 'Kelas Djuniors'}</h4>
                        <div class="reg-card-sub">
                            <span>📅 ${dateStr}</span> •
                            <span>🧒 ${childCount} Siswa</span> •
                            <span>👤 ${reg.parent_name_masked || '-'}</span>
                        </div>
                        <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
                            <span class="status-badge ${statusClass}">Status: ${reg.status}</span>
                            <span class="status-badge ${payClass}">Bayar: ${reg.payment_status}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-family: 'Baloo 2'; font-size: 1.15rem; font-weight: 800; color: var(--happy-orange); margin-bottom: 0.5rem;">
                            Rp ${(reg.final_amount || 0).toLocaleString('id-ID')}
                        </div>
                        <button type="button" class="btn-view-detail">
                            Lihat Detail →
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.reg-card-item').forEach(card => {
            card.addEventListener('click', () => {
                const regNum = card.dataset.regNumber;
                // Nomor WA lengkap sudah diketahui dari pencarian → langsung
                // dipakai sebagai verifikasi (4 digit terakhir).
                if (regNum) {
                    this.searchByNumber(regNum, digits.slice(-4));
                }
            });
        });
    }
}

// Initialize when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new DjuniorsTracking();
});
