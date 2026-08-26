// ============================================
// Djuniors Dashboard - WhatsApp Notifications Page
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  RefreshCw,
  Search,
  Users,
  Smartphone,
  Sparkles,
  Copy,
  Flame,
  X,
  FileText,
  RotateCcw,
  Save,
  Check,
  Info,
} from 'lucide-react';
import {
  notificationsApi,
  promosApi,
  studentsApi,
  NotificationItem,
  PromoItem,
  Student,
  WATemplate,
} from '../utils/api';

// Predefined Quick Message Templates & Defaults
export interface TemplateMeta {
  id: string;
  name: string;
  badge: string;
  description: string;
  placeholders: string[];
  content: string;
}

export const DEFAULT_TEMPLATES_MAP: Record<string, TemplateMeta> = {
  welcome: {
    id: 'welcome',
    name: 'Sambutan Selamat Datang',
    badge: '👋 Sambutan',
    description: 'Pesan selamat datang otomatis untuk siswa/wali murid yang baru mendaftar di Djuniors.',
    placeholders: ['{nama}', '{nama_orang_tua}', '{nomor_pendaftaran}', '{jadwal}', '{kota}'],
    content: `🎮 *Selamat Datang di Djuniors!* 🎉\n\nHalo {nama}!\n\nTerima kasih sudah mendaftar di Djuniors ({kota}).\n🔖 No. Pendaftaran: *{nomor_pendaftaran}*\n📅 Jadwal: *{jadwal}*\n\nSiap belajar matematika jadi seru? 🚀\n\n📞 Hubungi kami jika ada pertanyaan!\n🌐 www.djuniors.id`,
  },
  enrollment_confirmed: {
    id: 'enrollment_confirmed',
    name: 'Konfirmasi Pendaftaran',
    badge: '✅ Pendaftaran',
    description: 'Notifikasi saat pendaftaran kelas anak berhasil diverifikasi oleh admin.',
    placeholders: ['{nama}', '{nama_orang_tua}', '{nama_anak}', '{nomor_pendaftaran}', '{nama_kelas}', '{jadwal}', '{kota}'],
    content: `✅ *Pendaftaran Berhasil!*\n\nHalo {nama}!\n\nPendaftaran untuk Ananda *{nama_anak}* telah dikonfirmasi.\n🔖 No. Pendaftaran: *{nomor_pendaftaran}*\n📚 Kelas: *{nama_kelas}*\n📅 Jadwal: *{jadwal}*\n\nMateri dan link kelas akan dikirimkan segera.\n\nSemangat belajar! 💪`,
  },
  payment_instructions: {
    id: 'payment_instructions',
    name: 'Instruksi Pembayaran',
    badge: '💳 Pembayaran',
    description: 'Petunjuk transfer rekening bank, nominal transfer, metode pembayaran, dan link upload bukti transfer.',
    placeholders: [
      '{nama}',
      '{nomor_pendaftaran}',
      '{metode_pembayaran}',
      '{bank}',
      '{rekening}',
      '{nama_pemilik_rekening}',
      '{total_biaya}',
      '{diskon_nominal}',
      '{tagihan_akhir}',
      '{link_pembayaran}',
    ],
    content: `💳 *Instruksi Pembayaran*\n\nHalo {nama}!\n\nUntuk menyelesaikan pendaftaran (*{nomor_pendaftaran}*), silakan transfer melalui *{metode_pembayaran}* ke:\n\n🏦 Bank: *{bank}*\n📄 Rekening: *{rekening}*\n💰 Tagihan: *Rp {tagihan_akhir}*\n🔖 Kode: *{nomor_pendaftaran}*\n\n⚠️ *PENTING:*\nTransfer tepat sampai digit terakhir agar pembayaran bisa otomatis terdeteksi!\n\n📸 Konfirmasi & upload bukti transfer di: {link_pembayaran}`,
  },
  payment_success: {
    id: 'payment_success',
    name: 'Konfirmasi Pembayaran Diterima',
    badge: '💰 Lunas',
    description: 'Konfirmasi pembayaran lunas dan status akun belajar siswa telah aktif.',
    placeholders: ['{nama}', '{nomor_pendaftaran}', '{tagihan_akhir}', '{nama_kelas}', '{jadwal}', '{metode_pembayaran}', '{status_pembayaran}'],
    content: `💰 *Pembayaran Diterima!*\n\nHalo {nama}!\nPembayaran sebesar *Rp {tagihan_akhir}* untuk kelas *{nama_kelas}* (No: *{nomor_pendaftaran}*) sudah kami terima.\n\n📅 Jadwal: *{jadwal}*\n✅ Status: Lunas\n\nSelamat belajar! 🎯`,
  },
  class_reminder: {
    id: 'class_reminder',
    name: 'Pengingat Jadwal Kelas',
    badge: '⏰ Pengingat',
    description: 'Pengingat otomatis sesi belajar Google Meet akan segera dimulai.',
    placeholders: ['{nama}', '{nama_anak}', '{nama_kelas}', '{jadwal}', '{waktu}'],
    content: `⏰ *Pengingat Kelas!*\n\nHalo {nama}!\nKelas *{nama_kelas}* akan dimulai pukul *{waktu}*.\n\nSiap belajar ya! 📚`,
  },
  promo: {
    id: 'promo',
    name: 'Pengumuman Promo Spesial',
    badge: '🎉 Promo',
    description: 'Pengumuman kupon voucher potongan harga untuk pendaftaran kelas matematika.',
    placeholders: ['{nama}', '{kode_promo}', '{diskon}'],
    content: `🎉 *Promo Spesial!* 🎉\n\nHalo {nama}!\n\nGunakan kode *{kode_promo}* untuk mendapatkan diskon *{diskon}*!\n\nBerlaku terbatas. Jangan sampai kehabisan! ⏰`,
  },
};

const QUICK_TEMPLATES = [
  { id: 'welcome', title: '👋 Sambutan Pendaftaran' },
  { id: 'enrollment_confirmed', title: '✅ Konfirmasi Kelas' },
  { id: 'payment_instructions', title: '💳 Instruksi Transfer' },
  { id: 'payment_success', title: '💰 Konfirmasi Lunas' },
  { id: 'class_reminder', title: '⏰ Pengingat Kelas' },
  { id: 'promo', title: '🎉 Promo Diskon' },
];

