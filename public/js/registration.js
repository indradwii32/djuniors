// ============================================
// Djuniors - Registration Form JavaScript
// ============================================

const API_BASE = window.API_BASE || (window.location.origin.includes(':8787') ? '' : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:8787' : ''));

class DjuniorsRegistration {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 4;

        this.classes = [];
        this.selectedClass = null;
        this.selectedSlot = null;
        this.selectedPaymentMethod = 'bank_transfer';

        this.children = [
            { name: '', age_or_class: '' }
        ];

        this.promo = {
            code: '',
            discount: 0,
            type: 'fixed',
            applied: false
        };

        // Query parameters
        const urlParams = new URLSearchParams(window.location.search);
        this.initialClassId = urlParams.get('class') || urlParams.get('class_id');
        this.initialLevelId = urlParams.get('level') || urlParams.get('level_id');

        this.init();
    }

    async init() {
        this.bindEvents();
        await this.fetchClasses();
    }

    bindEvents() {
        // Step Navigation
        document.getElementById('next-btn')?.addEventListener('click', () => this.nextStep());
        document.getElementById('prev-btn')?.addEventListener('click', () => this.prevStep());
        document.getElementById('registration-form')?.addEventListener('submit', (e) => this.handleSubmit(e));

        // Stepper clickable for already completed steps
        document.querySelectorAll('.step-item').forEach(item => {
            item.addEventListener('click', () => {
                const targetStep = parseInt(item.dataset.step, 10);
                if (targetStep < this.currentStep) {
                    this.goToStep(targetStep);
                }
            });
        });

        // Add Child Button
        document.getElementById('btn-add-child')?.addEventListener('click', () => this.addChildRow());

        // Promo Code
        document.getElementById('btn-apply-promo')?.addEventListener('click', () => this.applyPromo());
        document.getElementById('promo-code-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.applyPromo();
            }
        });

        // Payment Method Cards
        document.querySelectorAll('.payment-method-card').forEach(card => {
            card.addEventListener('click', () => {
                const method = card.dataset.method;
                this.selectPaymentMethod(method);
            });
        });

        // Copy Account Numbers
        document.querySelectorAll('.btn-copy').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const textToCopy = btn.dataset.copy;
                if (textToCopy) {
                    navigator.clipboard.writeText(textToCopy).then(() => {
                        const originalText = btn.textContent;
                        btn.textContent = '✓ Tersalin!';
                        btn.classList.add('copied');
                        setTimeout(() => {
                            btn.textContent = originalText;
                            btn.classList.remove('copied');
                        }, 2000);
                    });
                }
            });
        });

        // Copy Modal Reg Number
        document.getElementById('btn-copy-reg-modal')?.addEventListener('click', () => {
            const regNumber = document.getElementById('modal-reg-number')?.textContent.trim();
            if (regNumber) {
                navigator.clipboard.writeText(regNumber).then(() => {
                    const btn = document.getElementById('btn-copy-reg-modal');
                    btn.textContent = '✓ Nomor Berhasil Disalin!';
                    setTimeout(() => {
                        btn.textContent = '📋 Salin Nomor Registrasi';
                    }, 2000);
                });
            }
        });
    }

    /**
     * Helper to safely parse schedule slots
     */
    parseSlots(slotsData) {
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

    /**
     * Fetch active classes from backend API
     */
    async fetchClasses() {
        const container = document.getElementById('class-options');
        try {
            const response = await fetch(`${API_BASE}/api/classes`);
            if (!response.ok) throw new Error('Gagal mengambil data kelas');
            this.classes = await response.json();
            this.renderClasses();

            // Select default class
            let targetClassId = this.initialClassId;
            if (!targetClassId && this.initialLevelId) {
                const matched = this.classes.find(c => c.level_id === this.initialLevelId);
                if (matched) targetClassId = matched.id;
            }

            if (!targetClassId || !this.classes.some(c => c.id === targetClassId)) {
                targetClassId = this.classes[0]?.id || null;
            }

            if (targetClassId) {
                this.selectClass(targetClassId);
            }
        } catch (error) {
            console.error('Error fetching classes:', error);
            if (container) {
                container.innerHTML = '<p class="form-info" style="grid-column: 1/-1;">Gagal memuat pilihan kelas. Silakan muat ulang halaman.</p>';
            }
        }
    }

    /**
     * Render Class Cards (Step 1)
     */
    renderClasses() {
        const container = document.getElementById('class-options');
        if (!container) return;

        if (!this.classes || this.classes.length === 0) {
            container.innerHTML = '<p class="form-info" style="grid-column: 1/-1;">Tidak ada kelas aktif saat ini.</p>';
            return;
        }

        const icons = ['🧮', '🎒', '🚀', '⭐', '📐', '🐣'];
        container.innerHTML = this.classes.map((cls, index) => {
            const icon = icons[index % icons.length];
            const isChecked = cls.id === this.selectedClass?.id;
            const priceFormatted = Number(cls.price) === 0
                ? 'Gratis'
                : `Rp ${Number(cls.price).toLocaleString('id-ID')} / bln`;

            return `
                <label class="class-option">
                    <input type="radio" name="class_id" value="${cls.id}" ${isChecked ? 'checked' : ''}>
                    <div class="class-card-select">
                        <div class="class-icon">${icon}</div>
                        <div class="class-name">${cls.name}</div>
                        <div class="class-level-badge">${cls.level_name || 'Semua Tingkat'}</div>
                        <div class="class-price">${priceFormatted}</div>
                        <div class="class-desc">${cls.description || 'Live interaktif via Google Meet'}</div>
                    </div>
                </label>
            `;
        }).join('');

        // Attach change event
        container.querySelectorAll('input[name="class_id"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.selectClass(e.target.value);
            });
        });
    }

    /**
     * Handle class selection
     */
    selectClass(classId) {
        this.selectedClass = this.classes.find(c => c.id === classId) || null;

        const radio = document.querySelector(`input[name="class_id"][value="${classId}"]`);
        if (radio) radio.checked = true;

        this.renderScheduleSlots();
        this.recalculatePrice();
    }

    /**
     * Render schedule slots for selected class
     */
    renderScheduleSlots() {
        const container = document.getElementById('schedule-options');
        if (!container) return;

        if (!this.selectedClass) {
            container.innerHTML = '<p class="form-info" style="grid-column: 1/-1;">Pilih kelas terlebih dahulu untuk melihat jadwal.</p>';
            return;
        }

        const slots = this.parseSlots(this.selectedClass.schedule_slots);

        if (slots.length === 0) {
            container.innerHTML = '<p class="form-info" style="grid-column: 1/-1;">Jadwal fleksibel (akan dikonfirmasi mentor via WhatsApp setelah registrasi).</p>';
            this.selectedSlot = 'Jadwal Fleksibel (Konfirmasi via WA)';
            return;
        }

        container.innerHTML = slots.map((slot, index) => {
            const slotValue = `${slot.day} (${slot.start_time} - ${slot.end_time} WIB)`;
            const isChecked = index === 0 || this.selectedSlot === slotValue;

            return `
                <label class="schedule-option">
                    <input type="radio" name="schedule_slot" value="${slotValue}" ${isChecked ? 'checked' : ''}>
                    <div class="schedule-card-select">
                        <div class="schedule-day">${slot.day}</div>
                        <div class="schedule-time">${slot.start_time} - ${slot.end_time} WIB</div>
                        <div class="schedule-level">Live Google Meet (Maks. ${this.selectedClass.max_students || 8} Siswa)</div>
                    </div>
                </label>
            `;
        }).join('');

        // Select first slot by default
        const firstSlotRadio = container.querySelector('input[name="schedule_slot"]:checked') || container.querySelector('input[name="schedule_slot"]');
        if (firstSlotRadio) {
            firstSlotRadio.checked = true;
            this.selectedSlot = firstSlotRadio.value;
        }

        // Attach slot change events
        container.querySelectorAll('input[name="schedule_slot"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.selectedSlot = e.target.value;
            });
        });
    }

    /**
     * STEP 3: Child Rows Management
     */
    addChildRow() {
        this.saveChildrenData();
        this.children.push({ name: '', age_or_class: '' });
        this.renderChildrenRows();
        this.recalculatePrice();
    }

    removeChildRow(index) {
        if (this.children.length <= 1) return;
        this.saveChildrenData();
        this.children.splice(index, 1);
        this.renderChildrenRows();
        this.recalculatePrice();
    }

    saveChildrenData() {
        const container = document.getElementById('children-container');
        if (!container) return;

        const items = container.querySelectorAll('.child-item');
        this.children = [];
        items.forEach((item) => {
            const nameInput = item.querySelector('.child-name-input');
            const ageInput = item.querySelector('.child-age-input');
            this.children.push({
                name: nameInput ? nameInput.value.trim() : '',
                age_or_class: ageInput ? ageInput.value.trim() : ''
            });
        });
    }

    renderChildrenRows() {
        const container = document.getElementById('children-container');
        if (!container) return;

        container.innerHTML = this.children.map((child, index) => {
            const isFirst = index === 0;
            const removeBtnHtml = !isFirst
                ? `<button type="button" class="btn-remove-child" data-index="${index}">🗑️ Hapus</button>`
                : '';

            return `
                <div class="child-item" data-child-index="${index}">
                    <div class="child-item-header">
                        <span class="child-item-title">🧒 Anak ke-${index + 1}</span>
                        ${removeBtnHtml}
                    </div>
                    <div class="child-inputs-grid">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label>Nama Lengkap Anak <span class="required-mark">*</span></label>
                            <input type="text" class="child-name-input" name="child_name_${index}" required placeholder="Contoh: Kevin Pratama" value="${this.escapeHtml(child.name || '')}">
                        </div>
                        <div class="form-group" style="margin-bottom: 0;">
                            <label>Umur / Tingkat Kelas <span class="required-mark">*</span></label>
                            <input type="text" class="child-age-input" name="child_age_${index}" required placeholder="Contoh: TK B (5 thn) / Kelas 2 SD" value="${this.escapeHtml(child.age_or_class || '')}">
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach remove events
        container.querySelectorAll('.btn-remove-child').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index, 10);
                this.removeChildRow(idx);
            });
        });

        // Attach input listener to recalculate or validate
        container.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', () => {
                this.saveChildrenData();
            });
        });
    }

    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    /**
     * STEP 4: Price Calculation & Summary
     */
    recalculatePrice() {
        const classPrice = this.selectedClass ? Number(this.selectedClass.price) || 0 : 0;
        const count = Math.max(1, this.children.length);
        const subtotal = classPrice * count;

        let discount = 0;
        if (this.promo.applied && this.promo.discount > 0) {
            if (this.promo.type === 'percentage') {
                discount = Math.round((subtotal * this.promo.discount) / 100);
            } else {
                discount = this.promo.discount;
            }
            discount = Math.min(discount, subtotal);
        }

        const finalTotal = Math.max(0, subtotal - discount);

        // Update UI
        const pricePerChildEl = document.getElementById('price-per-child');
        const childrenCountEl = document.getElementById('price-children-count');
        const subtotalEl = document.getElementById('price-subtotal');
        const discountRowEl = document.getElementById('discount-row');
        const discountValEl = document.getElementById('discount-val');
        const discountLabelEl = document.getElementById('discount-label');
        const finalTotalEl = document.getElementById('price-final-total');

        if (pricePerChildEl) pricePerChildEl.textContent = `Rp ${classPrice.toLocaleString('id-ID')}`;
        if (childrenCountEl) childrenCountEl.textContent = `${count} Anak / Siswa`;
        if (subtotalEl) subtotalEl.textContent = `Rp ${subtotal.toLocaleString('id-ID')}`;

        if (discount > 0) {
            if (discountRowEl) discountRowEl.classList.remove('hidden');
            if (discountLabelEl) discountLabelEl.textContent = `Diskon (${this.promo.code})`;
            if (discountValEl) discountValEl.textContent = `- Rp ${discount.toLocaleString('id-ID')}`;
        } else {
            if (discountRowEl) discountRowEl.classList.add('hidden');
        }

        if (finalTotalEl) finalTotalEl.textContent = `Rp ${finalTotal.toLocaleString('id-ID')}`;
    }

    /**
     * Promo Code Validation
     */
    async applyPromo() {
        const input = document.getElementById('promo-code-input');
        const messageEl = document.getElementById('promo-message');
        const code = input ? input.value.trim().toUpperCase() : '';

        if (!code) {
            if (messageEl) {
                messageEl.textContent = 'Silakan masukkan kode promo';
                messageEl.className = 'error';
                messageEl.classList.remove('hidden');
            }
            return;
        }

        const btn = document.getElementById('btn-apply-promo');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳...';
        }

        try {
            const response = await fetch(`${API_BASE}/api/promo/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const data = await response.json();

            if (data.valid) {
                this.promo = {
                    code,
                    discount: data.discount,
                    type: data.type,
                    applied: true
                };
                if (messageEl) {
                    messageEl.textContent = `✅ Promo "${code}" berhasil digunakan! Potongan ${data.type === 'percentage' ? `${data.discount}%` : `Rp ${data.discount.toLocaleString('id-ID')}`}`;
                    messageEl.className = 'success';
                    messageEl.classList.remove('hidden');
                }
                this.recalculatePrice();
            } else {
                this.promo.applied = false;
                if (messageEl) {
                    messageEl.textContent = `❌ ${data.message || 'Kode promo tidak valid atau sudah kedaluwarsa'}`;
                    messageEl.className = 'error';
                    messageEl.classList.remove('hidden');
                }
                this.recalculatePrice();
            }
        } catch (error) {
            console.error('Promo error:', error);
            if (messageEl) {
                messageEl.textContent = '❌ Gagal memvalidasi promo. Coba lagi nanti.';
                messageEl.className = 'error';
                messageEl.classList.remove('hidden');
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Terapkan';
            }
        }
    }

    /**
     * Select Payment Method
     */
    selectPaymentMethod(method) {
        this.selectedPaymentMethod = method;

        document.querySelectorAll('.payment-method-card').forEach(card => {
            card.classList.toggle('active', card.dataset.method === method);
        });

        const bankDetails = document.getElementById('bank-transfer-details');
        const qrisDetails = document.getElementById('qris-details');
        const ewalletDetails = document.getElementById('ewallet-details');

        if (bankDetails) bankDetails.classList.toggle('hidden', method !== 'bank_transfer');
        if (qrisDetails) qrisDetails.classList.toggle('hidden', method !== 'qris');
        if (ewalletDetails) ewalletDetails.classList.toggle('hidden', method !== 'ewallet');
    }

    /**
     * Populate Step 4 Summary
     */
    populateSummary() {
        this.saveChildrenData();

        // Class Name & Slot
        const classNameEl = document.getElementById('summary-class-name');
        const scheduleSlotEl = document.getElementById('summary-schedule-slot');
        const parentInfoEl = document.getElementById('summary-parent-info');
        const parentCityEl = document.getElementById('summary-parent-city');
        const childrenListEl = document.getElementById('summary-children-list');

        const parentName = document.getElementById('parent-name')?.value.trim() || '-';
        const parentPhone = document.getElementById('parent-phone')?.value.trim() || '-';
        const parentCity = document.getElementById('parent-city')?.value.trim() || '-';

        if (classNameEl) classNameEl.textContent = this.selectedClass ? `${this.selectedClass.name} (${this.selectedClass.level_name || 'Semua Tingkat'})` : '-';
        if (scheduleSlotEl) scheduleSlotEl.textContent = this.selectedSlot || 'Jadwal Fleksibel';
        if (parentInfoEl) parentInfoEl.textContent = `${parentName} (${parentPhone})`;
        if (parentCityEl) parentCityEl.textContent = parentCity;

        if (childrenListEl) {
            childrenListEl.innerHTML = this.children.map((c, i) => `
                <div class="summary-child-badge">
                    🧒 ${c.name || `Anak ${i+1}`} <span style="color: #64748b; font-size: 0.75rem;">(${c.age_or_class || '-'})</span>
                </div>
            `).join('');
        }

        this.recalculatePrice();
    }

    /**
     * Step Navigation & Validation
     */
    nextStep() {
        if (!this.validateStep(this.currentStep)) return;

        if (this.currentStep === 3) {
            this.populateSummary();
        }

        this.goToStep(this.currentStep + 1);
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.goToStep(this.currentStep - 1);
        }
    }

    goToStep(stepNumber) {
        this.currentStep = stepNumber;
        this.updateStepUI();
        window.scrollTo({ top: 100, behavior: 'smooth' });
    }

    updateStepUI() {
        // Form step panels
        document.querySelectorAll('.form-step').forEach(step => {
            const stepIndex = parseInt(step.dataset.step, 10);
            step.classList.toggle('active', stepIndex === this.currentStep);
        });

        // Stepper items
        document.querySelectorAll('.step-item').forEach(item => {
            const stepIndex = parseInt(item.dataset.step, 10);
            item.classList.remove('active', 'completed');
            if (stepIndex === this.currentStep) {
                item.classList.add('active');
            } else if (stepIndex < this.currentStep) {
                item.classList.add('completed');
            }
        });

        // Nav Buttons
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        if (prevBtn) prevBtn.disabled = this.currentStep === 1;

        if (nextBtn) {
            nextBtn.classList.toggle('hidden', this.currentStep === this.totalSteps);
        }

        if (submitBtn) {
            submitBtn.classList.toggle('hidden', this.currentStep !== this.totalSteps);
        }
    }

    validateStep(stepNumber) {
        if (stepNumber === 1) {
            if (!this.selectedClass) {
                alert('Mohon pilih salah satu program kelas terlebih dahulu!');
                return false;
            }
            const slots = this.parseSlots(this.selectedClass.schedule_slots);
            if (slots.length > 0 && !this.selectedSlot) {
                alert('Mohon pilih salah satu jadwal belajar!');
                return false;
            }
            return true;
        }

        if (stepNumber === 2) {
            const name = document.getElementById('parent-name')?.value.trim();
            const phone = document.getElementById('parent-phone')?.value.trim();
            const city = document.getElementById('parent-city')?.value.trim();

            if (!name) {
                alert('Nama lengkap orang tua wajib diisi!');
                document.getElementById('parent-name')?.focus();
                return false;
            }

            if (!phone || phone.length < 8) {
                alert('Nomor WhatsApp wajib diisi dengan benar (min 8 digit)!');
                document.getElementById('parent-phone')?.focus();
                return false;
            }

            if (!city) {
                alert('Kota asal / domisili wajib diisi!');
                document.getElementById('parent-city')?.focus();
                return false;
            }

            return true;
        }

        if (stepNumber === 3) {
            this.saveChildrenData();
            if (this.children.length === 0) {
                alert('Mohon masukkan minimal 1 data anak!');
                return false;
            }

            for (let i = 0; i < this.children.length; i++) {
                const child = this.children[i];
                if (!child.name) {
                    alert(`Nama lengkap anak ke-${i + 1} wajib diisi!`);
                    document.querySelector(`[name="child_name_${i}"]`)?.focus();
                    return false;
                }
                if (!child.age_or_class) {
                    alert(`Umur atau tingkat kelas anak ke-${i + 1} wajib diisi!`);
                    document.querySelector(`[name="child_age_${i}"]`)?.focus();
                    return false;
                }
            }

            return true;
        }

        return true;
    }

    /**
     * Submit Registration
     */
    async handleSubmit(e) {
        e.preventDefault();

        if (!this.validateStep(1) || !this.validateStep(2) || !this.validateStep(3)) {
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '⏳ Memproses Pendaftaran...';
        }

        this.saveChildrenData();

        const parentName = document.getElementById('parent-name')?.value.trim();
        const parentPhone = document.getElementById('parent-phone')?.value.trim();
        const parentEmail = document.getElementById('parent-email')?.value.trim() || null;
        const parentCity = document.getElementById('parent-city')?.value.trim();
        const notes = document.getElementById('reg-notes')?.value.trim() || null;

        const payload = {
            parent_name: parentName,
            parent_phone: parentPhone,
            parent_email: parentEmail,
            parent_city: parentCity,
            class_id: this.selectedClass.id,
            schedule_slot: this.selectedSlot || 'Jadwal Fleksibel',
            children: this.children,
            promo_code: this.promo.applied ? this.promo.code : null,
            payment_method: this.selectedPaymentMethod,
            notes: notes
        };

        try {
            const response = await fetch(`${API_BASE}/api/registrations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccessModal(data);
            } else {
                throw new Error(data.message || data.error || 'Gagal membuat pendaftaran');
            }
        } catch (error) {
            console.error('Registration submit error:', error);
            alert('Terjadi kendala saat pendaftaran: ' + error.message);
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '🎉 Kirim Pendaftaran Sekarang';
            }
        }
    }

    /**
     * Show Success Modal with Action Buttons
     */
    showSuccessModal(data) {
        const modal = document.getElementById('success-modal');
        if (!modal) return;

        const regNumber = data.registration_number || data.registration?.registration_number || '-';
        const finalAmount = data.registration?.final_amount || 0;
        const paymentMethod = data.registration?.payment_method || this.selectedPaymentMethod;

        const modalRegNumberEl = document.getElementById('modal-reg-number');
        const modalTotalAmountEl = document.getElementById('modal-total-amount');
        const modalPaymentMethodEl = document.getElementById('modal-payment-method');
        const trackBtn = document.getElementById('btn-modal-track');
        const waBtn = document.getElementById('btn-modal-wa');

        if (modalRegNumberEl) modalRegNumberEl.textContent = regNumber;
        if (modalTotalAmountEl) modalTotalAmountEl.textContent = `Rp ${finalAmount.toLocaleString('id-ID')}`;
        
        let methodText = 'Transfer Bank';
        if (paymentMethod === 'qris') methodText = 'QRIS';
        if (paymentMethod === 'ewallet') methodText = 'E-Wallet';
        if (modalPaymentMethodEl) modalPaymentMethodEl.textContent = methodText;

        // Set tracking URL
        if (trackBtn) {
            trackBtn.href = `lacak.html?number=${encodeURIComponent(regNumber)}`;
        }

        // Set WhatsApp Direct Confirmation Link
        if (waBtn) {
            const parentName = data.registration?.parent_name || '';
            const className = data.registration?.class_name || this.selectedClass?.name || '';
            const childrenNames = this.children.map(c => c.name).join(', ');
            
            const message = `Halo Admin Djuniors! 👋\nSaya telah mendaftar dengan rincian:\n- No. Registrasi: *${regNumber}*\n- Nama Wali: *${parentName}*\n- Kelas: *${className}*\n- Nama Anak: *${childrenNames}*\n- Total: *Rp ${finalAmount.toLocaleString('id-ID')}*\n\nMohon informasi selanjutnya untuk kelas live Google Meet. Terima kasih!`;
            
            waBtn.href = `https://wa.me/6281234567890?text=${encodeURIComponent(message)}`;
        }

        modal.classList.remove('hidden');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DjuniorsRegistration();
});
