// ============================================
// Djuniors Dashboard - Registrations & Payments Page (Unified)
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  X,
  BookOpen,
  User,
  Phone,
  MapPin,
  CreditCard,
  ExternalLink,
  MessageSquare,
  Sparkles,
  FileText,
  Check,
} from 'lucide-react';
import {
  registrationsApi,
  RegistrationItem,
  RegistrationChild,
} from '../utils/api';

export const Registrations: React.FC = () => {
  // Data States
  const [registrations, setRegistrations] = useState<RegistrationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'all' | 'unpaid' | 'pending' | 'paid' | 'rejected'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');

  // Detail Modal State
  const [detailModalItem, setDetailModalItem] = useState<RegistrationItem | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [adminNotesInput, setAdminNotesInput] = useState<string>('');
  const [selectedProofPreview, setSelectedProofPreview] = useState<string | null>(null);

  // Load Registrations Data
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const res = await registrationsApi.getAll({ limit: 100, completed: 'false' });
      // Server returns { data: RegistrationItem[], pagination: {...} }.
      if (res && Array.isArray(res.data)) {
        setRegistrations(res.data);
      } else {
        setRegistrations([]);
      }
    } catch (err: unknown) {
      console.error('Error loading registrations:', err);
      setRegistrations([]);
      const msg = err instanceof Error ? err.message : 'Gagal memuat data pendaftaran';
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Toast Helper
  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to parse children
  const parseChildren = (children: any): RegistrationChild[] => {
    if (!children) return [];
    if (Array.isArray(children)) return children;
    if (typeof children === 'string') {
      try {
        const parsed = JSON.parse(children);
        if (Array.isArray(parsed)) return parsed;
        return [{ name: children }];
      } catch {
        return [{ name: children }];
      }
    }
    return [];
  };

  // Helper to format currency IDR
  const formatIDR = (val?: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Helper to format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
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

  // Helper to format phone for WhatsApp
  const formatWhatsAppUrl = (phone: string, message?: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (!clean.startsWith('62')) {
      clean = '62' + clean;
    }
    const encoded = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/${clean}${encoded}`;
  };

  // Quick or Modal Status Update
  const handleUpdateStatus = async (
    targetItem: RegistrationItem,
    newStatus: 'pending' | 'confirmed' | 'rejected',
    newPaymentStatus: 'unpaid' | 'pending' | 'paid' | 'rejected',
    notes?: string
  ) => {
    try {
      setIsUpdatingStatus(true);
      await registrationsApi.updateStatus(targetItem.id, {
        status: newStatus,
        payment_status: newPaymentStatus,
        notes: notes !== undefined ? notes : targetItem.notes,
      });

      // Update in state
      setRegistrations((prev) =>
        prev.map((item) =>
          item.id === targetItem.id
            ? {
                ...item,
                status: newStatus,
                payment_status: newPaymentStatus,
                notes: notes !== undefined ? notes : item.notes,
              }
            : item
        )
      );

      if (detailModalItem && detailModalItem.id === targetItem.id) {
        setDetailModalItem((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                payment_status: newPaymentStatus,
                notes: notes !== undefined ? notes : prev.notes,
              }
            : null
        );
      }

      showToast(
        `Registrasi ${targetItem.registration_number} berhasil diperbarui: Status ${newStatus.toUpperCase()}, Pembayaran ${newPaymentStatus.toUpperCase()}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memperbarui status registrasi';
      showToast(msg, 'error');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Status Badge Component
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'active':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <CheckCircle2 size={13} /> Dikonfirmasi
          </span>
        );
      case 'pending':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock size={13} /> Menunggu
          </span>
        );
      case 'rejected':
      case 'cancelled':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <XCircle size={13} /> Ditolak
          </span>
        );
      default:
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#F1F5F9',
              color: '#64748B',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {status}
          </span>
        );
    }
  };

  // Payment Status Badge Component
  const getPaymentStatusBadge = (paymentStatus?: string) => {
    switch (paymentStatus) {
      case 'paid':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <CheckCircle2 size={13} /> Sudah Dibayar
          </span>
        );
      case 'pending':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#FEF3C7',
              color: '#B45309',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock size={13} /> Verifikasi Bukti
          </span>
        );
      case 'rejected':
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#FEE2E2',
              color: '#B91C1C',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <XCircle size={13} /> Ditolak
          </span>
        );
      case 'unpaid':
      default:
        return (
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#FFF1F2',
              color: '#BE123C',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock size={13} /> Belum Bayar
          </span>
        );
    }
  };

  // Payment Method Label
  const formatPaymentMethod = (method?: string) => {
    switch (method) {
      case 'bank_transfer':
        return 'Transfer Bank';
      case 'qris':
        return 'QRIS';
      case 'ewallet':
        return 'E-Wallet';
      default:
        return method || 'Transfer Bank';
    }
  };

  // Filter Registrations
  const filteredRegistrations = registrations.filter((reg) => {
    const q = searchQuery.toLowerCase();
    const childrenList = parseChildren(reg.children);
    const childrenNames = childrenList.map((c) => c.name || '').join(' ').toLowerCase();

    const matchesSearch =
      (reg.registration_number && reg.registration_number.toLowerCase().includes(q)) ||
      (reg.parent_name && reg.parent_name.toLowerCase().includes(q)) ||
      (reg.parent_phone && reg.parent_phone.toLowerCase().includes(q)) ||
      (reg.parent_email && reg.parent_email.toLowerCase().includes(q)) ||
      (reg.class_name && reg.class_name.toLowerCase().includes(q)) ||
      childrenNames.includes(q);

    const matchesStatus =
      statusFilter === 'all' ||
      reg.status === statusFilter ||
      (statusFilter === 'confirmed' && reg.status === 'active');

    const matchesPaymentStatus =
      paymentStatusFilter === 'all' || reg.payment_status === paymentStatusFilter;

    const matchesPaymentMethod =
      paymentMethodFilter === 'all' || reg.payment_method === paymentMethodFilter;

    return matchesSearch && matchesStatus && matchesPaymentStatus && matchesPaymentMethod;
  });

  // Calculate KPIs
  const totalRegistrations = registrations.length;
  const waitingPaymentCount = registrations.filter(
    (r) => r.payment_status === 'unpaid' || r.payment_status === 'pending' || r.status === 'pending'
  ).length;
  const paidCount = registrations.filter((r) => r.payment_status === 'paid').length;
  const rejectedCount = registrations.filter(
    (r) => r.status === 'rejected' || r.payment_status === 'rejected'
  ).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            backgroundColor:
              toastMessage.type === 'success'
                ? '#10B981'
                : toastMessage.type === 'error'
                ? '#EF4444'
                : '#4A90D9',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out',
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

      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          backgroundColor: '#FFFFFF',
          padding: '1.5rem 1.75rem',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                backgroundColor: '#EFF6FF',
                color: '#4A90D9',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <UserCheck size={14} /> Modul Pendaftaran Baru
            </span>
          </div>
          <h2
            style={{
              fontFamily: "'Baloo 2', cursive",
              fontSize: '1.5rem',
              color: '#1E293B',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Pendaftaran Baru (Dalam Proses)
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Pendaftar yang prosesnya belum selesai — status masih menunggu konfirmasi, pembayaran belum lunas, atau verifikasi bukti pembayaran berjalan. Pendaftar yang sudah dikonfirmasi dan lunas otomatis pindah ke menu Data Peserta.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
              transition: 'all 0.2s',
            }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 4 Stats Cards */}
      <div
        style={{
          display: 'grid',
          gap: '1rem',
        }}
        className="stats-grid"
      >
        {/* Total Pendaftar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
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
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Total Pendaftar</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{totalRegistrations}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>Semua invoice registrasi</div>
          </div>
        </div>

        {/* Menunggu Pembayaran */}
        <div
          style={{
            backgroundColor: waitingPaymentCount > 0 ? '#FFF9F5' : '#FFFFFF',
            padding: '1.25rem',
            borderRadius: '14px',
            border: waitingPaymentCount > 0 ? '1px solid #FFD0B8' : '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
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
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#FF6B35', fontWeight: 700 }}>Menunggu Pembayaran</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FF6B35' }}>{waitingPaymentCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600, marginTop: '2px' }}>
              {waitingPaymentCount > 0 ? 'Perlu tindakan verifikasi' : 'Semua sudah beres'}
            </div>
          </div>
        </div>

        {/* Sudah Dibayar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Sudah Dibayar</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{paidCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
              Lunas & Kelas Terkonfirmasi
            </div>
          </div>
        </div>

        {/* Ditolak */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '1.25rem',
            borderRadius: '14px',
            border: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
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
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Ditolak</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{rejectedCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>Dibatalkan / tidak valid</div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          overflow: 'hidden',
        }}
      >
        {/* Filters Toolbar */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
          className="filter-bar-responsive"
        >
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              borderRadius: '10px',
              padding: '0.55rem 0.9rem',
              width: '100%',
              maxWidth: '360px',
            }}
            className="search-bar-responsive"
          >
            <Search size={17} color="#94A3B8" />
            <input
              type="text"
              placeholder="Cari No. Reg, Orang Tua, WA, Anak, Kelas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.875rem',
                width: '100%',
                color: '#1E293B',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#94A3B8' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.65rem' }} className="filter-controls-responsive">
            {/* Status Pendaftaran Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Status: Semua</option>
              <option value="pending">Status: Pending</option>
              <option value="confirmed">Status: Confirmed</option>
              <option value="rejected">Status: Rejected</option>
            </select>

            {/* Status Bayar Filter */}
            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value as any)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Bayar: Semua</option>
              <option value="unpaid">Bayar: Belum Bayar</option>
              <option value="pending">Bayar: Menunggu Verifikasi</option>
              <option value="paid">Bayar: Lunas</option>
              <option value="rejected">Bayar: Ditolak</option>
            </select>

            {/* Metode Bayar Filter */}
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">Metode: Semua</option>
              <option value="bank_transfer">Transfer Bank</option>
              <option value="qris">QRIS</option>
              <option value="ewallet">E-Wallet</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div style={{ overflowX: 'auto' }} className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NO. REGISTRASI</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>ORANG TUA & WA</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>KELAS & JADWAL</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>JUMLAH ANAK</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>TOTAL BAYAR</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>STATUS BAYAR</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>STATUS</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textAlign: 'right' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className="animate-spin" color="#4A90D9" />
                      <span>Memuat data pendaftaran & pembayaran...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <UserCheck size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Tidak ada pendaftaran yang cocok</div>
                    <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Coba sesuaikan kata kunci pencarian atau filter status</div>
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => {
                  const childrenList = parseChildren(reg.children);
                  const isPendingReview = reg.status === 'pending' || reg.payment_status === 'pending';

                  return (
                    <tr
                      key={reg.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* No. Registrasi & Tanggal */}
                      <td style={{ padding: '1rem 1.1rem' }}>
                        <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.875rem', fontFamily: 'monospace' }}>
                          {reg.registration_number}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
                          {formatDate(reg.created_at)}
                        </div>
                      </td>

                      {/* Orang Tua & WA */}
                      <td style={{ padding: '1rem 1.1rem' }}>
                        <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9rem' }}>
                          {reg.parent_name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                          <a
                            href={formatWhatsAppUrl(
                              reg.parent_phone,
                              `Halo ${reg.parent_name}, kami dari Tim Djuniors mengonfirmasi pendaftaran kursus dengan No. Registrasi ${reg.registration_number}.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.78rem',
                              color: '#16A34A',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                            title="Buka Chat WhatsApp"
                          >
                            <Phone size={12} />
                            <span>{reg.parent_phone}</span>
                          </a>
                        </div>
                        {reg.parent_city && (
                          <div style={{ fontSize: '0.72rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                            <MapPin size={11} color="#94A3B8" />
                            <span>{reg.parent_city}</span>
                          </div>
                        )}
                      </td>

                      {/* Kelas & Jadwal */}
                      <td style={{ padding: '1rem 1.1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <BookOpen size={14} color="#4A90D9" />
                          <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem' }}>
                            {reg.class_name || 'Kelas Matematika'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>
                          Slot: {reg.schedule_slot || '-'}
                        </div>
                      </td>

                      {/* Jumlah Anak */}
                      <td style={{ padding: '1rem 1.1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              fontWeight: 800,
                              fontSize: '0.75rem',
                            }}
                          >
                            {childrenList.length} Anak
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#64748B',
                            marginTop: '3px',
                            maxWidth: '160px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={childrenList.map((c) => c.name).join(', ')}
                        >
                          {childrenList.map((c) => c.name).join(', ') || '-'}
                        </div>
                      </td>

                      {/* Total Bayar */}
                      <td style={{ padding: '1rem 1.1rem' }}>
                        <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.9rem' }}>
                          {formatIDR(reg.final_amount ?? reg.total_amount)}
                        </div>
                        {reg.discount_amount && reg.discount_amount > 0 ? (
                          <div style={{ fontSize: '0.7rem', color: '#16A34A', fontWeight: 600 }}>
                            Hemat {formatIDR(reg.discount_amount)} ({reg.promo_code})
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                            {formatPaymentMethod(reg.payment_method)}
                          </div>
                        )}
                      </td>

                      {/* Status Bayar */}
                      <td style={{ padding: '1rem 1.1rem' }}>
                        {getPaymentStatusBadge(reg.payment_status)}
                      </td>

                      {/* Status Pendaftaran */}
                      <td style={{ padding: '1rem 1.1rem' }}>
                        {getStatusBadge(reg.status)}
                      </td>

                      {/* Aksi */}
                      <td style={{ padding: '1rem 1.1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            className="btn-touch-sm"
                            onClick={() => {
                              setDetailModalItem(reg);
                              setAdminNotesInput(reg.notes || '');
                            }}
                            title="Lihat Detail & Kelola"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#334155',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            <Eye size={14} color="#4A90D9" />
                            <span>Detail</span>
                          </button>

                          {isPendingReview && (
                            <button
                              className="btn-touch-sm"
                              onClick={() => handleUpdateStatus(reg, 'confirmed', 'paid')}
                              title="Konfirmasi Langsung (Lunas)"
                              disabled={isUpdatingStatus}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#10B981',
                                color: '#FFFFFF',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#FAFAFA',
            borderTop: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.825rem',
            color: '#64748B',
          }}
        >
          <span>Menampilkan {filteredRegistrations.length} dari {totalRegistrations} pendaftaran</span>
          <span style={{ fontWeight: 600 }}>Tersinkronisasi dengan Database Cloudflare D1</span>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {detailModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1rem',
          }}
          className="modal-overlay"
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
            className="modal-content modal-responsive"
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.5rem 1.75rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#1E293B',
                      backgroundColor: '#EFF6FF',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {detailModalItem.registration_number}
                  </span>
                  {getStatusBadge(detailModalItem.status)}
                  {getPaymentStatusBadge(detailModalItem.payment_status)}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Terdaftar pada: {formatDate(detailModalItem.created_at)}
                </div>
              </div>

              <button
                onClick={() => setDetailModalItem(null)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Section 1: Info Lengkap Pendaftar & Orang Tua */}
              <div>
                <h4
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    margin: '0 0 0.75rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <User size={18} color="#4A90D9" />
                  <span>Informasi Orang Tua / Wali Murid</span>
                </h4>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    border: '1px solid #E2E8F0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Nama Lengkap Wali</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>
                      {detailModalItem.parent_name}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Nomor WhatsApp</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#16A34A' }}>
                        {detailModalItem.parent_phone}
                      </span>
                      <a
                        href={formatWhatsAppUrl(
                          detailModalItem.parent_phone,
                          `Halo Bapak/Ibu ${detailModalItem.parent_name}, kami dari Tim Djuniors mengonfirmasi registrasi ${detailModalItem.registration_number} untuk kelas ${detailModalItem.class_name || 'Matematika'}.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#DCFCE7',
                          color: '#15803D',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                      >
                        <MessageSquare size={12} />
                        <span>Chat WA</span>
                      </a>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Email</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '2px' }}>
                      {detailModalItem.parent_email || '-'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Kota Domisili</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '2px' }}>
                      {detailModalItem.parent_city || '-'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Kelas Terpilih</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4A90D9', marginTop: '2px' }}>
                      {detailModalItem.class_name || 'Kelas Matematika'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Slot Jadwal</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '2px' }}>
                      {detailModalItem.schedule_slot || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Daftar Anak yang Didaftarkan */}
              <div>
                <h4
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    margin: '0 0 0.75rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Sparkles size={18} color="#FFD93D" />
                  <span>Daftar Peserta Didik (Anak)</span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {parseChildren(detailModalItem.children).map((child, cIdx) => (
                    <div
                      key={cIdx}
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        padding: '1rem 1.25rem',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#EFF6FF',
                            color: '#4A90D9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                          }}
                        >
                          {cIdx + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.95rem' }}>
                            {child.name || `Anak ${cIdx + 1}`}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                            Tingkat / Usia: <span style={{ fontWeight: 700, color: '#4A90D9' }}>{child.age_or_class || child.grade || child.age || 'Umum'}</span>
                            {child.school ? ` • Sekolah: ${child.school}` : ''}
                          </div>
                        </div>
                      </div>

                      {child.notes && (
                        <div style={{ fontSize: '0.75rem', color: '#64748B', fontStyle: 'italic', maxWidth: '240px', textAlign: 'right' }}>
                          "{child.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Info Pembayaran & Bukti Transfer */}
              <div>
                <h4
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    margin: '0 0 0.75rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CreditCard size={18} color="#6BCB77" />
                  <span>Rincian Finansial & Bukti Pembayaran</span>
                </h4>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {/* Financial Breakdown */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '14px',
                      padding: '1.25rem',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748B' }}>
                      <span>Metode Pembayaran:</span>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>
                        {formatPaymentMethod(detailModalItem.payment_method)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748B' }}>
                      <span>Total Biaya Kursus:</span>
                      <span style={{ fontWeight: 700, color: '#1E293B' }}>
                        {formatIDR(detailModalItem.total_amount)}
                      </span>
                    </div>

                    {detailModalItem.discount_amount && detailModalItem.discount_amount > 0 ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#16A34A' }}>
                        <span>Diskon Promo ({detailModalItem.promo_code}):</span>
                        <span style={{ fontWeight: 700 }}>
                          - {formatIDR(detailModalItem.discount_amount)}
                        </span>
                      </div>
                    ) : null}

                    <div
                      style={{
                        borderTop: '1px solid #CBD5E1',
                        paddingTop: '0.65rem',
                        marginTop: '0.25rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1E293B' }}>Total Akhir:</span>
                      <span
                        style={{
                          fontFamily: "'Baloo 2', cursive",
                          fontSize: '1.35rem',
                          fontWeight: 800,
                          color: '#4A90D9',
                        }}
                      >
                        {formatIDR(detailModalItem.final_amount ?? detailModalItem.total_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Bukti Transfer Box */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '14px',
                      padding: '1.25rem',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                      Bukti Pembayaran / Slip Transfer
                    </div>

                    {detailModalItem.payment_proof_url ? (
                      <div style={{ position: 'relative', width: '100%', maxWidth: '240px' }}>
                        <img
                          src={detailModalItem.payment_proof_url}
                          alt="Bukti Transfer"
                          style={{
                            width: '100%',
                            maxHeight: '160px',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            cursor: 'pointer',
                          }}
                          onClick={() => setSelectedProofPreview(detailModalItem.payment_proof_url || null)}
                        />
                        <div style={{ marginTop: '6px' }}>
                          <a
                            href={detailModalItem.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: '0.75rem',
                              color: '#4A90D9',
                              fontWeight: 700,
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>Buka Gambar Penuh</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '1.5rem', color: '#94A3B8', fontSize: '0.825rem' }}>
                        <FileText size={32} color="#CBD5E1" style={{ marginBottom: '6px' }} />
                        <div>Belum ada bukti transfer diunggah</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 4: Catatan Admin & Status Modifiers */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Catatan Admin
                </label>
                <input
                  type="text"
                  placeholder="Misal: Sudah dikonfirmasi via WA / Rekening pengirim an. Budi..."
                  value={adminNotesInput}
                  onChange={(e) => setAdminNotesInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.875rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Modal Footer / Action Buttons */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                backgroundColor: '#F8FAFC',
                borderTop: '1px solid #E2E8F0',
                borderBottomLeftRadius: '20px',
                borderBottomRightRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={formatWhatsAppUrl(
                    detailModalItem.parent_phone,
                    `Halo Bapak/Ibu ${detailModalItem.parent_name}, registrasi pendaftaran kelas ${detailModalItem.class_name || 'Matematika'} dengan No. ${detailModalItem.registration_number} telah kami verifikasi.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.65rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #86EFAC',
                    backgroundColor: '#F0FDF4',
                    color: '#15803D',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <MessageSquare size={16} />
                  <span>Kirim WhatsApp</span>
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {/* Tombol Tolak */}
                <button
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus(detailModalItem, 'rejected', 'rejected', adminNotesInput)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.65rem 1.25rem',
                    borderRadius: '10px',
                    border: '1px solid #FECACA',
                    backgroundColor: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                  }}
                >
                  <XCircle size={16} />
                  <span>Tolak Pembayaran</span>
                </button>

                {/* Tombol Konfirmasi */}
                <button
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdateStatus(detailModalItem, 'confirmed', 'paid', adminNotesInput)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.65rem 1.4rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Konfirmasi Pembayaran</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom modal for proof preview */}
      {selectedProofPreview && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
          onClick={() => setSelectedProofPreview(null)}
        >
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={selectedProofPreview}
              alt="Bukti Transfer Penuh"
              style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: '12px' }}
            />
            <button
              onClick={() => setSelectedProofPreview(null)}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: '#FFFFFF',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Registrations;
