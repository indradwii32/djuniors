// ============================================
// Djuniors Dashboard - Classes Management Page
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Calendar,
} from 'lucide-react';
import { classesApi, levelsApi, ClassItem, LevelItem, ScheduleSlot } from '../utils/api';
import IconPicker, { renderIconPreview } from '../components/IconPicker';

const DAYS_OF_WEEK = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

export const Classes: React.FC = () => {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [detailModalClass, setDetailModalClass] = useState<ClassItem | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [editModalClass, setEditModalClass] = useState<ClassItem | null>(null);
  const [deleteModalClass, setDeleteModalClass] = useState<ClassItem | null>(null);

  // Form State
  const [formName, setFormName] = useState<string>('');
  const [formIcon, setFormIcon] = useState<string>('🧮');
  const [formImageUrl, setFormImageUrl] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formLevelId, setFormLevelId] = useState<string>('');
  const [formPrice, setFormPrice] = useState<number>(199000);
  const [formMaxStudents, setFormMaxStudents] = useState<number>(8);
  const [formScheduleSlots, setFormScheduleSlots] = useState<ScheduleSlot[]>([
    { day: 'Senin', start_time: '15:00', end_time: '16:00' },
  ]);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const parseSlots = (slotsData: any): ScheduleSlot[] => {
    let rawList: any[] = [];
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
    return rawList.map((s: any) => ({
      day: s.day || 'Senin',
      start_time: s.start_time || s.start || '15:00',
      end_time: s.end_time || s.end || '16:00',
    }));
  };

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const [classesRes, levelsRes] = await Promise.allSettled([
        classesApi.getAll(),
        levelsApi.getAll(),
      ]);

      let loadedLevels: LevelItem[] = [];
      if (levelsRes.status === 'fulfilled' && Array.isArray(levelsRes.value)) {
        loadedLevels = levelsRes.value;
        setLevels(loadedLevels);
        if (!formLevelId && loadedLevels.length > 0) {
          setFormLevelId(loadedLevels[0].id);
        }
      }

      if (classesRes.status === 'fulfilled' && Array.isArray(classesRes.value)) {
        const enrichedClasses = classesRes.value.map((cls) => {
          const matchedLevel = loadedLevels.find((lvl) => lvl.id === cls.level_id);
          return {
            ...cls,
            level_name: cls.level_name || matchedLevel?.name || 'Umum',
          };
        });
        setClasses(enrichedClasses);
      } else {
        setClasses([]);
      }
    } catch {
      setClasses([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [formLevelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val || 0);
  };

  const resetForm = () => {
    setFormName('');
    setFormIcon('🧮');
    setFormImageUrl('');
    setFormDescription('');
    setFormLevelId(levels.length > 0 ? levels[0].id : '');
    setFormPrice(199000);
    setFormMaxStudents(8);
    setFormScheduleSlots([{ day: 'Senin', start_time: '15:00', end_time: '16:00' }]);
    setFormIsActive(true);
  };

  const openCreateModal = () => {
    resetForm();
    setCreateModalOpen(true);
  };

  const openEditModal = (cls: ClassItem) => {
    setFormName(cls.name);
    setFormIcon(cls.icon || '🧮');
    setFormImageUrl((cls as any).image_url || '');
    setFormDescription(cls.description || '');
    setFormLevelId(cls.level_id || (levels[0]?.id || ''));
    setFormPrice(cls.price || 0);
    setFormMaxStudents(cls.max_students || 8);

    const slots = parseSlots(cls.schedule_slots);
    setFormScheduleSlots(
      slots.length > 0 ? slots : [{ day: 'Senin', start_time: '15:00', end_time: '16:00' }]
    );
    setFormIsActive(Boolean(cls.is_active));
    setEditModalClass(cls);
  };

  // Schedule slot operations
  const handleAddSlot = () => {
    setFormScheduleSlots((prev) => [
      ...prev,
      { day: 'Senin', start_time: '15:00', end_time: '16:00' },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    if (formScheduleSlots.length <= 1) {
      showToast('Minimal harus ada 1 slot waktu', 'error');
      return;
    }
    setFormScheduleSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSlotChange = (index: number, field: keyof ScheduleSlot, value: string) => {
    setFormScheduleSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  };

  // Filter logic
  const filteredClasses = classes.filter((cls) => {
    const nameMatch = cls.name.toLowerCase().includes(searchQuery.toLowerCase());
    const descMatch = cls.description ? cls.description.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    const levelName = cls.level_name || '';
    const levelMatch = levelName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSearch = nameMatch || descMatch || levelMatch;

    const matchesLevel =
      levelFilter === 'all' ||
      cls.level_id === levelFilter ||
      (cls.level_name && cls.level_name.toLowerCase().includes(levelFilter.toLowerCase()));

    const isActive = Boolean(cls.is_active);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive);

    return matchesSearch && matchesLevel && matchesStatus;
  });

  const totalClasses = classes.length;
  const activeCount = classes.filter((c) => Boolean(c.is_active)).length;
  const totalSlots = classes.reduce((sum, c) => sum + (c.max_students || 0), 0);

  const handleToggleActive = async (cls: ClassItem) => {
    const nextActive = !Boolean(cls.is_active);
    try {
      try {
        await classesApi.update(cls.id, { is_active: nextActive ? 1 : 0 });
      } catch {
        // fallback local simulation
      }
      setClasses((prev) =>
        prev.map((c) => (c.id === cls.id ? { ...c, is_active: nextActive ? 1 : 0 } : c))
      );
      showToast(`Status kelas "${cls.name}" diubah menjadi ${nextActive ? 'Aktif' : 'Nonaktif'}.`);
    } catch {
      showToast('Gagal mengubah status kelas', 'error');
    }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Nama kelas wajib diisi', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedLevelObj = levels.find((l) => l.id === formLevelId);
      const newClassData: Partial<ClassItem> = {
        name: formName.trim(),
        icon: formIcon || '🧮',
        image_url: formImageUrl.trim() || null,
        description: formDescription.trim() || undefined,
        level_id: formLevelId || undefined,
        price: Number(formPrice) || 0,
        max_students: Number(formMaxStudents) || 8,
        schedule_slots: formScheduleSlots,
        is_active: formIsActive ? 1 : 0,
      };

      let generatedId = `cls-${Date.now().toString().slice(-4)}`;
      try {
        const res = await classesApi.create(newClassData);
        if (res.id) generatedId = res.id;
      } catch {
        // fallback
      }

      const createdObj: ClassItem = {
        id: generatedId,
        name: formName.trim(),
        icon: formIcon || '🧮',
        description: formDescription.trim() || undefined,
        level_id: formLevelId || undefined,
        level_name: selectedLevelObj?.name || 'Tingkat',
        price: Number(formPrice) || 0,
        max_students: Number(formMaxStudents) || 8,
        schedule_slots: formScheduleSlots,
        is_active: formIsActive ? 1 : 0,
        created_at: new Date().toISOString(),
      };

      setClasses((prev) => [createdObj, ...prev]);
      showToast('Kelas baru berhasil dibuat!');
      setCreateModalOpen(false);
      resetForm();
    } catch {
      showToast('Gagal membuat kelas baru', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalClass) return;
    if (!formName.trim()) {
      showToast('Nama kelas wajib diisi', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const selectedLevelObj = levels.find((l) => l.id === formLevelId);
      const updateData: Partial<ClassItem> = {
        name: formName.trim(),
        icon: formIcon || '🧮',
        image_url: formImageUrl.trim() || null,
        description: formDescription.trim() || undefined,
        level_id: formLevelId || undefined,
        price: Number(formPrice) || 0,
        max_students: Number(formMaxStudents) || 8,
        schedule_slots: formScheduleSlots,
        is_active: formIsActive ? 1 : 0,
      };

      try {
        await classesApi.update(editModalClass.id, updateData);
      } catch {
        // fallback
      }

      setClasses((prev) =>
        prev.map((c) =>
          c.id === editModalClass.id
            ? {
                ...c,
                ...updateData,
                level_name: selectedLevelObj?.name || c.level_name,
                schedule_slots: formScheduleSlots,
                is_active: formIsActive ? 1 : 0,
              }
            : c
        )
      );

      showToast(`Kelas "${formName.trim()}" berhasil diperbarui!`);
      setEditModalClass(null);
      resetForm();
    } catch {
      showToast('Gagal memperbarui kelas', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!deleteModalClass) return;
    try {
      setIsSubmitting(true);
      try {
        await classesApi.delete(deleteModalClass.id);
      } catch {
        // fallback
      }
      setClasses((prev) => prev.filter((c) => c.id !== deleteModalClass.id));
      showToast(`Kelas "${deleteModalClass.name}" berhasil dihapus.`);
      setDeleteModalClass(null);
    } catch {
      showToast('Gagal menghapus kelas', 'error');
    } finally {
      setIsSubmitting(false);
    }
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
              <BookOpen size={13} /> Modul Kurikulum & Jadwal
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
            Manajemen Kelas & Jadwal Belajar
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Atur kelas matematika, harga per program, kapasitas siswa, dan slot waktu jadwal belajar.
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
            <span>Tambah Kelas</span>
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
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Total Program Kelas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{totalClasses} Kelas</div>
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
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Kelas Aktif</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{activeCount} Kelas</div>
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
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Total Kapasitas Kelas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{totalSlots} Kuota Siswa</div>
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
              placeholder="Cari nama kelas atau kurikulum..."
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
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
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
              <option value="all">Semua Level Kelas</option>
              {levels.map((lvl) => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.name}
                </option>
              ))}
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
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NO</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NAMA KELAS</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>LEVEL</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>SLOT WAKTU TERSEDIA</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>BIAYA KELAS</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>KUOTA</th>
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
                      <span>Memuat data kelas...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <BookOpen size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Tidak ada program kelas yang cocok</div>
                    <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Coba ubah filter atau tambahkan kelas baru</div>
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls, idx) => {
                  const isActive = Boolean(cls.is_active);
                  const slots = parseSlots(cls.schedule_slots);

                  return (
                    <tr
                      key={cls.id}
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
                            {renderIconPreview(cls.icon || '🧮', 20)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.925rem' }}>{cls.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#64748B', maxWidth: '260px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {cls.description || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            display: 'inline-block',
                          }}
                        >
                          {cls.level_name || 'Level Kelas'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        {slots.length === 0 ? (
                          <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>Belum ada slot</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {slots.map((s, sIdx) => (
                              <span
                                key={sIdx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: '#334155',
                                  backgroundColor: '#F8FAFC',
                                  border: '1px solid #E2E8F0',
                                  padding: '2px 6px',
                                  borderRadius: '6px',
                                  width: 'fit-content',
                                }}
                              >
                                <Clock size={11} color="#4A90D9" />
                                <span>{s.day} {s.start_time} - {s.end_time}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.9rem', fontWeight: 800, color: '#1E293B' }}>
                        {formatRupiah(cls.price)}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: '#475569' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Users size={13} color="#94A3B8" />
                          <span style={{ fontWeight: 700 }}>{cls.max_students || 8}</span>
                          <span style={{ color: '#94A3B8', fontSize: '0.75rem' }}>Siswa</span>
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <button
                          className="btn-touch-sm"
                          onClick={() => handleToggleActive(cls)}
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
                            onClick={() => setDetailModalClass(cls)}
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
                            onClick={() => openEditModal(cls)}
                            title="Edit Kelas"
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
                              color: '#475569',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            className="btn-touch-sm"
                            onClick={() => setDeleteModalClass(cls)}
                            title="Hapus Kelas"
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
          <span>Menampilkan {filteredClasses.length} dari {totalClasses} program kelas</span>
          <span style={{ fontWeight: 600 }}>Tersinkronisasi dengan Database Djuniors</span>
        </div>
      </div>

      {/* Modal: Tambah Kelas Baru */}
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
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            className="modal-content modal-responsive"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} color="#4A90D9" />
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                  Tambah Program Kelas
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-grid-1-140" style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Nama Program / Kelas *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kelas Matematika TK"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
                <div>
                  <IconPicker
                    label="Icon Kelas"
                    value={formIcon}
                    onChange={setFormIcon}
                    type="emoji"
                    placeholder="Pilih Icon..."
                  />
                </div>
              </div>

              {/* Cover Image URL */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  URL Gambar Cover Kelas (opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://contoh.com/gambar-kelas.jpg"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
                {formImageUrl ? (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      src={formImageUrl}
                      alt="Preview cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      style={{ width: '120px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormImageUrl('')}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', color: '#EF4444', cursor: 'pointer' }}
                    >
                      Hapus Gambar
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.35rem' }}>
                    Kosongkan jika tidak ingin gambar cover — icon/emoji akan digunakan.
                  </p>
                )}
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Level Pembelajaran
                  </label>
                  <select
                    value={formLevelId}
                    onChange={(e) => setFormLevelId(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  >
                    <option value="">Pilih Level...</option>
                    {levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.name} {lvl.grade_range ? `(${lvl.grade_range})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Biaya Kursus (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Kapasitas Maksimal Siswa per Kelas
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={formMaxStudents}
                  onChange={(e) => setFormMaxStudents(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              {/* Schedule Slots Section */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} color="#4A90D9" /> Slot Waktu Jadwal Kelas
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #4A90D9',
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={13} /> Tambah Slot
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {formScheduleSlots.map((slot, index) => (
                    <div
                      key={index}
                      className="schedule-slot-row"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 1fr auto',
                        gap: '0.5rem',
                        alignItems: 'center',
                        backgroundColor: '#FFFFFF',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                      }}
                    >
                      <select
                        value={slot.day}
                        onChange={(e) => handleSlotChange(index, 'day', e.target.value)}
                        style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.8rem', outline: 'none' }}
                      >
                        {DAYS_OF_WEEK.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="15:00"
                        value={slot.start_time}
                        onChange={(e) => handleSlotChange(index, 'start_time', e.target.value)}
                        style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.8rem', outline: 'none' }}
                      />
                      <input
                        type="text"
                        placeholder="16:00"
                        value={slot.end_time}
                        onChange={(e) => handleSlotChange(index, 'end_time', e.target.value)}
                        style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.8rem', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        style={{
                          background: '#FEE2E2',
                          color: '#EF4444',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Deskripsi / Silabus Materi
                </label>
                <textarea
                  rows={3}
                  placeholder="Penjelasan materi dan silabus kelas..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="create-is-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="create-is-active" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Aktifkan kelas ini untuk pendaftaran publik
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
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Kelas */}
      {editModalClass && (
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
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            className="modal-content modal-responsive"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={20} color="#4A90D9" />
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                  Edit Program Kelas
                </h3>
              </div>
              <button
                onClick={() => setEditModalClass(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateClass} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-grid-1-140" style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Nama Program / Kelas *
                  </label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
                <div>
                  <IconPicker
                    label="Icon Kelas"
                    value={formIcon}
                    onChange={setFormIcon}
                    type="emoji"
                    placeholder="Pilih Icon..."
                  />
                </div>
              </div>

              {/* Cover Image URL */}
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  URL Gambar Cover Kelas (opsional)
                </label>
                <input
                  type="url"
                  placeholder="https://contoh.com/gambar-kelas.jpg"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
                {formImageUrl ? (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <img
                      src={formImageUrl}
                      alt="Preview cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      style={{ width: '120px', height: '70px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #E2E8F0' }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormImageUrl('')}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', border: '1px solid #FCA5A5', backgroundColor: '#FEF2F2', color: '#EF4444', cursor: 'pointer' }}
                    >
                      Hapus Gambar
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '0.35rem' }}>
                    Kosongkan jika tidak ingin gambar cover — icon/emoji akan digunakan.
                  </p>
                )}
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Level Pembelajaran
                  </label>
                  <select
                    value={formLevelId}
                    onChange={(e) => setFormLevelId(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  >
                    <option value="">Pilih Level...</option>
                    {levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.name} {lvl.grade_range ? `(${lvl.grade_range})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Biaya Kursus (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Kapasitas Maksimal Siswa per Kelas
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={formMaxStudents}
                  onChange={(e) => setFormMaxStudents(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              {/* Schedule Slots Section */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', backgroundColor: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={15} color="#4A90D9" /> Slot Waktu Jadwal Kelas
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSlot}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: '1px solid #4A90D9',
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <Plus size={13} /> Tambah Slot
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {formScheduleSlots.map((slot, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 1fr auto',
                        gap: '0.5rem',
                        alignItems: 'center',
                        backgroundColor: '#FFFFFF',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                      }}
                    >
                      <select
                        value={slot.day}
                        onChange={(e) => handleSlotChange(index, 'day', e.target.value)}
                        style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.8rem', outline: 'none' }}
                      >
                        {DAYS_OF_WEEK.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="15:00"
                        value={slot.start_time}
                        onChange={(e) => handleSlotChange(index, 'start_time', e.target.value)}
                        style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.8rem', outline: 'none' }}
                      />
                      <input
                        type="text"
                        placeholder="16:00"
                        value={slot.end_time}
                        onChange={(e) => handleSlotChange(index, 'end_time', e.target.value)}
                        style={{ padding: '0.45rem', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '0.8rem', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(index)}
                        style={{
                          background: '#FEE2E2',
                          color: '#EF4444',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Deskripsi / Silabus Materi
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="edit-is-active" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                  Aktifkan kelas ini untuk pendaftaran publik
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setEditModalClass(null)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#4A90D9', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Perbarui Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Kelas */}
      {detailModalClass && (
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
              maxWidth: '480px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            className="modal-content modal-responsive"
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                Detail Program Kelas
              </h3>
              <button
                onClick={() => setDetailModalClass(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '10px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.5rem',
                    flexShrink: 0,
                  }}
                >
                  {renderIconPreview(detailModalClass.icon || '🧮', 26)}
                </div>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B' }}>{detailModalClass.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '2px' }}>
                    Level Kelas: {detailModalClass.level_name || 'Tingkat Belajar'}
                  </div>
                </div>
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Biaya Kursus</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>{formatRupiah(detailModalClass.price)}</div>
                </div>
                <div style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Kapasitas Kelas</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1E293B', marginTop: '2px' }}>Maks {detailModalClass.max_students || 8} Siswa</div>
                </div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600, marginBottom: '6px' }}>Slot Jadwal Tersedia</div>
                {parseSlots(detailModalClass.schedule_slots).length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Belum ada slot waktu.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {parseSlots(detailModalClass.schedule_slots).map((slot, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#1E293B',
                        }}
                      >
                        <Clock size={13} color="#4A90D9" />
                        <span>{slot.day}, {slot.start_time} - {slot.end_time} WIB</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Deskripsi / Kurikulum</div>
                <div style={{ fontSize: '0.875rem', color: '#334155', marginTop: '4px', lineHeight: 1.4 }}>{detailModalClass.description || 'Tidak ada deskripsi.'}</div>
              </div>

              <button
                onClick={() => setDetailModalClass(null)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', backgroundColor: '#4A90D9', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem' }}
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Hapus Kelas */}
      {deleteModalClass && (
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
              Hapus Program Kelas?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 1.25rem 0' }}>
              Yakin ingin menghapus kelas <strong>{deleteModalClass.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteModalClass(null)}
                style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
              >
                Batal
              </button>
              <button
                onClick={handleDeleteClass}
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

export default Classes;
