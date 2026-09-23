// ============================================
// Djuniors Dashboard - Menu Verifikasi Pembayaran
// ============================================
// Antrian bukti bayar yang masuk (payment_tracking):
//   tab "Menunggu" → hanya baris dengan bukti & status pending (queue=true)
//   tab Diterima / Ditolak / Semua → riwayat.
// Aksi Terima/Tolak memakai PUT /api/payment-tracking/:id/confirm —
// satu-satunya jalur verifikasi; otomatis sinkron status registrasi dan
// menutup baris pending lain pada registrasi yang sama.
// Role CS hanya melihat & memverifikasi pendaftaran dari link miliknya
// (di-scope oleh backend).

import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardCheck,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  Image as ImageIcon,
  ExternalLink,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Building2,
  MessageCircle,
  Send as SendIcon,
} from 'lucide-react';
import {
  paymentTrackingApi,
  PaymentTrackingPagination,
  API_BASE_URL,
  csWaApi,
} from '../utils/api';

type TabKey = 'pending' | 'confirmed' | 'rejected' | 'all';

interface TrackingRow {
  id: string;
  registration_id?: string | null;
  registration_number: string;
  parent_phone?: string;
  amount: number;
  payment_method?: string;
  proof_url?: string | null;
  status: 'pending' | 'confirmed' | 'rejected' | string;
  confirmed_by?: string | null;
  confirmed_at?: string | null;
  notes?: string | null;
  created_at: string;
  // join registrasi
  parent_name?: string;
  parent_email?: string;
  children?: any;
  ref_code?: string | null;
  class_name?: string;
  bank_name?: string | null;
  bank_account_number?: string | null;
}

const formatIDR = (val?: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr.replace(' ', 'T') + (dateStr.includes('Z') || dateStr.includes('+') ? '' : 'Z'));
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta',
    }).format(d);
  } catch {
    return dateStr;
  }
};

const parseChildren = (children: any): Array<{ name?: string }> => {
  if (!children) return [];
  if (Array.isArray(children)) return children;
  if (typeof children === 'string') {
    try {
      const parsed = JSON.parse(children);
      return Array.isArray(parsed) ? parsed : [{ name: children }];
    } catch {
      return [{ name: children }];
    }
  }
  return [];
};

// proof_url bisa '/api/files/...' (R2) — harus diprefix base API agar
// termuat dari domain API, bukan domain dashboard.
const resolveProofUrl = (proof?: string | null): string | null => {
  if (!proof) return null;
  if (proof.startsWith('data:') || proof.startsWith('http')) return proof;
  if (proof.startsWith('/')) return `${API_BASE_URL}${proof}`;
  return proof;
};

const statusBadge = (status: string) => {
  switch (status) {
    case 'confirmed':
      return (
        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#DCFCE7', color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <CheckCircle2 size={13} /> Diterima
        </span>
      );
    case 'rejected':
      return (
        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#FEE2E2', color: '#B91C1C', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <XCircle size={13} /> Ditolak
        </span>
      );
    default:
      return (
        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#FEF3C7', color: '#B45309', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={13} /> Menunggu
        </span>
      );
  }
};