export const ALL_PLACEHOLDERS_CATEGORIES = [
  {
    category: 'Detail Pendaftaran',
    items: [
      { tag: '{nomor_pendaftaran}', desc: 'No. registrasi (DJN-YYYYMMDD-XXXX)' },
      { tag: '{nama_orang_tua}', desc: 'Nama orang tua / wali murid' },
      { tag: '{nama_anak}', desc: 'Daftar nama anak (Dina, Raka)' },
      { tag: '{jadwal}', desc: 'Slot jadwal sesi belajar' },
      { tag: '{kelas}', desc: 'Nama kelas yang dipilih' },
      { tag: '{kota}', desc: 'Kota domisili orang tua' },
      { tag: '{tanggal_pendaftaran}', desc: 'Tanggal daftar (25 Agustus 2026)' },
      { tag: '{status_pendaftaran}', desc: 'Status pendaftaran (Terkonfirmasi / Menunggu)' },
    ],
  },
  {
    category: 'Pembayaran & Tagihan',
    items: [
      { tag: '{tagihan_akhir}', desc: 'Nominal akhir yang harus dibayar' },
      { tag: '{total_biaya}', desc: 'Total biaya sebelum diskon' },
      { tag: '{diskon_nominal}', desc: 'Nominal potongan diskon' },
      { tag: '{nominal}', desc: 'Nominal transfer' },
      { tag: '{metode_pembayaran}', desc: 'Transfer Bank / E-Wallet / QRIS' },
      { tag: '{status_pembayaran}', desc: 'Status bayar (Belum Lunas / Lunas)' },
      { tag: '{link_pembayaran}', desc: 'Link tracking & upload bukti transfer' },
      { tag: '{link_verifikasi}', desc: 'Alias link verifikasi tracking' },
    ],
  },
  {
    category: 'Informasi Rekening Bank',
    items: [
      { tag: '{nama_bank}', desc: 'Nama bank tujuan transfer (BCA)' },
      { tag: '{nomor_rekening}', desc: 'Nomor rekening bank tujuan' },
      { tag: '{nama_pemilik_rekening}', desc: 'Atas nama rekening bank' },
      { tag: '{bank}', desc: 'Alias nama bank' },
      { tag: '{rekening}', desc: 'Alias nomor rekening' },
    ],
  },
  {
    category: 'Lainnya & Promo',
    items: [
      { tag: '{nama}', desc: 'Nama penerima pesan' },
      { tag: '{nama_kelas}', desc: 'Nama kelas matematika' },
      { tag: '{waktu}', desc: 'Waktu mulai kelas' },
      { tag: '{kode_promo}', desc: 'Kode kupon promo diskon' },
      { tag: '{diskon}', desc: 'Potongan promo diskon' },
    ],
  },
];

const PREVIEW_SAMPLE_DATA: Record<string, string> = {
  // Nama & Wali
  nama: 'Bunda Sinta',
  name: 'Bunda Sinta',
  nama_orang_tua: 'Bunda Sinta',
  parent_name: 'Bunda Sinta',
  parentName: 'Bunda Sinta',
  nama_wali: 'Bunda Sinta',
  wali: 'Bunda Sinta',

  // Anak
  nama_anak: 'Dina & Raka',
  anak: 'Dina & Raka',
  child_names: 'Dina & Raka',
  childNames: 'Dina & Raka',
  anak_anak: 'Dina & Raka',
  children: 'Dina & Raka',

  // Nomor Pendaftaran & Order ID
  nomor_pendaftaran: 'DJN-20260825-XXXX',
  registration_number: 'DJN-20260825-XXXX',
  registrationNumber: 'DJN-20260825-XXXX',
  regNumber: 'DJN-20260825-XXXX',
  kode_pesanan: 'DJN-20260825-XXXX',
  orderId: 'DJN-20260825-XXXX',
  order_id: 'DJN-20260825-XXXX',

  // Kelas & Jadwal
  kelas: 'Matematika Kelas 1 SD',
  nama_kelas: 'Matematika Kelas 1 SD',
  className: 'Matematika Kelas 1 SD',
  class_name: 'Matematika Kelas 1 SD',
  jadwal: 'Senin & Rabu 16:00 WIB',
  schedule: 'Senin & Rabu 16:00 WIB',
  schedule_slot: 'Senin & Rabu 16:00 WIB',
  scheduleSlot: 'Senin & Rabu 16:00 WIB',

  // Kota
  kota: 'Jakarta',
  city: 'Jakarta',
  parent_city: 'Jakarta',
  parentCity: 'Jakarta',

  // Nominal & Biaya
  nominal: '199.000',
  amount: '199.000',
  total_biaya: '199.000',
  total_amount: '199.000',
  totalAmount: '199.000',
  diskon_nominal: '19.900',
  discount_amount: '19.900',
  discountAmount: '19.900',
  tagihan_akhir: '179.100',
  final_amount: '179.100',
  finalAmount: '179.100',

  // Promo
  kode_promo: 'DJUNIOR10',
  promo_code: 'DJUNIOR10',
  promoCode: 'DJUNIOR10',
  diskon: '20%',
  discount: '20%',

  // Metode Pembayaran
  metode_pembayaran: 'Transfer Bank',
  payment_method: 'Transfer Bank',
  paymentMethod: 'Transfer Bank',
  metode: 'Transfer Bank',

  // Link Tracking & Pembayaran
  link_pembayaran: 'https://djuniors.id/lacak.html?number=DJN-20260825-XXXX',
  link_verifikasi: 'https://djuniors.id/lacak.html?number=DJN-20260825-XXXX',
  payment_url: 'https://djuniors.id/lacak.html?number=DJN-20260825-XXXX',
  paymentUrl: 'https://djuniors.id/lacak.html?number=DJN-20260825-XXXX',

  // Tanggal & Waktu
  tanggal_pendaftaran: '25 Agustus 2026',
  tanggal: '25 Agustus 2026',
  created_at: '25 Agustus 2026',
  createdAt: '25 Agustus 2026',
  waktu: '15:00 WIB',
  time: '15:00 WIB',

  // Status
  status_pembayaran: 'Lunas',
  payment_status: 'Lunas',
  paymentStatus: 'Lunas',
  status_pendaftaran: 'Terkonfirmasi',
  status: 'Terkonfirmasi',

  // Bank & Rekening
  nama_bank: 'BCA',
  bank: 'BCA',
  bank_name: 'BCA',
  bankName: 'BCA',
  nomor_rekening: '1234567890',
  rekening: '1234567890 (a/n PT Djuniors Indonesia)',
  account: '1234567890 (a/n PT Djuniors Indonesia)',
  account_number: '1234567890',
  accountNumber: '1234567890',
  nama_pemilik_rekening: 'PT Djuniors Indonesia',
  account_name: 'PT Djuniors Indonesia',
  accountName: 'PT Djuniors Indonesia',
  atas_nama: 'PT Djuniors Indonesia',
  pemilik_rekening: 'PT Djuniors Indonesia',
};

const getPreviewText = (text: string): string => {
  if (!text) return '';
  return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    return PREVIEW_SAMPLE_DATA[key] !== undefined ? PREVIEW_SAMPLE_DATA[key] : match;
  });
};

