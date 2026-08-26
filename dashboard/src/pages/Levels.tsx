// ============================================
// Djuniors Dashboard - Levels Management Page
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ArrowUpDown,
} from 'lucide-react';
import { levelsApi, LevelItem } from '../utils/api';
import IconPicker, { renderIconPreview } from '../components/IconPicker';

export const Levels: React.FC = () => {
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalLevel, setEditModalLevel] = useState<LevelItem | null>(null);
  const [deleteModalLevel, setDeleteModalLevel] = useState<LevelItem | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formIcon, setFormIcon] = useState<string>('👶');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formMinAge, setFormMinAge] = useState<number | string>('');
  const [formMaxAge, setFormMaxAge] = useState<number | string>('');
  const [formGradeRange, setFormGradeRange] = useState<string>('');
  const [formSortOrder, setFormSortOrder] = useState<number>(0);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const res = await levelsApi.getAll();
      if (Array.isArray(res)) {
        setLevels(res);
      } else {
        setLevels([]);
      }
    } catch (err: any) {
      console.error('Error loading levels:', err);
      setLevels([]);
      showToast(err?.message || 'Gagal memuat data level kelas', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const resetForm = () => {
    setFormName('');
    setFormIcon('👶');
    setFormDescription('');
    setFormMinAge('');
    setFormMaxAge('');
    setFormGradeRange('');
    setFormSortOrder(0);
    setFormIsActive(true);
  };

  const openCreateModal = () => {
    resetForm();
    setFormSortOrder((levels.length + 1) * 10);
    setCreateModalOpen(true);
  };

  const openEditModal = (level: LevelItem) => {
    setFormName(level.name);
    setFormIcon(level.icon || '👶');
    setFormDescription(level.description || '');
    setFormMinAge(level.min_age !== undefined && level.min_age !== null ? level.min_age : '');
    setFormMaxAge(level.max_age !== undefined && level.max_age !== null ? level.max_age : '');
    setFormGradeRange(level.grade_range || '');
    setFormSortOrder(level.sort_order ?? 0);
    setFormIsActive(Boolean(level.is_active));
    setEditModalLevel(level);
  };

  const filteredLevels = levels.filter((lvl) => {
    const matchesSearch =
      lvl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lvl.description && lvl.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lvl.grade_range && lvl.grade_range.toLowerCase().includes(searchQuery.toLowerCase()));

    const isActive = Boolean(lvl.is_active);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive);

    return matchesSearch && matchesStatus;
  });

  const totalLevels = levels.length;
  const activeLevels = levels.filter((l) => Boolean(l.is_active)).length;
  const allMinAges = levels
    .map((l) => Number(l.min_age))
    .filter((a) => !isNaN(a) && a > 0);
  const allMaxAges = levels
    .map((l) => Number(l.max_age))
    .filter((a) => !isNaN(a) && a > 0);
  const minAgeOverall = allMinAges.length > 0 ? Math.min(...allMinAges) : null;
  const maxAgeOverall = allMaxAges.length > 0 ? Math.max(...allMaxAges) : null;
  const overallAgeRange =
    minAgeOverall !== null && maxAgeOverall !== null
      ? `${minAgeOverall} - ${maxAgeOverall} Tahun`
      : minAgeOverall !== null
      ? `Min. ${minAgeOverall} Tahun`
      : maxAgeOverall !== null
      ? `Maks. ${maxAgeOverall} Tahun`
      : '-';

  const handleToggleActive = async (lvl: LevelItem) => {
    const nextActive = !Boolean(lvl.is_active);
    try {
      await levelsApi.update(lvl.id, { is_active: nextActive ? 1 : 0 });
      setLevels((prev) =>
        prev.map((l) => (l.id === lvl.id ? { ...l, is_active: nextActive ? 1 : 0 } : l))
      );
      showToast(`Status level "${lvl.name}" diubah menjadi ${nextActive ? 'Aktif' : 'Nonaktif'}.`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal memperbarui status level', 'error');
    }
  };

  const handleCreateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Nama level wajib diisi', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const newLevelData: Partial<LevelItem> = {
        name: formName.trim(),
        icon: formIcon || '👶',
        description: formDescription.trim() || undefined,
        min_age: formMinAge !== '' ? Number(formMinAge) : undefined,
        max_age: formMaxAge !== '' ? Number(formMaxAge) : undefined,
        grade_range: formGradeRange.trim() || undefined,
        sort_order: Number(formSortOrder) || 0,
        is_active: formIsActive ? 1 : 0,
      };

      await levelsApi.create(newLevelData);
      showToast(`Level "${formName.trim()}" berhasil ditambahkan!`);
      setCreateModalOpen(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menambahkan level baru', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalLevel) return;
    if (!formName.trim()) {
      showToast('Nama level wajib diisi', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const updateData: Partial<LevelItem> = {
        name: formName.trim(),
        icon: formIcon || '👶',
        description: formDescription.trim() || undefined,
        min_age: formMinAge !== '' ? Number(formMinAge) : undefined,
        max_age: formMaxAge !== '' ? Number(formMaxAge) : undefined,
        grade_range: formGradeRange.trim() || undefined,
        sort_order: Number(formSortOrder) || 0,
        is_active: formIsActive ? 1 : 0,
      };

      await levelsApi.update(editModalLevel.id, updateData);
      showToast(`Level "${formName.trim()}" berhasil diperbarui!`);
      setEditModalLevel(null);
      resetForm();
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Gagal memperbarui level', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLevel = async () => {
    if (!deleteModalLevel) return;
    try {
      setIsSubmitting(true);
      await levelsApi.delete(deleteModalLevel.id);
      setLevels((prev) => prev.filter((l) => l.id !== deleteModalLevel.id));
      showToast(`Level "${deleteModalLevel.name}" berhasil dihapus.`);
      setDeleteModalLevel(null);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menghapus level', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAgeRange = (min?: number, max?: number) => {
    if (min && max) return `${min} - ${max} Tahun`;
    if (min) return `Min. ${min} Tahun`;
    if (max) return `Maks. ${max} Tahun`;
    return '-';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Toast Notification */}
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
              <Layers size={13} /> Modul Level Kelas
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
            Manajemen Level Kelas
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Kelola level kelas pembelajaran matematika, batasan usia anak, dan rentang kelas target.
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
            <span>Tambah Level</span>
          </button>
        </div>
      </div>

      {/* Stats Cards: Total Level, Level Aktif */}
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
            <Layers size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Total Level Kelas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{totalLevels} Level</div>
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
              width: '48px',
              height: '48px',
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
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Level Aktif</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{activeLevels} Level</div>
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
              width: '48px',
              height: '48px',
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
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Cakupan Usia</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{overallAgeRange}</div>
          </div>
        </div>
      </div>

      {/* Main Table */}
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
              placeholder="Cari level, deskripsi, atau level kelas..."
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
                cursor: 'pointer',
              }}
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif Saja</option>
              <option value="inactive">Nonaktif Saja</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div style={{ overflowX: 'auto' }} className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569', width: '60px' }}>URUT</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NAME</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>DESCRIPTION</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>AGE RANGE</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>GRADE RANGE</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>STATUS</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className="animate-spin" color="#4A90D9" />
                      <span>Memuat level kelas...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredLevels.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <Layers size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Tidak ada level yang cocok</div>
                    <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Coba ubah kata kunci pencarian atau tambah level baru</div>
                  </td>
                </tr>
              ) : (
                filteredLevels.map((lvl) => {
                  const isActive = Boolean(lvl.is_active);
                  return (
                    <tr
                      key={lvl.id}
                      style={{
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: '#64748B', fontWeight: 700 }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            backgroundColor: '#F1F5F9',
                            color: '#475569',
                            fontSize: '0.8rem',
                          }}
                        >
                          {lvl.sort_order ?? 0}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #BFDBFE',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontSize: '1.15rem',
                            }}
                          >
                            {renderIconPreview(lvl.icon || '👶', 20)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.925rem' }}>{lvl.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>ID: {lvl.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#475569', maxWidth: '300px' }}>
                        <div style={{ lineHeight: 1.4 }}>{lvl.description || '-'}</div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#334155' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.775rem',
                            fontWeight: 700,
                            backgroundColor: '#F0F9FF',
                            color: '#0369A1',
                            display: 'inline-block',
                          }}
                        >
                          {formatAgeRange(lvl.min_age, lvl.max_age)}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.775rem',
                            fontWeight: 700,
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            display: 'inline-block',
                          }}
                        >
                          {lvl.grade_range || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <button
                          className="btn-touch-sm"
                          onClick={() => handleToggleActive(lvl)}
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
                            onClick={() => openEditModal(lvl)}
                            title="Edit Level"
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
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn-touch-sm"
                            onClick={() => setDeleteModalLevel(lvl)}
                            title="Hapus Level"
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
          <span>Menampilkan {filteredLevels.length} dari {totalLevels} level</span>
          <span style={{ fontWeight: 600 }}>Tersinkronisasi dengan Database Djuniors</span>
        </div>
      </div>

      {/* Modal: Tambah Level */}
      {createModalOpen && (
        <div
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
          className="modal-overlay"
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            className="modal-content modal-responsive"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={20} color="#4A90D9" />
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                  Tambah Level Kelas
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateLevel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-grid-1-140" style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Nama Level *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: TK A (Foundation Math)"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
                <div>
                  <IconPicker
                    label="Icon Level"
                    value={formIcon}
                    onChange={setFormIcon}
                    type="emoji"
                    placeholder="Pilih Icon..."
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Deskripsi
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi target kompetensi materi level ini..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Min Usia (Tahun)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    placeholder="Contoh: 4"
                    value={formMinAge}
                    onChange={(e) => setFormMinAge(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Max Usia (Tahun)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    placeholder="Contoh: 5"
                    value={formMaxAge}
                    onChange={(e) => setFormMaxAge(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="form-grid-2-1" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Grade Range (Contoh: 'TK A, TK B' atau 'SD-1, SD-2')
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: TK A atau SD-1, SD-2"
                    value={formGradeRange}
                    onChange={(e) => setFormGradeRange(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ArrowUpDown size={13} /> Sort Order
                    </span>
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Is Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>Status Level Aktif</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Aktifkan agar level ini dapat dipilih pada jadwal dan kelas</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: formIsActive ? '#4A90D9' : '#CBD5E1',
                      transition: '.3s',
                      borderRadius: '24px',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: "''",
                        height: '18px',
                        width: '18px',
                        left: formIsActive ? '23px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        transition: '.3s',
                        borderRadius: '50%',
                      }}
                    />
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#4A90D9', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Level'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Level */}
      {editModalLevel && (
        <div
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
          className="modal-overlay"
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            className="modal-content modal-responsive"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={20} color="#4A90D9" />
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                  Edit Level Kelas
                </h3>
              </div>
              <button
                onClick={() => setEditModalLevel(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateLevel} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-grid-1-140" style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Nama Level *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: TK A (Foundation Math)"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
                <div>
                  <IconPicker
                    label="Icon Level"
                    value={formIcon}
                    onChange={setFormIcon}
                    type="emoji"
                    placeholder="Pilih Icon..."
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Deskripsi
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi target kompetensi materi level ini..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Min Usia (Tahun)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    placeholder="Contoh: 4"
                    value={formMinAge}
                    onChange={(e) => setFormMinAge(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Max Usia (Tahun)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    placeholder="Contoh: 5"
                    value={formMaxAge}
                    onChange={(e) => setFormMaxAge(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="form-grid-2-1" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Grade Range (Contoh: 'TK A, TK B' atau 'SD-1, SD-2')
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: TK A atau SD-1, SD-2"
                    value={formGradeRange}
                    onChange={(e) => setFormGradeRange(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <ArrowUpDown size={13} /> Sort Order
                    </span>
                  </label>
                  <input
                    type="number"
                    value={formSortOrder}
                    onChange={(e) => setFormSortOrder(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Is Active toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>Status Level Aktif</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Aktifkan agar level ini dapat dipilih pada jadwal dan kelas</div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: formIsActive ? '#4A90D9' : '#CBD5E1',
                      transition: '.3s',
                      borderRadius: '24px',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        content: "''",
                        height: '18px',
                        width: '18px',
                        left: formIsActive ? '23px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        transition: '.3s',
                        borderRadius: '50%',
                      }}
                    />
                  </span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditModalLevel(null)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#4A90D9', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Perbarui Level'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Level */}
      {deleteModalLevel && (
        <div
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
          className="modal-overlay"
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '400px',
              width: '100%',
              padding: '1.5rem',
              textAlign: 'center',
            }}
            className="modal-content modal-responsive"
          >
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#1E293B' }}>
              Hapus Level Kelas?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 1.25rem 0' }}>
              Apakah Anda yakin ingin menghapus level <strong>"{deleteModalLevel.name}"</strong>? Pastikan tidak ada jadwal atau kelas yang terikat pada level ini.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteModalLevel(null)}
                style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
              >
                Batal
              </button>
              <button
                onClick={handleDeleteLevel}
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

export default Levels;
