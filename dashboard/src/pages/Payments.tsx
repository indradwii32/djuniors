// ============================================
// Djuniors Dashboard - Payments Management Page
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  Check,
  X,
  Upload,
  Copy,
  Building2,
  DollarSign,
  AlertCircle,
  FileText,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import {
  paymentsApi,
  PaymentItem,
  BankAccount,
} from '../utils/api';

// Fallback bank accounts if API returns empty
const DEFAULT_BANKS: BankAccount[] = [
  {
    id: 'bank-001',
    bank_name: 'BCA (Bank Central Asia)',
    account_number: '1234567890',
    account_name: 'PT Djuniors Indonesia',
    is_active: 1,
  },
  {
    id: 'bank-002',
    bank_name: 'Bank Mandiri',
    account_number: '123456789012345',
    account_name: 'PT Djuniors Indonesia',
    is_active: 1,
  },
];

export const Payments: React.FC = () => {
  // Data States
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [banks, setBanks] = useState<BankAccount[]>(DEFAULT_BANKS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'success' | 'failed'>('all');
  const [dateSort, setDateSort] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');

  // Action Modals State
  const [verifyModalPayment, setVerifyModalPayment] = useState<PaymentItem | null>(null);
  const [verifyNotes, setVerifyNotes] = useState<string>('');
  const [isSubmittingVerify, setIsSubmittingVerify] = useState<boolean>(false);

  const [rejectModalPayment, setRejectModalPayment] = useState<PaymentItem | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState<boolean>(false);

  // Proof Viewer / Upload Modal State
  const [proofModalPayment, setProofModalPayment] = useState<PaymentItem | null>(null);
  const [uploadProofPayment, setUploadProofPayment] = useState<PaymentItem | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState<boolean>(false);

  // Copied state for bank accounts
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  // Load all payments and banks
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setErrorMsg(null);

      const [paymentsRes, banksRes] = await Promise.allSettled([
        paymentsApi.getAll(),
        paymentsApi.getBanks(),
      ]);

      if (paymentsRes.status === 'fulfilled' && Array.isArray(paymentsRes.value)) {
        setPayments(paymentsRes.value);
      } else {
        setPayments([]);
      }

      if (banksRes.status === 'fulfilled' && Array.isArray(banksRes.value) && banksRes.value.length > 0) {
        setBanks(banksRes.value);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data pembayaran';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toast Notification Helper
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Copy bank account number to clipboard
  const handleCopyAccount = (bank: BankAccount) => {
    navigator.clipboard.writeText(bank.account_number);
    setCopiedBankId(bank.id);
    showToast(`No. Rekening ${bank.bank_name} disalin ke clipboard!`, 'info');
    setTimeout(() => setCopiedBankId(null), 2500);
  };

  // Format Currency IDR
  const formatIDR = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Format Date and Time
  const formatDateTime = (dateStr: string) => {
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

  // Verification Handler (Set status to success)
  const handleConfirmVerify = async () => {
    if (!verifyModalPayment) return;

    try {
      setIsSubmittingVerify(true);
      await paymentsApi.verify(verifyModalPayment.id, 'success', verifyNotes);

      // Optimistic update
      setPayments((prev) =>
        prev.map((p) =>
          p.id === verifyModalPayment.id
            ? { ...p, status: 'success', notes: verifyNotes || p.notes }
            : p
        )
      );

      showToast(`Pembayaran Rp ${verifyModalPayment.amount.toLocaleString('id-ID')} berhasil diverifikasi! Kelas siswa telah aktif.`);
      setVerifyModalPayment(null);
      setVerifyNotes('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memverifikasi pembayaran';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingVerify(false);
    }
  };

  // Reject Handler (Set status to failed)
  const handleConfirmReject = async () => {
    if (!rejectModalPayment) return;

    try {
      setIsSubmittingReject(true);
      await paymentsApi.verify(rejectModalPayment.id, 'failed', rejectReason);

      // Optimistic update
      setPayments((prev) =>
        prev.map((p) =>
          p.id === rejectModalPayment.id
            ? { ...p, status: 'failed', notes: rejectReason || p.notes }
            : p
        )
      );

      showToast(`Pembayaran telah ditolak/dinyatakan gagal.`, 'info');
      setRejectModalPayment(null);
      setRejectReason('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses penolakan pembayaran';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Handle Proof File Change Placeholder
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Uploaded Proof Placeholder
  const handleSaveProofPlaceholder = async () => {
    if (!uploadProofPayment) return;

    try {
      setIsSubmittingProof(true);
      const simulatedUrl =
        uploadedPreviewUrl ||
        `https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=800`;

      // Update in local state
      setPayments((prev) =>
        prev.map((p) =>
          p.id === uploadProofPayment.id ? { ...p, proof_url: simulatedUrl } : p
        )
      );

      showToast('Bukti transfer berhasil diperbarui!', 'success');
      setUploadProofPayment(null);
      setUploadedPreviewUrl(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan bukti transfer';
      showToast(msg, 'error');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Filtered & Sorted Payments List
  const filteredPayments = payments
    .filter((p) => {
      // Search
      const q = searchQuery.toLowerCase();
      const matchSearch =
        p.id.toLowerCase().includes(q) ||
        (p.student_name && p.student_name.toLowerCase().includes(q)) ||
        (p.class_name && p.class_name.toLowerCase().includes(q)) ||
        (p.method && p.method.toLowerCase().includes(q));

      // Status
      if (statusFilter === 'all') return matchSearch;
      return matchSearch && p.status === statusFilter;
    })
    .sort((a, b) => {
      if (dateSort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (dateSort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (dateSort === 'highest') return (b.amount || 0) - (a.amount || 0);
      if (dateSort === 'lowest') return (a.amount || 0) - (b.amount || 0);
      return 0;
    });

  // Calculate Metrics
  const totalAmount = payments
    .filter((p) => p.status === 'success')
    .reduce((acc, p) => acc + (p.amount || 0), 0);

  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const successCount = payments.filter((p) => p.status === 'success').length;
  const failedCount = payments.filter((p) => p.status === 'failed').length;

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
            backgroundColor: 'rgba(74, 144, 217, 0.15)',
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
              backgroundColor: 'rgba(74, 144, 217, 0.25)',
              color: '#93C5FD',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
            }}
          >
            <CreditCard size={14} color="#FFD93D" />
            <span>Manajemen Finansial & Transaksi</span>
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
            Verifikasi Pembayaran Siswa 💳
          </h2>

          <p style={{ margin: 0, color: '#CBD5E1', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Pantau transfer bank masuk, periksa bukti transfer, dan lakukan verifikasi pembayaran
            untuk mengaktifkan keanggotaan kelas matematika siswa secara instan.
          </p>
        </div>

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
            <span>{isRefreshing ? 'Memuat...' : 'Segarkan Data'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            color: '#B91C1C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{errorMsg}</span>
          </div>
          <button
            onClick={() => loadData()}
            style={{
              background: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '4px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Bank Accounts Destination Banner (Info Bank Tujuan Transfer) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#4A90D9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.15rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Rekening Bank Tujuan Transfer Manual
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                Rekening resmi Djuniors yang digunakan untuk menerima transfer pembayaran pendaftaran kursus
              </p>
            </div>
          </div>

          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#4A90D9',
              backgroundColor: '#EFF6FF',
              padding: '4px 10px',
              borderRadius: '8px',
            }}
          >
            Sistem Kode Unik 3 Digit Aktif
          </div>
        </div>

        {/* Bank Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}
        >
          {banks.map((bank) => {
            const isCopied = copiedBankId === bank.id;
            return (
              <div
                key={bank.id}
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      backgroundColor: '#1E293B',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {bank.bank_name.includes('BCA') ? 'BCA' : bank.bank_name.includes('Mandiri') ? 'MDR' : 'BANK'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B' }}>
                      {bank.bank_name}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#4A90D9', letterSpacing: '0.5px' }}>
                      {bank.account_number}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      a/n {bank.account_name}
                    </div>
                  </div>
                </div>

                <button
                  className="btn-touch-sm"
                  onClick={() => handleCopyAccount(bank)}
                  title="Salin No. Rekening"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: isCopied ? '#DCFCE7' : '#FFFFFF',
                    color: isCopied ? '#15803D' : '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{isCopied ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metric Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Total Terverifikasi (Rp) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#EFF6FF',
              color: '#4A90D9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
              Pendapatan Terverifikasi
            </div>
            <div
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#1E293B',
                lineHeight: 1.1,
              }}
            >
              {formatIDR(totalAmount)}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6BCB77', fontWeight: 700, marginTop: '2px' }}>
              {successCount} transaksi sukses
            </div>
          </div>
        </div>

        {/* Menunggu Verifikasi (Pending) - Happy Orange #FF6B35 */}
        <div
          style={{
            backgroundColor: pendingCount > 0 ? '#FFF9F5' : '#FFFFFF',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            border: pendingCount > 0 ? '1px solid #FFD0B8' : '1px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#FFF0EA',
              color: '#FF6B35',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FF6B35' }}>
              Menunggu Verifikasi
            </div>
            <div
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#FF6B35',
                lineHeight: 1.1,
              }}
            >
              {pendingCount} Transaksi
            </div>
            <div style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600, marginTop: '2px' }}>
              {pendingCount > 0 ? '⚠️ Butuh tindakan admin' : 'Semua transaksi beres'}
            </div>
          </div>
        </div>

        {/* Berhasil (Success) - Fresh Green #6BCB77 */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#F0FDF4',
              color: '#6BCB77',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
              Pembayaran Berhasil
            </div>
            <div
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#1E293B',
                lineHeight: 1.1,
              }}
            >
              {successCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6BCB77', fontWeight: 700, marginTop: '2px' }}>
              Kelas aktif otomatis
            </div>
          </div>
        </div>

        {/* Gagal / Dibatalkan */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.25rem 1.5rem',
            border: '1px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: '#FEF2F2',
              color: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <XCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
              Gagal / Dibatalkan
            </div>
            <div
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.4rem',
                fontWeight: 800,
                color: '#1E293B',
                lineHeight: 1.1,
              }}
            >
              {failedCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
              Invoice tidak valid / ditolak
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Search Box */}
        <div
          style={{
            position: 'relative',
            flex: '1',
            minWidth: '260px',
            maxWidth: '450px',
          }}
        >
          <Search
            size={18}
            color="#94A3B8"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          />
          <input
            type="text"
            placeholder="Cari siswa, kelas, ID invoice, atau metode..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.65rem 1rem 0.65rem 2.4rem',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              fontSize: '0.9rem',
              outline: 'none',
              backgroundColor: '#F8FAFC',
            }}
          />
        </div>

        {/* Status Filters Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: statusFilter === 'all' ? '#4A90D9' : '#F1F5F9',
              color: statusFilter === 'all' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s',
            }}
          >
            Semua ({payments.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: statusFilter === 'pending' ? '#FF6B35' : '#FFF0EA',
              color: statusFilter === 'pending' ? '#FFFFFF' : '#FF6B35',
              transition: 'all 0.2s',
            }}
          >
            ⏳ Pending ({pendingCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('success')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: statusFilter === 'success' ? '#6BCB77' : '#DCFCE7',
              color: statusFilter === 'success' ? '#FFFFFF' : '#15803D',
              transition: 'all 0.2s',
            }}
          >
            ✓ Berhasil ({successCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('failed')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: statusFilter === 'failed' ? '#EF4444' : '#FEE2E2',
              color: statusFilter === 'failed' ? '#FFFFFF' : '#B91C1C',
              transition: 'all 0.2s',
            }}
          >
            ✕ Gagal ({failedCount})
          </button>

          {/* Sort Dropdown */}
          <select
            value={dateSort}
            onChange={(e) => setDateSort(e.target.value as any)}
            style={{
              padding: '0.55rem 0.75rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#475569',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="highest">Nominal Tertinggi</option>
            <option value="lowest">Nominal Terendah</option>
          </select>
        </div>
      </div>

      {/* Payments Table View */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748B' }}>
            <RefreshCw size={32} className="animate-spin" color="#4A90D9" style={{ margin: '0 auto 1rem auto' }} />
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1E293B' }}>
              Memuat data transaksi pembayaran...
            </div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div
            style={{
              padding: '4rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '16px',
                backgroundColor: '#EFF6FF',
                color: '#4A90D9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CreditCard size={32} />
            </div>
            <div>
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.5rem 0' }}>
                Tidak Ada Pembayaran Ditemukan
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '420px', margin: 0 }}>
                {searchQuery || statusFilter !== 'all'
                  ? 'Tidak ada transaksi yang cocok dengan filter atau kata kunci yang Anda masukkan.'
                  : 'Belum ada data transaksi pembayaran yang terdaftar di sistem.'}
              </p>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }} className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ID & Waktu
                  </th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Siswa & Kelas
                  </th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Nominal Transfer
                  </th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Metode Pembayaran
                  </th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Bukti Transfer
                  </th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Status
                  </th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.78rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
                    Aksi Verifikasi
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p, idx) => {
                  const isPending = p.status === 'pending';
                  const isSuccess = p.status === 'success';
                  const isFailed = p.status === 'failed';

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFCFF',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      {/* ID & Date */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle' }}>
                        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#1E293B' }}>
                          #{p.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                          {formatDateTime(p.created_at)}
                        </div>
                      </td>

                      {/* Student & Class */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.925rem', color: '#1E293B' }}>
                          {p.student_name || 'Siswa Djuniors'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#4A90D9', fontWeight: 600, marginTop: '2px' }}>
                          {p.class_name || 'Program Kelas'}
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle' }}>
                        <div
                          style={{
                            fontFamily: "'Baloo 2', cursive",
                            fontSize: '1.1rem',
                            fontWeight: 800,
                            color: '#1E293B',
                          }}
                        >
                          {formatIDR(p.amount)}
                        </div>
                        {p.notes && (
                          <div style={{ fontSize: '0.725rem', color: '#64748B', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.notes}>
                            📝 {p.notes}
                          </div>
                        )}
                      </td>

                      {/* Method */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#F1F5F9',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: '#334155',
                          }}
                        >
                          <Building2 size={13} color="#4A90D9" />
                          <span>
                            {p.method === 'manual_transfer'
                              ? 'Transfer Bank'
                              : p.method?.toUpperCase() || 'MANUAL'}
                          </span>
                        </div>
                      </td>

                      {/* Proof of Payment (Bukti Transfer) */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle' }}>
                        {p.proof_url ? (
                          <button
                            className="btn-touch-sm"
                            onClick={() => setProofModalPayment(p)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #BAE6FD',
                              backgroundColor: '#F0F9FF',
                              color: '#0284C7',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            <Eye size={14} />
                            <span>Lihat Bukti</span>
                          </button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              className="btn-touch-sm"
                              onClick={() => {
                                setUploadProofPayment(p);
                                setUploadedPreviewUrl(null);
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px dashed #CBD5E1',
                                backgroundColor: '#F8FAFC',
                                color: '#64748B',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <Upload size={12} />
                              <span>Upload</span>
                            </button>
                            <button
                              className="btn-touch-sm"
                              onClick={() => setProofModalPayment(p)}
                              title="Lihat Struk Sistem"
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#4A90D9',
                                cursor: 'pointer',
                                padding: '6px 8px',
                                minWidth: '34px',
                                minHeight: '34px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Eye size={14} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle' }}>
                        {isPending && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              backgroundColor: '#FFF0EA',
                              color: '#FF6B35',
                              border: '1px solid #FFD0B8',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            <Clock size={13} />
                            <span>Menunggu</span>
                          </span>
                        )}
                        {isSuccess && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              backgroundColor: '#DCFCE7',
                              color: '#15803D',
                              border: '1px solid #BBF7D0',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={13} />
                            <span>Berhasil</span>
                          </span>
                        )}
                        {isFailed && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 10px',
                              borderRadius: '20px',
                              backgroundColor: '#FEE2E2',
                              color: '#B91C1C',
                              border: '1px solid #FECACA',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                            }}
                          >
                            <XCircle size={13} />
                            <span>Gagal / Ditolak</span>
                          </span>
                        )}
                      </td>

                      {/* Verification Actions */}
                      <td style={{ padding: '1rem 1.25rem', verticalAlign: 'middle', textAlign: 'right' }}>
                        {isPending ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              className="btn-touch-sm"
                              onClick={() => {
                                setVerifyModalPayment(p);
                                setVerifyNotes('');
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#6BCB77',
                                color: '#FFFFFF',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(107, 203, 119, 0.3)',
                                transition: 'all 0.2s',
                              }}
                            >
                              <Check size={14} />
                              <span>Verifikasi</span>
                            </button>

                            <button
                              className="btn-touch-sm"
                              onClick={() => {
                                setRejectModalPayment(p);
                                setRejectReason('');
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #FECACA',
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              title="Tolak Pembayaran"
                            >
                              <X size={14} />
                              <span>Tolak</span>
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                            <button
                              className="btn-touch-sm"
                              onClick={() => setProofModalPayment(p)}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#FFFFFF',
                                color: '#475569',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <FileText size={13} />
                              <span>Detail</span>
                            </button>

                            {isFailed && (
                              <button
                                className="btn-touch-sm"
                                onClick={() => {
                                  setVerifyModalPayment(p);
                                  setVerifyNotes('');
                                }}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid #BBF7D0',
                                  backgroundColor: '#F0FDF4',
                                  color: '#15803D',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                <Check size={13} />
                                <span>Verifikasi Ulang</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Confirm Verification Modal */}
      {verifyModalPayment && (
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
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: '#DCFCE7',
                  color: '#15803D',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.35rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                  Verifikasi Pembayaran Siswa
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
                  Invoice #{verifyModalPayment.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>

            {/* Summary Details Box */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                padding: '1rem',
                border: '1px solid #E2E8F0',
                marginBottom: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Siswa:</span>
                <span style={{ fontWeight: 700, color: '#1E293B' }}>{verifyModalPayment.student_name || 'Siswa'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Kelas:</span>
                <span style={{ fontWeight: 700, color: '#4A90D9' }}>{verifyModalPayment.class_name || 'Kelas Matematika'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '0.5rem' }}>
                <span style={{ color: '#64748B', fontWeight: 700 }}>Nominal Pembayaran:</span>
                <span style={{ fontWeight: 800, color: '#1E293B', fontSize: '1.05rem', fontFamily: "'Baloo 2', cursive" }}>
                  {formatIDR(verifyModalPayment.amount)}
                </span>
              </div>
            </div>

            {/* Notes Input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Catatan Verifikasi (Opsional):
              </label>
              <textarea
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                placeholder="Contoh: Pembayaran via BCA sesuai mutasi rekening."
                rows={3}
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
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setVerifyModalPayment(null)}
                disabled={isSubmittingVerify}
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
                onClick={handleConfirmVerify}
                disabled={isSubmittingVerify}
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
                  cursor: isSubmittingVerify ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(107, 203, 119, 0.4)',
                }}
              >
                {isSubmittingVerify ? <RefreshCw size={16} className="animate-spin" /> : <Check size={16} />}
                <span>{isSubmittingVerify ? 'Menyetujui...' : 'Setujui & Aktifkan Kelas'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Reject Payment Modal */}
      {rejectModalPayment && (
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
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
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
                  backgroundColor: '#FEE2E2',
                  color: '#B91C1C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <XCircle size={24} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.35rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                  Tolak Pembayaran
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
                  Nominal: {formatIDR(rejectModalPayment.amount)} • Siswa: {rejectModalPayment.student_name}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                Alasan Penolakan:
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Bukti transfer tidak terbaca / nominal transfer tidak sesuai mutasi."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  resize: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRejectModalPayment(null)}
                disabled={isSubmittingReject}
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
                onClick={handleConfirmReject}
                disabled={isSubmittingReject}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isSubmittingReject ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmittingReject ? <RefreshCw size={16} className="animate-spin" /> : <X size={16} />}
                <span>{isSubmittingReject ? 'Memproses...' : 'Konfirmasi Tolak'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Proof Viewer & Simulated Receipt Modal */}
      {proofModalPayment && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(5px)',
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
              maxWidth: '520px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              animation: 'fadeIn 0.25s ease',
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setProofModalPayment(null)}
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

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  backgroundColor: '#EFF6FF',
                  color: '#4A90D9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem auto',
                }}
              >
                <FileText size={26} />
              </div>
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.4rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                Bukti & Struk Pembayaran
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                Invoice ID: #{proofModalPayment.id.slice(0, 8).toUpperCase()}
              </p>
            </div>

            {/* If has uploaded proof image */}
            {proofModalPayment.proof_url ? (
              <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
                <img
                  src={proofModalPayment.proof_url}
                  alt="Bukti Transfer"
                  style={{
                    width: '100%',
                    maxHeight: '260px',
                    objectFit: 'contain',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    backgroundColor: '#0F172A',
                  }}
                />
              </div>
            ) : null}

            {/* Realistic Digital Transfer Slip (Struk Pembayaran) */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748B' }}>Status Transaksi:</span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      proofModalPayment.status === 'success'
                        ? '#15803D'
                        : proofModalPayment.status === 'pending'
                        ? '#FF6B35'
                        : '#B91C1C',
                  }}
                >
                  {proofModalPayment.status === 'success'
                    ? '✓ Berhasil / Lunas'
                    : proofModalPayment.status === 'pending'
                    ? '⏳ Menunggu Verifikasi'
                    : '✕ Gagal'}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Nama Siswa:</span>
                <span style={{ fontWeight: 700, color: '#1E293B' }}>{proofModalPayment.student_name || '-'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Program / Kelas:</span>
                <span style={{ fontWeight: 700, color: '#4A90D9' }}>{proofModalPayment.class_name || '-'}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Metode Transfer:</span>
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  {proofModalPayment.method === 'manual_transfer' ? 'Transfer Bank (BCA / Mandiri)' : proofModalPayment.method}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Waktu Transaksi:</span>
                <span style={{ color: '#334155' }}>{formatDateTime(proofModalPayment.created_at)}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '2px dashed #CBD5E1',
                  paddingTop: '0.75rem',
                  marginTop: '0.25rem',
                }}
              >
                <span style={{ fontWeight: 800, color: '#1E293B' }}>Total Nominal:</span>
                <span
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#1E293B',
                  }}
                >
                  {formatIDR(proofModalPayment.amount)}
                </span>
              </div>
            </div>

            {/* Quick Action in Modal */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => {
                  setProofModalPayment(null);
                  setUploadProofPayment(proofModalPayment);
                  setUploadedPreviewUrl(null);
                }}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Upload size={15} />
                <span>Upload Bukti Baru</span>
              </button>

              {proofModalPayment.status === 'pending' && (
                <button
                  onClick={() => {
                    const current = proofModalPayment;
                    setProofModalPayment(null);
                    setVerifyModalPayment(current);
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#6BCB77',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Check size={16} />
                  <span>Verifikasi Sekarang</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Upload Bukti Transfer (Placeholder) */}
      {uploadProofPayment && (
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
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
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
                  backgroundColor: '#EFF6FF',
                  color: '#4A90D9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Upload size={22} />
              </div>
              <div>
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.35rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                  Upload Bukti Transfer
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
                  Lampirkan struk / screenshot m-Banking siswa
                </p>
              </div>
            </div>

            {/* Drag & Drop or File Input Placeholder */}
            <div
              style={{
                border: '2px dashed #CBD5E1',
                borderRadius: '14px',
                padding: '1.5rem',
                textAlign: 'center',
                backgroundColor: '#F8FAFC',
                marginBottom: '1.5rem',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%',
                }}
              />
              {uploadedPreviewUrl ? (
                <div>
                  <img
                    src={uploadedPreviewUrl}
                    alt="Preview"
                    style={{
                      maxHeight: '160px',
                      borderRadius: '8px',
                      marginBottom: '0.5rem',
                    }}
                  />
                  <div style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 700 }}>
                    ✓ File gambar terpilih. Klik simpan untuk menyimpan.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <ImageIcon size={32} color="#94A3B8" />
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#334155' }}>
                    Klik atau seret foto bukti transfer ke sini
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                    Format PNG, JPG, atau JPEG (Maks. 5MB)
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setUploadProofPayment(null);
                  setUploadedPreviewUrl(null);
                }}
                disabled={isSubmittingProof}
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
                onClick={handleSaveProofPlaceholder}
                disabled={isSubmittingProof}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#4A90D9',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isSubmittingProof ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(74, 144, 217, 0.4)',
                }}
              >
                {isSubmittingProof ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
                <span>{isSubmittingProof ? 'Menyimpan...' : 'Simpan Bukti'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