export const VerifikasiPembayaran: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [rows, setRows] = useState<TrackingRow[]>([]);
  const [pagination, setPagination] = useState<PaymentTrackingPagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ---- Kirim WhatsApp manual (modal) ----
  const [waModal, setWaModal] = useState<{ row: TrackingRow; phone: string; message: string } | null>(null);
  const [waBusy, setWaBusy] = useState(false);

  const openWaModal = async (row: TrackingRow) => {
    setWaModal({ row, phone: row.parent_phone || '', message: '' });
    if (!row.registration_id) {
      setWaModal({
        row,
        phone: row.parent_phone || '',
        message: '',
      });
      showToast('Baris ini tidak terhubung ke data pendaftaran', 'error');
      return;
    }
    try {
      setWaBusy(true);
      const res = await csWaApi.preview(row.registration_id, row.status === 'pending' ? 'registration' : 'payment');
      setWaModal((prev) =>
        prev && prev.row.id === row.id ? { ...prev, phone: res.phone || prev.phone, message: res.message } : prev
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal memuat pratinjau pesan', 'error');
      setWaModal(null);
    } finally {
      setWaBusy(false);
    }
  };

  const handleSendWa = async () => {
    if (!waModal) return;
    const regId = waModal.row.registration_id;
    if (!regId) {
      showToast('Pendaftaran tidak ditemukan', 'error');
      return;
    }
    if (!waModal.message.trim()) {
      showToast('Pesan masih kosong', 'error');
      return;
    }
    try {
      setWaBusy(true);
      const res = await csWaApi.send({
        registration_id: regId,
        message: waModal.message.trim(),
        phone: waModal.phone.trim() || undefined,
      });
      showToast(res.success ? 'Pesan WhatsApp terkirim' : res.message || 'Gagal mengirim', res.success ? 'success' : 'error');
      if (res.success) setWaModal(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengirim pesan', 'error');
    } finally {
      setWaBusy(false);
    }
  };

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        const res = await paymentTrackingApi.getAll({
          status: activeTab,
          queue: activeTab === 'pending',
          page,
          limit: 20,
        });
        setRows(Array.isArray(res.data) ? res.data : []);
        setPagination(res.pagination || null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Gagal memuat antrian verifikasi';
        showToast(msg, 'error');
        setRows([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeTab, page]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleVerify = async (row: TrackingRow, decision: 'confirmed' | 'rejected') => {
    const label = decision === 'confirmed' ? 'menerima' : 'menolak';
    if (!window.confirm(`Yakin ${label} pembayaran ${row.registration_number} (${formatIDR(row.amount)})?`)) return;
    try {
      setBusyId(row.id);
      const notes = (notesInput[row.id] || '').trim();
      const res = await paymentTrackingApi.confirm(row.id, decision, notes || undefined);
      const wa = (res as { wa_notification?: { status?: string } | null }).wa_notification;
      const waNote =
        decision === 'confirmed' && wa
          ? wa.status === 'sent'
            ? ' · WA terkirim'
            : wa.status === 'failed'
              ? ' · WA gagal terkirim'
              : ''
          : '';
      showToast((res.message || (decision === 'confirmed' ? 'Pembayaran diterima' : 'Pembayaran ditolak')) + waNote);
      setNotesInput((prev) => ({ ...prev, [row.id]: '' }));
      await loadData(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memverifikasi pembayaran';
      showToast(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const filteredRows = rows.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const childNames = parseChildren(r.children).map((ch) => ch.name || '').join(' ').toLowerCase();
    return (
      (r.registration_number || '').toLowerCase().includes(q) ||
      (r.parent_name || '').toLowerCase().includes(q) ||
      (r.parent_phone || '').toLowerCase().includes(q) ||
      childNames.includes(q) ||
      (r.class_name || '').toLowerCase().includes(q)
    );
  });

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'pending', label: 'Menunggu' },
    { key: 'confirmed', label: 'Diterima' },
    { key: 'rejected', label: 'Ditolak' },
    { key: 'all', label: 'Semua' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 300,
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: toastMessage.type === 'success' ? '#10B981' : toastMessage.type === 'error' ? '#EF4444' : '#4A90D9',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : toastMessage.type === 'error' ? <AlertCircle size={18} /> : <Sparkles size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '1.5rem 1.75rem',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <div>
          <span
            style={{
              backgroundColor: '#FFF0EA',
              color: '#FF6B35',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <ClipboardCheck size={14} /> Modul Verifikasi Pembayaran
          </span>
          <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.5rem', color: '#1E293B', margin: '8px 0 4px 0', lineHeight: 1.2 }}>
            Verifikasi Pembayaran Masuk
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>
            Periksa bukti transfer pendaftar, lalu terima atau tolak. Konfirmasi otomatis memperbarui status pendaftaran.
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.65rem 1rem',
            borderRadius: '10px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            color: '#475569',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs + search */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              style={{
                padding: '0.55rem 1.1rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: activeTab === t.key ? '#4A90D9' : '#F1F5F9',
                color: activeTab === t.key ? '#FFFFFF' : '#475569',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {t.label}
              {t.key === 'pending' && pagination && activeTab === 'pending' && pagination.total > 0 ? ` (${pagination.total})` : ''}
            </button>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: '10px',
            padding: '0.5rem 0.85rem',
            width: '100%',
            maxWidth: '340px',
          }}
        >
          <Search size={16} color="#94A3B8" />
          <input
            type="text"
            placeholder="Cari No. reg, nama, WA, kelas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.875rem', width: '100%', color: '#1E293B' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <RefreshCw size={18} className="animate-spin" color="#4A90D9" />
            <span>Memuat antrian verifikasi...</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
            <ImageIcon size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {activeTab === 'pending' ? 'Tidak ada bukti bayar yang menunggu verifikasi 🎉' : 'Tidak ada data pada tab ini'}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>
              {activeTab === 'pending' ? 'Semua pembayaran sudah diproses.' : 'Coba ganti tab atau kata kunci pencarian.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filteredRows.map((row, idx) => {
              const proof = resolveProofUrl(row.proof_url);
              const childrenList = parseChildren(row.children);
              return (
                <div
                  key={row.id}
                  style={{
                    padding: '1.25rem 1.5rem',
                    borderBottom: idx < filteredRows.length - 1 ? '1px solid #F1F5F9' : 'none',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '1.25rem',
                    alignItems: 'flex-start',
                    backgroundColor: activeTab === 'pending' && row.status === 'pending' ? '#FFFDF9' : '#FFFFFF',
                  }}
                >
                  {/* Bukti thumbnail */}
                  <div style={{ flexShrink: 0, width: '150px' }}>
                    {proof ? (
                      <div style={{ position: 'relative' }}>
                        <img
                          src={proof}
                          alt="Bukti Transfer"
                          loading="lazy"
                          onClick={() => setLightboxUrl(proof)}
                          style={{
                            width: '150px',
                            height: '110px',
                            objectFit: 'cover',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            cursor: 'zoom-in',
                            backgroundColor: '#F8FAFC',
                          }}
                        />
                        <button
                          onClick={() => setLightboxUrl(proof)}
                          style={{
                            position: 'absolute',
                            bottom: '6px',
                            right: '6px',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '3px 7px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            backgroundColor: 'rgba(15, 23, 42, 0.75)',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <ExternalLink size={10} /> Perbesar
                        </button>
                      </div>
                    ) : (
                      <div
                        style={{
                          width: '150px',
                          height: '110px',
                          borderRadius: '10px',
                          border: '1px dashed #CBD5E1',
                          backgroundColor: '#F8FAFC',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#94A3B8',
                          fontSize: '0.72rem',
                          gap: '4px',
                        }}
                      >
                        <ImageIcon size={22} color="#CBD5E1" />
                        Tanpa bukti
                      </div>
                    )}
                  </div>

                  {/* Info utama */}
                  <div style={{ flex: 1, minWidth: '230px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: '#1E293B', backgroundColor: '#EFF6FF', padding: '2px 8px', borderRadius: '6px' }}>
                        {row.registration_number}
                      </span>
                      {statusBadge(row.status)}
                      {row.ref_code && (
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, backgroundColor: '#F5F3FF', color: '#6D28D9', padding: '2px 8px', borderRadius: '6px' }}>
                          CS: {row.ref_code}
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.95rem', marginTop: '6px' }}>
                      {row.parent_name || '(Tanpa nama)'}
                      {childrenList.length > 0 && (
                        <span style={{ fontWeight: 500, color: '#64748B', fontSize: '0.8rem' }}>
                          {' '}· Anak: {childrenList.map((ch) => ch.name).join(', ')}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '3px' }}>
                      {row.class_name ? `Kelas: ${row.class_name}` : 'Kelas -'}
                      {row.parent_phone ? ` · WA: ${row.parent_phone}` : ''}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '3px' }}>
                      Masuk: {formatDate(row.created_at)}
                      {row.confirmed_at ? ` · Diproses: ${formatDate(row.confirmed_at)} oleh ${row.confirmed_by || 'admin'}` : ''}
                    </div>
                    {row.notes && (
                      <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px', fontStyle: 'italic' }}>
                        "{row.notes}"
                      </div>
                    )}
                  </div>

                  {/* Nominal */}
                  <div style={{ minWidth: '160px', textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Nominal</div>
                    <div style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.25rem', fontWeight: 800, color: '#1E293B' }}>
                      {formatIDR(row.amount)}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {row.payment_method === 'qris' ? 'QRIS' : row.payment_method === 'ewallet' ? 'E-Wallet' : 'Transfer Bank'}
                    </div>
                    {row.bank_name && (
                      <div style={{ fontSize: '0.72rem', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px', marginTop: '2px' }}>
                        <Building2 size={11} /> {row.bank_name} · {row.bank_account_number}
                      </div>
                    )}
                    {(row.registration_id || row.parent_phone) && (
                      <button
                        onClick={() => openWaModal(row)}
                        disabled={waBusy}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          marginTop: '8px',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '8px',
                          border: '1px solid #A7F3D0',
                          backgroundColor: '#ECFDF5',
                          color: '#047857',
                          fontSize: '0.78rem',
                          fontWeight: 800,
                          cursor: waBusy ? 'wait' : 'pointer',
                        }}
                      >
                        <MessageCircle size={13} /> Kirim WA
                      </button>
                    )}
                  </div>

                  {/* Aksi (hanya tab menunggu / status pending) */}
                  {row.status === 'pending' && (
                    <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <input
                        type="text"
                        placeholder="Catatan (opsional): transfer dari a.n. ..."
                        value={notesInput[row.id] || ''}
                        onChange={(e) => setNotesInput((prev) => ({ ...prev, [row.id]: e.target.value }))}
                        style={{
                          flex: '1 1 220px',
                          maxWidth: '360px',
                          padding: '0.6rem 0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      />
                      <button
                        disabled={busyId === row.id}
                        onClick={() => handleVerify(row, 'rejected')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.6rem 1.1rem',
                          borderRadius: '10px',
                          border: '1px solid #FECACA',
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: busyId === row.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <XCircle size={15} /> Tolak
                      </button>
                      <button
                        disabled={busyId === row.id}
                        onClick={() => handleVerify(row, 'confirmed')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.6rem 1.3rem',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          cursor: busyId === row.id ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        <CheckCircle2 size={15} /> {busyId === row.id ? 'Memproses...' : 'Terima'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div
            style={{
              padding: '0.9rem 1.5rem',
              borderTop: '1px solid #F1F5F9',
              backgroundColor: '#FAFAFA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.825rem',
              color: '#64748B',
            }}
          >
            <span>
              Halaman {pagination.page} dari {pagination.total_pages} · {pagination.total} total data
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontWeight: 700,
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={15} /> Sebelumnya
              </button>
              <button
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  fontWeight: 700,
                  cursor: page >= pagination.total_pages ? 'not-allowed' : 'pointer',
                  opacity: page >= pagination.total_pages ? 0.5 : 1,
                }}
              >
                Berikutnya <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Kirim WhatsApp Manual */}
      {waModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            zIndex: 260,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
          }}
          onClick={() => {
            if (!waBusy) setWaModal(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '560px',
              padding: '1.5rem',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div>
                <span
                  style={{
                    backgroundColor: '#ECFDF5',
                    color: '#047857',
                    padding: '3px 9px',
                    borderRadius: '7px',
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <MessageCircle size={13} /> Kirim WhatsApp
                </span>
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.25rem', color: '#1E293B', margin: '8px 0 0 0' }}>
                  {waModal.row.registration_number}
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '2px 0 0 0' }}>
                  {waModal.row.parent_name || 'Pendaftar'}
                  {waModal.row.ref_code ? ` · CS: ${waModal.row.ref_code}` : ''}
                </p>
              </div>
              <button
                onClick={() => !waBusy && setWaModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ marginTop: '1.1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '5px' }}>
                Tujuan (WhatsApp)
              </label>
              <input
                value={waModal.phone}
                onChange={(e) => setWaModal({ ...waModal, phone: e.target.value })}
                placeholder="08xxxxxxxxxx"
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginTop: '0.9rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: '5px' }}>
                Pesan
              </label>
              <textarea
                value={waModal.message}
                onChange={(e) => setWaModal({ ...waModal, message: e.target.value })}
                rows={10}
                maxLength={3000}
                placeholder={waBusy ? 'Memuat pratinjau pesan...' : 'Tulis pesan...'}
                style={{
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.9rem',
                  lineHeight: 1.55,
                  resize: 'vertical',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: '0.73rem', color: '#94A3B8', marginTop: '4px' }}>
                {waBusy
                  ? 'Memuat pratinjau dari template CS...'
                  : 'Pratinjau terisi dari template WhatsApp milik CS — bisa diedit sebelum dikirim. Token Fonnte CS (atau global) yang dipakai.'}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1.1rem' }}>
              <button
                disabled={waBusy}
                onClick={() => setWaModal(null)}
                style={{
                  padding: '0.65rem 1.2rem',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: waBusy ? 'not-allowed' : 'pointer',
                }}
              >
                Batal
              </button>
              <button
                disabled={waBusy || !waModal.message.trim()}
                onClick={handleSendWa}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.65rem 1.4rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: waBusy || !waModal.message.trim() ? '#94A3B8' : '#10B981',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  cursor: waBusy || !waModal.message.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                <SendIcon size={15} /> {waBusy ? 'Mengirim...' : 'Kirim Pesan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', cursor: 'zoom-out' }}
          onClick={() => setLightboxUrl(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img src={lightboxUrl} alt="Bukti Transfer Penuh" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px' }} />
            <button
              onClick={() => setLightboxUrl(null)}
              style={{ position: 'absolute', top: '-40px', right: '0', background: '#FFFFFF', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifikasiPembayaran;
