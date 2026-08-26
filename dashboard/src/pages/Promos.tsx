// ============================================
// Djuniors Dashboard - Promos Management Page
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Tag,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Percent,
  DollarSign,
} from 'lucide-react';
import { promosApi, PromoItem } from '../utils/api';

export const Promos: React.FC = () => {
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'percentage' | 'fixed'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [detailModalPromo, setDetailModalPromo] = useState<PromoItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalPromo, setEditModalPromo] = useState<PromoItem | null>(null);
  const [deleteModalPromo, setDeleteModalPromo] = useState<PromoItem | null>(null);

  // Form State
  const [formCode, setFormCode] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formDiscountType, setFormDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [formDiscountValue, setFormDiscountValue] = useState<number | string>(10);
  const [formMinPurchase, setFormMinPurchase] = useState<number | string>(0);
  const [formMaxUses, setFormMaxUses] = useState<number | string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const res = await promosApi.getAll();
      if (Array.isArray(res)) {
        setPromos(res);
      } else {
        setPromos([]);
      }
    } catch (err: any) {
      setPromos([]);
      showToast(err.message || 'Gagal memuat data promo dari server', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormCode('');
    setFormDescription('');
    setFormDiscountType('percentage');
    setFormDiscountValue(10);
    setFormMinPurchase(0);
    setFormMaxUses('');
    setFormIsActive(true);
  };

  const openCreateModal = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const openEditModal = (promo: PromoItem) => {
    setFormCode(promo.code);
    setFormDescription(promo.description || '');
    setFormDiscountType(promo.discount_type);
    setFormDiscountValue(promo.discount_value);
    setFormMinPurchase(promo.min_purchase || 0);
    setFormMaxUses(promo.max_uses !== undefined && promo.max_uses !== null ? promo.max_uses : '');
    setFormIsActive(Boolean(promo.is_active));
    setEditModalPromo(promo);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    showToast(`Kode "${text}" disalin ke clipboard!`);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const filteredPromos = promos.filter((p) => {
    const matchesSearch =
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || p.discount_type === typeFilter;

    const isActive = Boolean(p.is_active);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive);

    return matchesSearch && matchesType && matchesStatus;
  });

  const totalPromos = promos.length;
  const activePromos = promos.filter((p) => Boolean(p.is_active)).length;
  const totalClaims = promos.reduce((sum, p) => sum + (p.used_count || 0), 0);

  const handleToggleActive = async (promo: PromoItem) => {
    const nextActive = !Boolean(promo.is_active);
    try {
      await promosApi.update(promo.id, { is_active: nextActive ? 1 : 0 });
      setPromos((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: nextActive ? 1 : 0 } : p))
      );
      showToast(`Promo ${promo.code} berhasil di${nextActive ? 'aktifkan' : 'nonaktifkan'}.`);
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui status promo', 'error');
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      showToast('Kode promo tidak boleh kosong', 'error');
      return;
    }

    const discountVal = Number(formDiscountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      showToast('Nilai diskon harus lebih besar dari 0', 'error');
      return;
    }

    if (formDiscountType === 'percentage' && (discountVal < 1 || discountVal > 100)) {
      showToast('Persentase diskon harus di antara 1% - 100%', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const newPromoData: Partial<PromoItem> = {
        code: formCode.trim().toUpperCase(),
        description: formDescription.trim() || undefined,
        discount_type: formDiscountType,
        discount_value: discountVal,
        min_purchase: Number(formMinPurchase) || 0,
        max_uses: formMaxUses !== '' ? Number(formMaxUses) : undefined,
        is_active: formIsActive ? 1 : 0,
      };

      await promosApi.create(newPromoData);
      showToast(`Kode promo ${formCode.toUpperCase()} berhasil dibuat!`);
      setCreateModalOpen(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal membuat kode promo', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalPromo) return;

    if (!formCode.trim()) {
      showToast('Kode promo tidak boleh kosong', 'error');
      return;
    }

    const discountVal = Number(formDiscountValue);
    if (isNaN(discountVal) || discountVal <= 0) {
      showToast('Nilai diskon harus lebih besar dari 0', 'error');
      return;
    }

    if (formDiscountType === 'percentage' && (discountVal < 1 || discountVal > 100)) {
      showToast('Persentase diskon harus di antara 1% - 100%', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const updateData: Partial<PromoItem> = {
        code: formCode.trim().toUpperCase(),
        description: formDescription.trim() || undefined,
        discount_type: formDiscountType,
        discount_value: discountVal,
        min_purchase: Number(formMinPurchase) || 0,
        max_uses: formMaxUses !== '' ? Number(formMaxUses) : undefined,
        is_active: formIsActive ? 1 : 0,
      };

      await promosApi.update(editModalPromo.id, updateData);
      showToast(`Promo ${formCode.toUpperCase()} berhasil diperbarui!`);
      setEditModalPromo(null);
      resetForm();
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Gagal memperbarui kode promo', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePromo = async () => {
    if (!deleteModalPromo) return;
    try {
      setIsSubmitting(true);
      await promosApi.delete(deleteModalPromo.id);
      setPromos((prev) => prev.filter((p) => p.id !== deleteModalPromo.id));
      showToast(`Promo ${deleteModalPromo.code} berhasil dihapus.`);
      setDeleteModalPromo(null);
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus kode promo', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 100,
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: toastMessage.type === 'success' ? '#10B981' : '#EF4444',
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
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
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
              <Tag size={13} /> Modul Promosi
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
            Manajemen Kode Promo & Diskon
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Buat kupon potongan nominal atau persentase untuk promosi pendaftaran kursus matematika.
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
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={openCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#4A90D9',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(74, 144, 217, 0.35)',
            }}
          >
            <Plus size={18} />
            <span>Buat Promo Baru</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gap: '1rem',
        }}
        className="stats-grid"
      >
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
            <Tag size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Total Kode Promo</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{totalPromos} Voucher</div>
          </div>
        </div>

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
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Promo Aktif Digunakan</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{activePromos} Kupon</div>
          </div>
        </div>

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
              backgroundColor: '#FEF3C7',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Total Klaim Promo</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{totalClaims} Kali Digunakan</div>
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
        {/* Filters */}
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
              maxWidth: '340px',
            }}
            className="search-bar-responsive"
          >
            <Search size={17} color="#94A3B8" />
            <input
              type="text"
              placeholder="Cari kode promo atau deskripsi..."
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }} className="filter-controls-responsive">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
              }}
            >
              <option value="all">Semua Tipe Diskon</option>
              <option value="percentage">Persentase (%)</option>
              <option value="fixed">Potongan Nominal (Rp)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#334155',
                outline: 'none',
              }}
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif Saja</option>
              <option value="inactive">Nonaktif Saja</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }} className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NO</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>KODE VOUCHER</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>DESKRIPSI PROMO</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NILAI POTONGAN</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>MIN. BELANJA</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>PENGGUNAAN</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>STATUS</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textAlign: 'right' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className="animate-spin" color="#4A90D9" />
                      <span>Memuat daftar voucher promo...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredPromos.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <Tag size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Tidak ada promo yang cocok</div>
                    <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Coba ubah filter atau buat kode promo baru</div>
                  </td>
                </tr>
              ) : (
                filteredPromos.map((prm, idx) => {
                  const isActive = Boolean(prm.is_active);
                  return (
                    <tr
                      key={prm.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: '#64748B', fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#EFF6FF',
                              color: '#1D4ED8',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {prm.code}
                          </span>
                          <button
                            className="btn-touch-sm"
                            onClick={() => copyToClipboard(prm.code)}
                            title="Salin Kode"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: copiedCode === prm.code ? '#10B981' : '#94A3B8',
                              cursor: 'pointer',
                              padding: '6px',
                              minWidth: '34px',
                              minHeight: '34px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {copiedCode === prm.code ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#475569', maxWidth: '260px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {prm.description || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            backgroundColor: prm.discount_type === 'percentage' ? '#FEF3C7' : '#DCFCE7',
                            color: prm.discount_type === 'percentage' ? '#B45309' : '#15803D',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {prm.discount_type === 'percentage' ? (
                            <>
                              <Percent size={12} />
                              {prm.discount_value}%
                            </>
                          ) : (
                            <>
                              <DollarSign size={12} />
                              {formatRupiah(prm.discount_value)}
                            </>
                          )}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#64748B' }}>
                        {prm.min_purchase ? formatRupiah(prm.min_purchase) : 'Tanpa Min.'}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, color: '#1E293B' }}>{prm.used_count || 0}</span>
                          <span style={{ color: '#94A3B8' }}>/ {prm.max_uses ? `${prm.max_uses} kuota` : '∞'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <button
                          className="btn-touch-sm"
                          onClick={() => handleToggleActive(prm)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isActive ? '#DCFCE7' : '#F1F5F9',
                            color: isActive ? '#15803D' : '#64748B',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: isActive ? '#22C55E' : '#94A3B8',
                            }}
                          />
                          <span>{isActive ? 'Aktif' : 'Nonaktif'}</span>
                        </button>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          <button
                            className="btn-touch-sm"
                            onClick={() => setDetailModalPromo(prm)}
                            title="Lihat Detail"
                            style={{
                              padding: '6px 8px',
                              minWidth: '36px',
                              minHeight: '36px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#FFFFFF',
                              color: '#4A90D9',
                              cursor: 'pointer',
                            }}
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            className="btn-touch-sm"
                            onClick={() => openEditModal(prm)}
                            title="Edit Promo"
                            style={{
                              padding: '6px 8px',
                              minWidth: '36px',
                              minHeight: '36px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              backgroundColor: '#FFFFFF',
                              color: '#6366F1',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn-touch-sm"
                            onClick={() => setDeleteModalPromo(prm)}
                            title="Hapus Promo"
                            style={{
                              padding: '6px 8px',
                              minWidth: '36px',
                              minHeight: '36px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '8px',
                              border: '1px solid #FEE2E2',
                              backgroundColor: '#FEF2F2',
                              color: '#EF4444',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
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
          <span>Menampilkan {filteredPromos.length} dari {totalPromos} voucher promo</span>
          <span style={{ fontWeight: 600 }}>Tersinkronisasi dengan Database Djuniors</span>
        </div>
      </div>

      {/* Modal: Buat Promo Baru */}
      {createModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="modal-content modal-responsive"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Tag size={20} color="#4A90D9" />
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                  Buat Kode Promo Baru
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePromo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Kode Voucher Promo (Huruf Kapital) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: HEMATMATH"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Tipe Diskon *
                  </label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value as any)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Nilai Diskon *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(e.target.value)}
                    placeholder={formDiscountType === 'percentage' ? '15%' : '50000'}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Minimal Pembelian (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formMinPurchase}
                    onChange={(e) => setFormMinPurchase(e.target.value)}
                    placeholder="0 (Tanpa minimum)"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Maksimal Penggunaan
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                    placeholder="Kosong = Unlimited"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Deskripsi Promo
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Diskon pendaftaran kelas awal semester..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="createIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#4A90D9' }}
                />
                <label htmlFor="createIsActive" style={{ fontSize: '0.875rem', color: '#1E293B', fontWeight: 600, cursor: 'pointer' }}>
                  Status Voucher Aktif
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#64748B', fontWeight: 700, cursor: 'pointer' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#4A90D9', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Promo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Promo */}
      {editModalPromo && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="modal-content modal-responsive"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={20} color="#6366F1" />
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                  Edit Kode Promo
                </h3>
              </div>
              <button
                onClick={() => setEditModalPromo(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdatePromo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Kode Voucher Promo *
                </label>
                <input
                  type="text"
                  required
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Tipe Diskon *
                  </label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value as any)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Nilai Diskon *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Minimal Pembelian (Rp)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formMinPurchase}
                    onChange={(e) => setFormMinPurchase(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Maksimum Kuota Klaim
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                    placeholder="Kosongkan jika tak terbatas"
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Deskripsi Promo
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#6366F1', cursor: 'pointer' }}
                />
                <label htmlFor="edit-is-active" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Status Promo Aktif
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditModalPromo(null)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#6366F1', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Promo */}
      {detailModalPromo && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="modal-content modal-responsive"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                Detail Kode Promo
              </h3>
              <button
                onClick={() => setDetailModalPromo(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#EFF6FF', borderRadius: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1D4ED8', fontFamily: 'monospace', letterSpacing: '1px' }}>
                  {detailModalPromo.code}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                  Diskon {detailModalPromo.discount_type === 'percentage' ? `${detailModalPromo.discount_value}%` : formatRupiah(detailModalPromo.discount_value)}
                </div>
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Min. Pembelian</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>
                    {detailModalPromo.min_purchase ? formatRupiah(detailModalPromo.min_purchase) : 'Tanpa Minimum'}
                  </div>
                </div>
                <div style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Kuota Digunakan</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>
                    {detailModalPromo.used_count || 0} / {detailModalPromo.max_uses || '∞'} klaim
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Deskripsi / Syarat Ketentuan</div>
                <div style={{ fontSize: '0.875rem', color: '#334155', marginTop: '4px', lineHeight: 1.4 }}>
                  {detailModalPromo.description || 'Tidak ada deskripsi khusus.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  onClick={() => {
                    const promoToEdit = detailModalPromo;
                    setDetailModalPromo(null);
                    openEditModal(promoToEdit);
                  }}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#334155', fontWeight: 700, cursor: 'pointer' }}
                >
                  Edit Promo
                </button>
                <button
                  onClick={() => setDetailModalPromo(null)}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', backgroundColor: '#4A90D9', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Hapus Promo */}
      {deleteModalPromo && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="modal-content modal-responsive"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '400px',
              width: '100%',
              padding: '1.5rem',
              textAlign: 'center',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#1E293B' }}>
              Hapus Kode Promo?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 1.25rem 0' }}>
              Yakin ingin menghapus kupon <strong>{deleteModalPromo.code}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteModalPromo(null)}
                style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
              >
                Batal
              </button>
              <button
                onClick={handleDeletePromo}
                disabled={isSubmitting}
                style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#EF4444', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
              >
                {isSubmitting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Promos;