const renderFormattedWhatsAppText = (rawText: string) => {
  const text = getPreviewText(rawText);
  if (!text) {
    return (
      <span style={{ color: '#8696A0', fontStyle: 'italic' }}>
        (Pilih template dan ketikkan isi pesan di sebelah kiri untuk melihat simulasi WhatsApp...)
      </span>
    );
  }

  const lines = text.split('\n');
  return lines.map((line, lIdx) => {
    const parts = line.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~)/g);
    return (
      <React.Fragment key={lIdx}>
        {parts.map((part, pIdx) => {
          if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
            return <strong key={pIdx}>{part.slice(1, -1)}</strong>;
          }
          if (part.startsWith('_') && part.endsWith('_') && part.length >= 2) {
            return <em key={pIdx}>{part.slice(1, -1)}</em>;
          }
          if (part.startsWith('~') && part.endsWith('~') && part.length >= 2) {
            return <del key={pIdx}>{part.slice(1, -1)}</del>;
          }
          return <span key={pIdx}>{part}</span>;
        })}
        {lIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
};

export const Notifications: React.FC = () => {
  // Data States
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [waConnected, setWaConnected] = useState<boolean | null>(null);
  const [waProvider, setWaProvider] = useState<string>('Fonnte');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isCheckingWa, setIsCheckingWa] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Active Tab: 'manual' | 'bulk' | 'templates'
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk' | 'templates'>('manual');

  // Template Editor States
  const [templates, setTemplates] = useState<WATemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('welcome');
  const [editorContent, setEditorContent] = useState<string>('');
  const [editorName, setEditorName] = useState<string>('');
  const [isSavingTemplate, setIsSavingTemplate] = useState<boolean>(false);
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Manual Send Form States
  const [manualPhone, setManualPhone] = useState<string>('');
  const [manualRecipientName, setManualRecipientName] = useState<string>('');
  const [manualMessage, setManualMessage] = useState<string>('');
  const [isSendingManual, setIsSendingManual] = useState<boolean>(false);

  // Bulk Promo Form States
  const [selectedPromoId, setSelectedPromoId] = useState<string>('');
  const [bulkCustomMessage, setBulkCustomMessage] = useState<string>('');
  const [isSendingBulk, setIsSendingBulk] = useState<boolean>(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState<boolean>(false);
  const [bulkResult, setBulkResult] = useState<{ sent: number; failed: number; total: number } | null>(null);

  // Log Search and Filter States
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'sent' | 'pending' | 'failed'>('all');
  const [detailModalItem, setDetailModalItem] = useState<NotificationItem | null>(null);

  // Load Initial Data
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const [notifsRes, promosRes, studentsRes, waRes, tmplsRes] = await Promise.allSettled([
        notificationsApi.getAll(),
        promosApi.getAll(),
        studentsApi.getAll(),
        notificationsApi.getWaStatus(),
        notificationsApi.getTemplates(),
      ]);

      if (notifsRes.status === 'fulfilled' && Array.isArray(notifsRes.value)) {
        setNotifications(notifsRes.value);
      } else {
        setNotifications([]);
      }

      if (promosRes.status === 'fulfilled' && Array.isArray(promosRes.value)) {
        setPromos(promosRes.value);
        if (promosRes.value.length > 0 && !selectedPromoId) {
          const firstActive = promosRes.value.find((p) => Boolean(p.is_active));
          if (firstActive) setSelectedPromoId(firstActive.id);
        }
      }

      if (studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value)) {
        setStudents(studentsRes.value);
      }

      if (waRes.status === 'fulfilled') {
        setWaConnected(waRes.value.connected);
        setWaProvider(waRes.value.provider || 'Fonnte');
      } else {
        setWaConnected(false);
      }

      if (tmplsRes.status === 'fulfilled' && Array.isArray(tmplsRes.value)) {
        setTemplates(tmplsRes.value);
        const currentSelectedId = selectedTemplateId || 'welcome';
        const found = tmplsRes.value.find((t) => t.id === currentSelectedId);
        if (found) {
          setEditorContent(found.content);
          setEditorName(found.name);
        } else if (DEFAULT_TEMPLATES_MAP[currentSelectedId]) {
          setEditorContent(DEFAULT_TEMPLATES_MAP[currentSelectedId].content);
          setEditorName(DEFAULT_TEMPLATES_MAP[currentSelectedId].name);
        }
      }
    } catch {
      // Keep state resilient
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedPromoId, selectedTemplateId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Check WA Connection Status
  const handleCheckWaStatus = async () => {
    try {
      setIsCheckingWa(true);
      const res = await notificationsApi.getWaStatus();
      setWaConnected(res.connected);
      setWaProvider(res.provider || 'Fonnte');
      if (res.connected) {
        showToast('WhatsApp Gateway Fonnte terhubung dengan baik!', 'success');
      } else {
        showToast('Gateway WhatsApp terputus. Pastikan token Fonnte aktif.', 'error');
      }
    } catch {
      setWaConnected(false);
      showToast('Gagal menghubungi server Fonnte.', 'error');
    } finally {
      setIsCheckingWa(false);
    }
  };

  // Toast Helper
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Apply Quick Template to Manual Form
  const handleApplyTemplate = (tmpl: { id: string; title: string; text?: string }) => {
    const dbTmpl = templates.find((t) => t.id === tmpl.id);
    let msg = dbTmpl ? dbTmpl.content : (tmpl.text || DEFAULT_TEMPLATES_MAP[tmpl.id]?.content || '');

    if (manualRecipientName) {
      msg = msg.replace(/\{nama\}/g, manualRecipientName).replace(/\{name\}/g, manualRecipientName);
    }
    const selectedPromo = promos.find((p) => p.id === selectedPromoId) || promos[0];
    if (selectedPromo) {
      msg = msg.replace(/\{kode_promo\}/g, selectedPromo.code).replace(/\{promoCode\}/g, selectedPromo.code);
      const diskonStr = selectedPromo.discount_type === 'percentage'
        ? `${selectedPromo.discount_value}%`
        : `Rp ${selectedPromo.discount_value.toLocaleString('id-ID')}`;
      msg = msg.replace(/\{diskon\}/g, diskonStr).replace(/\{discount\}/g, diskonStr);
    }
    setManualMessage(msg);
  };

  // Template Editor Handlers
  const handleSelectTemplate = (tmplId: string) => {
    setSelectedTemplateId(tmplId);
    const found = templates.find((t) => t.id === tmplId);
    if (found) {
      setEditorContent(found.content);
      setEditorName(found.name);
    } else if (DEFAULT_TEMPLATES_MAP[tmplId]) {
      setEditorContent(DEFAULT_TEMPLATES_MAP[tmplId].content);
      setEditorName(DEFAULT_TEMPLATES_MAP[tmplId].name);
    }
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    const textarea = editorTextareaRef.current;
    if (!textarea) {
      setEditorContent((prev) => prev + placeholder);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const newVal = currentVal.substring(0, start) + placeholder + currentVal.substring(end);
    setEditorContent(newVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 0);
  };

  const handleInsertFormat = (prefix: string, suffix: string) => {
    const textarea = editorTextareaRef.current;
    if (!textarea) {
      setEditorContent((prev) => prev + prefix + suffix);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    const selected = currentVal.substring(start, end);
    const textToInsert = `${prefix}${selected || 'teks'}${suffix}`;
    const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
    setEditorContent(newVal);

    setTimeout(() => {
      textarea.focus();
      if (selected) {
        textarea.setSelectionRange(start, start + textToInsert.length);
      } else {
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + 4);
      }
    }, 0);
  };

  const handleInsertEmoji = (emoji: string) => {
    handleInsertPlaceholder(emoji);
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplateId) return;
    if (!editorContent.trim()) {
      showToast('Isi template pesan tidak boleh kosong.', 'error');
      return;
    }
    if (editorContent.length > 2000) {
      showToast('Isi template melebihi batas maksimal 2000 karakter.', 'error');
      return;
    }

    try {
      setIsSavingTemplate(true);
      const res = await notificationsApi.updateTemplate(selectedTemplateId, {
        content: editorContent,
        name: editorName || undefined,
      });

      if (res.success) {
        showToast(`Template "${editorName || selectedTemplateId}" berhasil disimpan ke database!`, 'success');
        setTemplates((prev) =>
          prev.map((t) => (t.id === selectedTemplateId ? { ...t, content: editorContent, name: editorName || t.name } : t))
        );
      } else {
        showToast('Gagal menyimpan perubahan template.', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan template';
      showToast(msg, 'error');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleResetTemplate = () => {
    if (!selectedTemplateId) return;
    const def = DEFAULT_TEMPLATES_MAP[selectedTemplateId];
    if (def) {
      setEditorContent(def.content);
      setEditorName(def.name);
      showToast('Konten dikembalikan ke template bawaan. Klik "Simpan Perubahan" untuk menerapkan ke database.', 'info');
    }
  };

  // Quick Select Student as Recipient
  const handleSelectStudentRecipient = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const studentId = e.target.value;
    if (!studentId) return;

    const student = students.find((s) => s.id === studentId);
    if (student) {
      setManualRecipientName(student.full_name);
      // In Djuniors, phone might be parent phone or placeholder
      if (!manualPhone) {
        setManualPhone('081234567890');
      }
      if (manualMessage.includes('{nama}')) {
        setManualMessage(manualMessage.replace('{nama}', student.full_name));
      }
    }
  };

  // Send Manual WA Message
  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualPhone.trim()) {
      showToast('Nomor WhatsApp tujuan wajib diisi.', 'error');
      return;
    }
    if (!manualMessage.trim()) {
      showToast('Isi pesan WhatsApp tidak boleh kosong.', 'error');
      return;
    }

    try {
      setIsSendingManual(true);
      const res = await notificationsApi.sendManual({
        phone: manualPhone.trim(),
        message: manualMessage.trim(),
        recipientName: manualRecipientName.trim(),
      });

      if (res.success) {
        showToast(`Pesan WhatsApp berhasil dikirim ke ${manualPhone}!`, 'success');
        setManualMessage('');
        setManualPhone('');
        setManualRecipientName('');
        // Reload notifications log
        loadData(true);
      } else {
        showToast(res.message || 'Gagal mengirim pesan WhatsApp.', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengirim pesan WhatsApp';
      showToast(msg, 'error');
    } finally {
      setIsSendingManual(false);
    }
  };

  // Send Bulk Promo WA Broadcast
  const handleConfirmBulkSend = async () => {
    if (!selectedPromoId) {
      showToast('Pilih kode promo yang ingin dikirimkan.', 'error');
      return;
    }

    try {
      setIsSendingBulk(true);
      const res = await notificationsApi.sendBulkPromo(
        selectedPromoId,
        bulkCustomMessage.trim() || undefined
      );

      setBulkResult(res);
      setShowBulkConfirmModal(false);
      showToast(`Broadcast Promo selesai! Terkirim: ${res.sent}, Gagal: ${res.failed} dari total ${res.total} siswa.`, 'success');
      loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses broadcast promo';
      showToast(msg, 'error');
    } finally {
      setIsSendingBulk(false);
    }
  };

  // Format Date and Time
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Filtered Notifications Log
  const filteredNotifications = notifications.filter((notif) => {
    const q = logSearchQuery.toLowerCase();
    const matchSearch =
      (notif.title && notif.title.toLowerCase().includes(q)) ||
      (notif.message && notif.message.toLowerCase().includes(q)) ||
      (notif.type && notif.type.toLowerCase().includes(q)) ||
      (notif.user_id && notif.user_id.toLowerCase().includes(q));

    if (logStatusFilter === 'all') return matchSearch;
    return matchSearch && notif.status === logStatusFilter;
  });

  const selectedPromoObj = promos.find((p) => p.id === selectedPromoId);
  const selectedTemplateMeta = DEFAULT_TEMPLATES_MAP[selectedTemplateId] || DEFAULT_TEMPLATES_MAP['welcome'];
  const activePromoCount = promos.filter((p) => Boolean(p.is_active)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor:
              toastMessage.type === 'success'
                ? '#6BCB77'
                : toastMessage.type === 'error'
                ? '#EF4444'
                : '#4A90D9',
            color: '#FFFFFF',
            padding: '0.9rem 1.4rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} />
          ) : toastMessage.type === 'error' ? (
            <AlertCircle size={18} />
          ) : (
            <Sparkles size={18} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          borderRadius: '20px',
          padding: '2rem',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            right: '-30px',
            top: '-30px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            backgroundColor: 'rgba(37, 211, 102, 0.15)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ zIndex: 1, maxWidth: '650px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(37, 211, 102, 0.2)',
              color: '#86EFAC',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
            }}
          >
            <MessageSquare size={14} color="#25D366" />
            <span>Fonnte WhatsApp Broadcast Engine</span>
          </div>

          <h2
            style={{
              fontFamily: "'Baloo 2', cursive",
              fontSize: '1.85rem',
              fontWeight: 800,
              lineHeight: 1.2,
              margin: '0 0 0.5rem 0',
            }}
          >
            Notifikasi & Broadcast WhatsApp 📲
          </h2>

          <p style={{ margin: 0, color: '#CBD5E1', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Kirim pesan konfirmasi pendaftaran langsung ke orang tua murid, jalankan broadcast promo
            diskon massal ke seluruh siswa aktif, dan pantau log pengiriman secara transparan.
          </p>
        </div>

        {/* Refresh & Quick Status Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1 }}>
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.75rem 1.2rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Memuat...' : 'Segarkan'}</span>
          </button>
        </div>
      </div>

      {/* Fonnte Gateway Connection Status Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              backgroundColor: waConnected ? '#DCFCE7' : '#FEE2E2',
              color: waConnected ? '#15803D' : '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Smartphone size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.2rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Status Koneksi WhatsApp Provider ({waProvider})
              </h3>
              {waConnected ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#DCFCE7',
                    color: '#15803D',
                    border: '1px solid #BBF7D0',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#6BCB77',
                      display: 'inline-block',
                    }}
                  />
                  <span>Connected (Online)</span>
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    backgroundColor: '#FEE2E2',
                    color: '#B91C1C',
                    border: '1px solid #FECACA',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#EF4444',
                      display: 'inline-block',
                    }}
                  />
                  <span>Disconnected</span>
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
              {waConnected
                ? 'Device siap mengirim pesan broadcast dan notifikasi otomatis ke nomor wali murid.'
                : 'Server gateway belum tersambung. Pastikan token Fonnte pada konfigurasi sistem aktif.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleCheckWaStatus}
          disabled={isCheckingWa}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.6rem 1.1rem',
            borderRadius: '10px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#F8FAFC',
            color: '#334155',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: isCheckingWa ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <RefreshCw size={14} className={isCheckingWa ? 'animate-spin' : ''} />
          <span>{isCheckingWa ? 'Mengecek...' : 'Cek Status Gateway'}</span>
        </button>
      </div>

      {/* Main Action Tabs: Kirim Manual vs Broadcast Bulk Promo vs Editor Template */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '2px solid #E2E8F0',
          paddingBottom: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className="notif-tab-btn"
          onClick={() => setActiveTab('manual')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.5rem',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            backgroundColor: activeTab === 'manual' ? '#4A90D9' : 'transparent',
            color: activeTab === 'manual' ? '#FFFFFF' : '#64748B',
            fontFamily: "'Baloo 2', cursive",
            fontSize: '1.05rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Send size={16} />
          <span>Kirim WhatsApp Manual</span>
        </button>

        <button
          type="button"
          className="notif-tab-btn"
          onClick={() => setActiveTab('bulk')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.5rem',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            backgroundColor: activeTab === 'bulk' ? '#4A90D9' : 'transparent',
            color: activeTab === 'bulk' ? '#FFFFFF' : '#64748B',
            fontFamily: "'Baloo 2', cursive",
            fontSize: '1.05rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <Flame size={16} color={activeTab === 'bulk' ? '#FFD93D' : '#FF6B35'} />
          <span>Broadcast Promo Bulk ({activePromoCount} Promo Aktif)</span>
        </button>

        <button
          type="button"
          className="notif-tab-btn"
          onClick={() => setActiveTab('templates')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.5rem',
            borderRadius: '10px 10px 0 0',
            border: 'none',
            backgroundColor: activeTab === 'templates' ? '#4A90D9' : 'transparent',
            color: activeTab === 'templates' ? '#FFFFFF' : '#64748B',
            fontFamily: "'Baloo 2', cursive",
            fontSize: '1.05rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <FileText size={16} color={activeTab === 'templates' ? '#FFD93D' : '#4A90D9'} />
          <span>Editor Template ({templates.length > 0 ? templates.length : 6})</span>
        </button>
      </div>

      {/* TAB 1: Kirim WA Manual */}
      {activeTab === 'manual' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Left Form: Form Input */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div>
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.2rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Formulir Pengiriman Langsung
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                Kirim pesan kustom atau gunakan template untuk konfirmasi dan pengingat
              </p>
            </div>

            {/* Quick Recipient Select */}
            {students.length > 0 && (
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Pilih Cepat Siswa Terdaftar:
                </label>
                <select
                  onChange={handleSelectStudentRecipient}
                  defaultValue=""
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.875rem',
                    backgroundColor: '#F8FAFC',
                    outline: 'none',
                    color: '#1E293B',
                  }}
                >
                  <option value="" disabled>
                    -- Pilih dari daftar siswa ({students.length} Siswa) --
                  </option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} {s.grade ? `(${s.grade})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <form onSubmit={handleSendManual} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Recipient Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Nama Penerima / Siswa:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bunda Ratna / Ananda Kimi"
                  value={manualRecipientName}
                  onChange={(e) => setManualRecipientName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.875rem',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                  }}
                />
              </div>

              {/* Recipient Phone */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Nomor WhatsApp Tujuan: <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    placeholder="Contoh: 081234567890 atau 6281234567890"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.875rem',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.725rem', color: '#64748B', marginTop: '3px' }}>
                  Format nomor dapat menggunakan awalan 08... atau 628...
                </div>
              </div>

              {/* Template Buttons */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Gunakan Template Siap Pakai:
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {QUICK_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      className="btn-touch-sm"
                      onClick={() => handleApplyTemplate(tmpl)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#F8FAFC',
                        color: '#334155',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#EFF6FF';
                        e.currentTarget.style.borderColor = '#4A90D9';
                        e.currentTarget.style.color = '#4A90D9';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#F8FAFC';
                        e.currentTarget.style.borderColor = '#CBD5E1';
                        e.currentTarget.style.color = '#334155';
                      }}
                    >
                      {tmpl.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Textarea */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>
                    Isi Pesan WhatsApp: <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {manualMessage.length} karakter
                  </span>
                </div>
                <textarea
                  rows={6}
                  placeholder="Tuliskan pesan yang ingin disampaikan..."
                  value={manualMessage}
                  onChange={(e) => setManualMessage(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'vertical',
                    backgroundColor: '#FFFFFF',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSendingManual}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '0.8rem',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#4A90D9',
                  color: '#FFFFFF',
                  fontSize: '0.925rem',
                  fontWeight: 700,
                  cursor: isSendingManual ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(74, 144, 217, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                {isSendingManual ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                <span>{isSendingManual ? 'Mengirim via Fonnte...' : 'Kirim Pesan Sekarang'}</span>
              </button>
            </form>
          </div>

          {/* Right: Live WhatsApp Chat Simulator Preview */}
          <div
            style={{
              backgroundColor: '#ECE5DD',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid #D1D7DB',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              minHeight: '400px',
            }}
          >
            {/* WhatsApp App Header Mock */}
            <div
              style={{
                backgroundColor: '#075E54',
                color: '#FFFFFF',
                borderRadius: '10px 10px 0 0',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                margin: '-1.5rem -1.5rem 1rem -1.5rem',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                }}
              >
                🧮
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Djuniors Official</div>
                <div style={{ fontSize: '0.7rem', color: '#A7F3D0' }}>
                  {manualPhone ? `Kepada: ${manualPhone}` : 'WhatsApp Gateway'}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#A7F3D0' }}>Online</div>
            </div>

            {/* Chat Messages Body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Date Stamp */}
              <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(225, 245, 254, 0.92)',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    color: '#54656F',
                    fontWeight: 600,
                  }}
                >
                  HARI INI
                </span>
              </div>

              {/* Message Bubble */}
              <div
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '85%',
                  backgroundColor: '#DCF8C6',
                  borderRadius: '10px 0px 10px 10px',
                  padding: '0.75rem 1rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#111B21',
                    lineHeight: 1.45,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {manualMessage || (
                    <span style={{ color: '#8696A0', fontStyle: 'italic' }}>
                      (Ketikkan pesan di sebelah kiri untuk melihat simulasi tampilan chat WhatsApp...)
                    </span>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px',
                    marginTop: '4px',
                  }}
                >
                  <span style={{ fontSize: '0.65rem', color: '#667781' }}>10:30</span>
                  <CheckCircle2 size={12} color="#53BDEB" />
                </div>
              </div>
            </div>

            {/* Encrypted Notice footer */}
            <div
              style={{
                textAlign: 'center',
                padding: '0.5rem',
                fontSize: '0.68rem',
                color: '#667781',
                backgroundColor: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '8px',
                marginTop: '1rem',
              }}
            >
              🔒 Pesan dienkripsi secara end-to-end melalui Fonnte API Gateway.
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Kirim Promo Bulk (Auto-kirim ke semua siswa aktif) */}
      {activeTab === 'bulk' && (
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.75rem',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor: '#FFF0EA',
                  color: '#FF6B35',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  marginBottom: '0.5rem',
                }}
              >
                <Flame size={14} />
                <span>Otomatisasi Massal</span>
              </div>
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.35rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                Kirim Promo Bulk ke Seluruh Siswa Aktif
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                Pilih kupon diskon untuk disebarkan secara instan ke kontak orang tua siswa aktif.
              </p>
            </div>

            {/* Audience Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                backgroundColor: '#EFF6FF',
                border: '1px solid #BFDBFE',
              }}
            >
              <Users size={20} color="#4A90D9" />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 700 }}>Target Penerima:</div>
                <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.95rem' }}>
                  Semua Siswa Terdaftar
                </div>
              </div>
            </div>
          </div>

          {/* Promo Selector Cards Grid */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.6rem' }}>
              Pilih Kode Promo yang Ingin Disebarkan:
            </label>

            {promos.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', border: '1px dashed #CBD5E1', borderRadius: '12px', color: '#64748B' }}>
                Belum ada kode promo yang dibuat. Buat kode promo terlebih dahulu di menu Kode Promo.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '1rem',
                }}
              >
                {promos.map((promo) => {
                  const isSelected = selectedPromoId === promo.id;
                  const isActive = Boolean(promo.is_active);

                  return (
                    <div
                      key={promo.id}
                      onClick={() => setSelectedPromoId(promo.id)}
                      style={{
                        padding: '1.25rem',
                        borderRadius: '14px',
                        border: isSelected ? '2px solid #4A90D9' : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? '#F0F7FF' : '#FAFCFF',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.2s',
                        boxShadow: isSelected ? '0 4px 14px rgba(74, 144, 217, 0.15)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '1.1rem',
                            color: '#4A90D9',
                            backgroundColor: '#FFFFFF',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px dashed #4A90D9',
                          }}
                        >
                          {promo.code}
                        </span>

                        {isActive ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803D', backgroundColor: '#DCFCE7', padding: '2px 6px', borderRadius: '6px' }}>
                            Aktif
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '6px' }}>
                            Nonaktif
                          </span>
                        )}
                      </div>

                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1E293B', marginBottom: '2px' }}>
                        Potongan{' '}
                        {promo.discount_type === 'percentage'
                          ? `${promo.discount_value}%`
                          : `Rp ${promo.discount_value.toLocaleString('id-ID')}`}
                      </div>

                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {promo.description || 'Kupon promo kelas matematika Djuniors.'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Promo Broadcast Message */}
          {selectedPromoObj && (
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '14px',
                padding: '1.25rem',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#334155' }}>
                  Kustomisasi Pesan Broadcast Promo (Opsional):
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Gunakan tag otomatis {'{nama}'}, {'{kode_promo}'}
                </span>
              </div>

              <textarea
                rows={4}
                value={bulkCustomMessage}
                onChange={(e) => setBulkCustomMessage(e.target.value)}
                placeholder={`Halo {nama}! 🎉 Kabar gembira! Nikmati promo spesial potongan ${
                  selectedPromoObj.discount_type === 'percentage'
                    ? `${selectedPromoObj.discount_value}%`
                    : `Rp ${selectedPromoObj.discount_value.toLocaleString('id-ID')}`
                } untuk pendaftaran kelas matematika Djuniors dengan kode: ${selectedPromoObj.code}!`}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowBulkConfirmModal(true)}
                  disabled={isSendingBulk}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#6BCB77',
                    color: '#FFFFFF',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(107, 203, 119, 0.4)',
                  }}
                >
                  <Send size={16} />
                  <span>Kirim Broadcast Sekarang</span>
                </button>
              </div>
            </div>
          )}

          {/* Broadcast Result Banner */}
          {bulkResult && (
            <div
              style={{
                backgroundColor: '#F0FDF4',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                border: '1px solid #BBF7D0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={20} color="#15803D" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#15803D' }}>
                  Broadcast selesai diproses: {bulkResult.sent} pesan terkirim, {bulkResult.failed} gagal dari total {bulkResult.total} target.
                </span>
              </div>
              <button
                onClick={() => setBulkResult(null)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#15803D',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Editor Template Pesan WA */}
      {activeTab === 'templates' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: '1.5rem',
          }}
        >
          {/* Left Form: Template List & Editor */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                  Editor Template WhatsApp
                </h3>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                  }}
                >
                  Cloudflare D1 Synced
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                Pilih template untuk mengubah teks pesan otomatis, format WhatsApp (*bold*, _italic_), dan tag dinamis.
              </p>
            </div>

            {/* Template Selector Grid / Pills */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                Pilih Template Pesan:
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '8px',
                }}
              >
                {Object.keys(DEFAULT_TEMPLATES_MAP).map((tmplKey) => {
                  const def = DEFAULT_TEMPLATES_MAP[tmplKey];
                  const tmplData = templates.find((t) => t.id === tmplKey);
                  const isSelected = selectedTemplateId === tmplKey;
                  const displayName = tmplData?.name || def.name;

                  return (
                    <button
                      key={tmplKey}
                      type="button"
                      onClick={() => handleSelectTemplate(tmplKey)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #4A90D9' : '1px solid #CBD5E1',
                        backgroundColor: isSelected ? '#EFF6FF' : '#F8FAFC',
                        color: isSelected ? '#1E40AF' : '#334155',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(74, 144, 217, 0.2)' : 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>{def.badge}</span>
                        {isSelected && <Check size={14} color="#4A90D9" />}
                      </div>
                      <span style={{ fontSize: '0.725rem', color: isSelected ? '#3B82F6' : '#64748B', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template Information Card */}
            {selectedTemplateMeta && (
              <div
                style={{
                  backgroundColor: '#F0F9FF',
                  borderRadius: '12px',
                  padding: '0.85rem 1rem',
                  border: '1px solid #BAE6FD',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Info size={15} color="#0284C7" />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0369A1' }}>
                    {selectedTemplateMeta.name} (Slug: <code>{selectedTemplateId}</code>)
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#0C4A6E', margin: 0, lineHeight: 1.4 }}>
                  {selectedTemplateMeta.description}
                </p>
                <div>
                  <div style={{ fontSize: '0.725rem', fontWeight: 700, color: '#0369A1', marginBottom: '4px' }}>
                    Tag Placeholder Template Ini (Klik untuk Menyisipkan):
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {selectedTemplateMeta.placeholders.map((ph) => (
                      <button
                        key={ph}
                        type="button"
                        className="btn-touch-sm"
                        onClick={() => handleInsertPlaceholder(ph)}
                        title={`Klik untuk menyisipkan ${ph}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px dashed #0284C7',
                          backgroundColor: '#FFFFFF',
                          color: '#0369A1',
                          fontSize: '0.725rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#E0F2FE';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                        }}
                      >
                        + {ph}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Collapsible All Placeholders Reference */}
                <details style={{ marginTop: '0.35rem' }}>
                  <summary
                    style={{
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      color: '#0284C7',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    📚 Lihat Semua Placeholder Sistem yang Tersedia ({ALL_PLACEHOLDERS_CATEGORIES.reduce((acc, c) => acc + c.items.length, 0)} tag)
                  </summary>
                  <div
                    style={{
                      marginTop: '0.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                      backgroundColor: '#FFFFFF',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #BAE6FD',
                    }}
                  >
                    {ALL_PLACEHOLDERS_CATEGORIES.map((cat) => (
                      <div key={cat.category}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0369A1', marginBottom: '3px' }}>
                          {cat.category}:
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {cat.items.map((item) => (
                            <button
                              key={item.tag}
                              type="button"
                              className="btn-touch-sm"
                              onClick={() => handleInsertPlaceholder(item.tag)}
                              title={`${item.tag} - ${item.desc}`}
                              style={{
                                padding: '6px 10px',
                                borderRadius: '5px',
                                border: '1px solid #E0F2FE',
                                backgroundColor: '#F0F9FF',
                                color: '#0369A1',
                                fontSize: '0.7rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#BAE6FD';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#F0F9FF';
                              }}
                            >
                              <code>{item.tag}</code>
                              <span style={{ fontSize: '0.65rem', color: '#64748B' }}>({item.desc})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}

            {/* Template Name (Optional Edit) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                Nama / Judul Template:
              </label>
              <input
                type="text"
                value={editorName}
                onChange={(e) => setEditorName(e.target.value)}
                placeholder="Nama template..."
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            {/* Formatting & Emoji Toolbar */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>
                  Toolbar Format WhatsApp:
                </span>
                <span style={{ fontSize: '0.725rem', color: '#94A3B8' }}>
                  Gunakan untuk mempercantik pesan
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-touch-sm"
                  onClick={() => handleInsertFormat('*', '*')}
                  title="Format Tebal (*bold*)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    color: '#1E293B',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  *B* Tebal
                </button>
                <button
                  type="button"
                  className="btn-touch-sm"
                  onClick={() => handleInsertFormat('_', '_')}
                  title="Format Miring (_italic_)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    color: '#1E293B',
                    fontSize: '0.75rem',
                    fontStyle: 'italic',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  _I_ Miring
                </button>
                <button
                  type="button"
                  className="btn-touch-sm"
                  onClick={() => handleInsertFormat('~', '~')}
                  title="Format Coret (~strikethrough~)"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#F8FAFC',
                    color: '#1E293B',
                    fontSize: '0.75rem',
                    textDecoration: 'line-through',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ~S~ Coret
                </button>

                <div style={{ height: '16px', width: '1px', backgroundColor: '#CBD5E1', margin: '0 2px' }} />

                {['👋', '🎉', '🚀', '📚', '⏰', '💳', '💰', '✅', '📞', '🌐', '🧮', '💪', '🔔'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="btn-touch-sm"
                    onClick={() => handleInsertEmoji(em)}
                    title={`Sisipkan emoji ${em}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '34px',
                      minHeight: '34px',
                      padding: '4px 6px',
                      borderRadius: '6px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      lineHeight: 1,
                    }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            {/* Template Content Textarea */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.825rem', fontWeight: 700, color: '#334155' }}>
                  Isi Konten Template: <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: editorContent.length > 2000 ? '#EF4444' : '#64748B',
                    fontWeight: editorContent.length > 2000 ? 800 : 500,
                  }}
                >
                  {editorContent.length} / 2000 karakter
                </span>
              </div>
              <textarea
                ref={editorTextareaRef}
                rows={10}
                placeholder="Tuliskan isi template pesan WhatsApp..."
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: editorContent.length > 2000 ? '1.5px solid #EF4444' : '1px solid #CBD5E1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'vertical',
                  backgroundColor: '#FFFFFF',
                  lineHeight: 1.5,
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Action Buttons: Reset & Save */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleResetTemplate}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.65rem 1rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F1F5F9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
              >
                <RotateCcw size={15} />
                <span>Reset ke Default</span>
              </button>

              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={isSavingTemplate || editorContent.length > 2000}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0.75rem 1.6rem',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#6BCB77',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isSavingTemplate || editorContent.length > 2000 ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(107, 203, 119, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                {isSavingTemplate ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                <span>{isSavingTemplate ? 'Menyimpan ke DB...' : 'Simpan Perubahan Template'}</span>
              </button>
            </div>
          </div>

          {/* Right: Live WhatsApp Chat Simulator Preview */}
          <div
            style={{
              backgroundColor: '#ECE5DD',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid #D1D7DB',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              minHeight: '450px',
            }}
          >
            {/* WhatsApp App Header Mock */}
            <div
              style={{
                backgroundColor: '#075E54',
                color: '#FFFFFF',
                borderRadius: '10px 10px 0 0',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                margin: '-1.5rem -1.5rem 1rem -1.5rem',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.1rem',
                }}
              >
                🧮
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Djuniors Learning Center</div>
                <div style={{ fontSize: '0.7rem', color: '#A7F3D0' }}>
                  Simulasi WhatsApp Gateway (Live Preview)
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#A7F3D0' }}>Official</div>
            </div>

            {/* Chat Messages Body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Date Stamp */}
              <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(225, 245, 254, 0.92)',
                    padding: '3px 10px',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    color: '#54656F',
                    fontWeight: 600,
                  }}
                >
                  PREVIEW TEMPLATE: {selectedTemplateMeta?.name || selectedTemplateId}
                </span>
              </div>

              {/* Message Bubble */}
              <div
                style={{
                  alignSelf: 'flex-end',
                  maxWidth: '90%',
                  backgroundColor: '#DCF8C6',
                  borderRadius: '10px 0px 10px 10px',
                  padding: '0.85rem 1.1rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontSize: '0.875rem',
                    color: '#111B21',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}
                >
                  {renderFormattedWhatsAppText(editorContent)}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px',
                    marginTop: '6px',
                  }}
                >
                  <span style={{ fontSize: '0.65rem', color: '#667781' }}>10:30</span>
                  <CheckCircle2 size={12} color="#53BDEB" />
                </div>
              </div>
            </div>

            {/* Live Sample Notice footer */}
            <div
              style={{
                textAlign: 'center',
                padding: '0.6rem 0.75rem',
                fontSize: '0.725rem',
                color: '#475569',
                backgroundColor: 'rgba(255, 255, 255, 0.75)',
                borderRadius: '10px',
                marginTop: '1rem',
                lineHeight: 1.4,
              }}
            >
              💡 <strong>Simulasi Otomatis:</strong> Tag seperti <code>{'{nomor_pendaftaran}'}</code>, <code>{'{tagihan_akhir}'}</code>, <code>{'{metode_pembayaran}'}</code>, <code>{'{link_pembayaran}'}</code> digantikan dengan nilai data transaksi asli saat dikirim via WhatsApp Fonnte API.
            </div>
          </div>
        </div>
      )}

      {/* SECTION: Log Notifikasi Terkirim */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
              Riwayat & Log Pengiriman Pesan 📜
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
              Daftar seluruh notifikasi dan pesan WhatsApp yang tercatat pada database sistem
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search
                size={16}
                color="#94A3B8"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Cari pesan / tipe..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.825rem',
                  outline: 'none',
                  backgroundColor: '#F8FAFC',
                }}
              />
            </div>

            {/* Filter Status */}
            <select
              value={logStatusFilter}
              onChange={(e) => setLogStatusFilter(e.target.value as any)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#475569',
                backgroundColor: '#FFFFFF',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Semua Status ({notifications.length})</option>
              <option value="sent">✓ Terkirim (sent)</option>
              <option value="pending">⏳ Pending</option>
              <option value="failed">✕ Gagal (failed)</option>
            </select>
          </div>
        </div>

        {/* Notifications Table */}
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={28} className="animate-spin" color="#4A90D9" style={{ margin: '0 auto 0.75rem auto' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Memuat riwayat pengiriman...</div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', border: '1px dashed #E2E8F0', borderRadius: '12px' }}>
            Tidak ada data riwayat notifikasi yang sesuai filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }} className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                    Waktu
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                    Tipe & Channel
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                    Judul / Subjek
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                    Ringkasan Pesan
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', textAlign: 'right' }}>
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map((notif, idx) => {
                  const isSent = notif.status === 'sent';
                  const isPending = notif.status === 'pending';
                  const isFailed = notif.status === 'failed';

                  return (
                    <tr
                      key={notif.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF',
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                        {formatDateTime(notif.created_at)}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <span
                            style={{
                              padding: '2px 7px',
                              borderRadius: '6px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                            }}
                          >
                            {notif.channel || 'WA'}
                          </span>
                          <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                            {notif.type}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.825rem', fontWeight: 700, color: '#1E293B' }}>
                        {notif.title || '-'}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#64748B', maxWidth: '300px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {notif.message || '-'}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isSent && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>Terkirim</span>
                          </span>
                        )}
                        {isPending && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#FFF0EA',
                              color: '#FF6B35',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                            }}
                          >
                            <Clock size={12} />
                            <span>Pending</span>
                          </span>
                        )}
                        {isFailed && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#FEE2E2',
                              color: '#B91C1C',
                              fontSize: '0.725rem',
                              fontWeight: 700,
                            }}
                          >
                            <XCircle size={12} />
                            <span>Gagal</span>
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <button
                          className="btn-touch-sm"
                          onClick={() => setDetailModalItem(notif)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#4A90D9',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Lihat Pesan
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL: Bulk Send Promo */}
      {showBulkConfirmModal && selectedPromoObj && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            className="modal-content modal-responsive"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              animation: 'fadeIn 0.25s ease',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#FFF0EA',
                  color: '#FF6B35',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Flame size={24} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.35rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                  Konfirmasi Broadcast Promo
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
                  Kode Voucher: {selectedPromoObj.code}
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              Apakah Anda yakin ingin mengirimkan broadcast promo ini ke <strong>seluruh siswa aktif</strong> dengan nomor WhatsApp terdaftar?
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(false)}
                disabled={isSendingBulk}
                style={{
                  padding: '0.75rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmBulkSend}
                disabled={isSendingBulk}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#6BCB77',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isSendingBulk ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(107, 203, 119, 0.4)',
                }}
              >
                {isSendingBulk ? <RefreshCw size={16} className="animate-spin" /> : <Send size={16} />}
                <span>{isSendingBulk ? 'Mengirim Broadcast...' : 'Ya, Kirim Massal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: Log Pesan */}
      {detailModalItem && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            className="modal-content modal-responsive"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '500px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              animation: 'fadeIn 0.25s ease',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <button
              onClick={() => setDetailModalItem(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: '#F1F5F9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#64748B',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#4A90D9', fontWeight: 800, textTransform: 'uppercase' }}>
                {detailModalItem.type} • {detailModalItem.channel}
              </div>
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.35rem', fontWeight: 800, color: '#1E293B', margin: '4px 0 0 0' }}>
                {detailModalItem.title || 'Detail Notifikasi WhatsApp'}
              </h3>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                Dikirim pada: {formatDateTime(detailModalItem.created_at)}
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '1.25rem',
                fontSize: '0.875rem',
                color: '#1E293B',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
                maxHeight: '250px',
                overflowY: 'auto',
                marginBottom: '1.25rem',
              }}
            >
              {detailModalItem.message}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(detailModalItem.message || '');
                  showToast('Isi pesan disalin ke clipboard!', 'info');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.65rem 1.2rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Copy size={15} />
                <span>Salin Pesan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
