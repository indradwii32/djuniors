// ============================================
// Djuniors Dashboard - Participants Page (Unified Students & Parents)
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
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
  Sparkles,
  MessageSquare,
  GraduationCap,
} from 'lucide-react';
import {
  registrationsApi,
  classesApi,
  studentsApi,
  RegistrationChild,
  ClassItem,
} from '../utils/api';

export interface ParticipantRow {
  id: string;
  childName: string;
  childAgeOrGrade: string;
  childNotes?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  parentCity?: string;
  classId?: string;
  className: string;
  scheduleSlot?: string;
  registrationNumber: string;
  registrationId: string;
  registrationDate: string;
  status: 'active' | 'confirmed' | 'pending' | 'rejected' | string;
  paymentStatus: 'unpaid' | 'pending' | 'paid' | 'rejected' | string;
  siblings: Array<{ name: string; age_or_class?: string }>;
}

export const Participants: React.FC = () => {
  // Data States
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [classList, setClassList] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Detail Modal
  const [detailParticipant, setDetailParticipant] = useState<ParticipantRow | null>(null);

  // Helper to parse children safely
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

  // Load data from registrations and classes
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const [regsRes, classesRes, studentsRes] = await Promise.allSettled([
        // getAllFlat returns the bare array (getAll returns {data, pagination}).
        // completed=true → only registrations with status='confirmed' AND
        // payment_status='paid' (i.e. fully processed participants). Anything
        // still in progress stays on the "Pendaftaran Baru" page.
        registrationsApi.getAllFlat({ limit: 200, completed: 'true' }),
        classesApi.getAll(),
        studentsApi.getAll(),
      ]);

      if (classesRes.status === 'fulfilled' && Array.isArray(classesRes.value)) {
        setClassList(classesRes.value);
      }

      const rows: ParticipantRow[] = [];

      // 1. Process from registrations
      if (regsRes.status === 'fulfilled' && Array.isArray(regsRes.value)) {
        regsRes.value.forEach((reg) => {
          const parsedChilds = parseChildren(reg.children);
          const allSiblings = parsedChilds.map((c) => ({
            name: c.name || '',
            age_or_class: c.age_or_class || c.grade || (c.age ? `${c.age} Tahun` : undefined),
          }));

          parsedChilds.forEach((child, cIdx) => {
            const childName = child.name || `Anak ${cIdx + 1} (${reg.parent_name})`;
            const ageOrGrade =
              child.age_or_class ||
              child.grade ||
              (child.age ? `${child.age} Tahun` : 'TK/SD');

            rows.push({
              id: `${reg.id}-child-${cIdx + 1}`,
              childName,
              childAgeOrGrade: ageOrGrade,
              childNotes: child.notes || reg.notes,
              parentName: reg.parent_name || '-',
              parentPhone: reg.parent_phone || '-',
              parentEmail: reg.parent_email || undefined,
              parentCity: reg.parent_city || undefined,
              classId: reg.class_id,
              className: reg.class_name || 'Kelas Matematika',
              scheduleSlot: reg.schedule_slot,
              registrationNumber: reg.registration_number,
              registrationId: reg.id,
              registrationDate: reg.created_at,
              status: reg.status,
              paymentStatus: reg.payment_status,
              siblings: allSiblings.filter((s) => s.name !== childName),
            });
          });
        });
      }

      // 2. Also check if there are any standalone students not in registrations
      if (studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value)) {
        studentsRes.value.forEach((std) => {
          // If not already in rows
          const exists = rows.some((r) => r.childName.toLowerCase() === std.full_name.toLowerCase());
          if (!exists) {
            rows.push({
              id: std.id,
              childName: std.full_name,
              childAgeOrGrade: std.grade || 'Umum',
              childNotes: std.notes,
              parentName: std.school ? `Sekolah: ${std.school}` : 'Wali Murid',
              parentPhone: '-',
              parentEmail: undefined,
              parentCity: undefined,
              className: 'Kelas Matematika',
              registrationNumber: `STD-${std.id.slice(-6).toUpperCase()}`,
              registrationId: std.id,
              registrationDate: std.created_at || new Date().toISOString(),
              status: 'confirmed',
              paymentStatus: 'paid',
              siblings: [],
            });
          }
        });
      }

      setParticipants(rows);
    } catch (err: unknown) {
      console.error('Error loading participants:', err);
      setParticipants([]);
      const msg = err instanceof Error ? err.message : 'Gagal memuat data peserta';
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
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Helper for WhatsApp link
  const formatWhatsAppUrl = (phone: string, message?: string) => {
    if (!phone || phone === '-') return '#';
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.slice(1);
    } else if (!clean.startsWith('62')) {
      clean = '62' + clean;
    }
    const encoded = message ? `?text=${encodeURIComponent(message)}` : '';
    return `https://wa.me/${clean}${encoded}`;
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
            <CheckCircle2 size={13} /> Aktif / Terkonfirmasi
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

  // Filter participants
  const filteredParticipants = participants.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      p.childName.toLowerCase().includes(q) ||
      p.parentName.toLowerCase().includes(q) ||
      p.parentPhone.toLowerCase().includes(q) ||
      (p.parentEmail && p.parentEmail.toLowerCase().includes(q)) ||
      (p.parentCity && p.parentCity.toLowerCase().includes(q)) ||
      p.className.toLowerCase().includes(q) ||
      p.registrationNumber.toLowerCase().includes(q);

    const matchesClass = classFilter === 'all' || p.classId === classFilter || p.className === classFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && (p.status === 'active' || p.status === 'confirmed')) ||
      p.status === statusFilter;

    return matchesSearch && matchesClass && matchesStatus;
  });

  // Calculate Metrics
  const totalParticipants = participants.length;
  const activeParticipants = participants.filter(
    (p) => p.status === 'active' || p.status === 'confirmed'
  ).length;
  const uniqueFamiliesCount = new Set(
    participants.map((p) => p.parentPhone !== '-' ? p.parentPhone : p.registrationNumber)
  ).size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Toast */}
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
              <Users size={14} /> Modul Data Peserta & Orang Tua
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
            Data Peserta & Orang Tua
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Database peserta yang pendaftarannya sudah selesai — terkonfirmasi dan lunas — beserta informasi kontak orang tua/wali dan kelas terdaftar. Pendaftar yang masih dalam proses ada di menu Pendaftaran Baru.
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

      {/* 3 Stats Overview Cards */}
      <div
        style={{
          display: 'grid',
          gap: '1rem',
        }}
        className="stats-grid"
      >
        {/* Total Peserta */}
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
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Total Peserta Didik</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{totalParticipants} Anak</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>Tercatat di sistem</div>
          </div>
        </div>

        {/* Peserta Aktif */}
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
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Peserta Aktif / Terkonfirmasi</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{activeParticipants} Anak</div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
              Mengikuti kelas berjalan
            </div>
          </div>
        </div>

        {/* Total Keluarga */}
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
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Total Keluarga / Wali</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{uniqueFamiliesCount} Keluarga</div>
            <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '2px' }}>Orang tua terdaftar</div>
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
              placeholder="Cari anak, wali, WA, email, kota..."
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
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem' }} className="filter-controls-responsive">
            {/* Filter Kelas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '140px' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#64748B' }}>Kelas:</span>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
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
                  width: '100%',
                }}
              >
                <option value="all">Semua Kelas</option>
                {classList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '140px' }}>
              <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#64748B' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                  width: '100%',
                }}
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif / Confirmed</option>
                <option value="pending">Pending</option>
                <option value="rejected">Ditolak</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div style={{ overflowX: 'auto' }} className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NO</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NAMA ANAK</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>UMUR / KELAS</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NAMA ORANG TUA</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>WHATSAPP</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>EMAIL & KOTA</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>KELAS TERDAFTAR</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>STATUS</th>
                <th style={{ padding: '0.9rem 1.1rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textAlign: 'right' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className="animate-spin" color="#4A90D9" />
                      <span>Memuat data peserta dan orang tua...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <Users size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Tidak ada data peserta yang cocok</div>
                    <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Coba ubah kata kunci pencarian atau filter kelas</div>
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((row, idx) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* NO */}
                    <td style={{ padding: '1rem 1.1rem', fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>
                      {idx + 1}
                    </td>

                    {/* NAMA ANAK */}
                    <td style={{ padding: '1rem 1.1rem' }}>
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
                            flexShrink: 0,
                          }}
                        >
                          {row.childName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.925rem' }}>
                            {row.childName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'monospace' }}>
                            {row.registrationNumber}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* UMUR / KELAS */}
                    <td style={{ padding: '1rem 1.1rem' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.775rem',
                          fontWeight: 700,
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <BookOpen size={12} />
                        {row.childAgeOrGrade}
                      </span>
                    </td>

                    {/* NAMA ORANG TUA */}
                    <td style={{ padding: '1rem 1.1rem' }}>
                      <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9rem' }}>
                        {row.parentName}
                      </div>
                      {row.siblings.length > 0 && (
                        <div style={{ fontSize: '0.7rem', color: '#4A90D9', fontWeight: 600, marginTop: '2px' }}>
                          +{row.siblings.length} saudara terdaftar
                        </div>
                      )}
                    </td>

                    {/* WHATSAPP */}
                    <td style={{ padding: '1rem 1.1rem' }}>
                      {row.parentPhone !== '-' ? (
                        <a
                          href={formatWhatsAppUrl(
                            row.parentPhone,
                            `Halo Bapak/Ibu ${row.parentName}, terkait ananda ${row.childName} pada kelas ${row.className} di Djuniors.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.8rem',
                            color: '#16A34A',
                            fontWeight: 700,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Buka Chat WhatsApp"
                        >
                          <Phone size={13} />
                          <span>{row.parentPhone}</span>
                        </a>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>-</span>
                      )}
                    </td>

                    {/* EMAIL & KOTA */}
                    <td style={{ padding: '1rem 1.1rem' }}>
                      <div style={{ fontSize: '0.825rem', color: '#334155' }}>
                        {row.parentEmail || '-'}
                      </div>
                      {row.parentCity && (
                        <div style={{ fontSize: '0.72rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                          <MapPin size={11} color="#94A3B8" />
                          <span>{row.parentCity}</span>
                        </div>
                      )}
                    </td>

                    {/* KELAS TERDAFTAR */}
                    <td style={{ padding: '1rem 1.1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <GraduationCap size={14} color="#4A90D9" />
                        <span style={{ fontWeight: 700, color: '#334155', fontSize: '0.875rem' }}>
                          {row.className}
                        </span>
                      </div>
                      {row.scheduleSlot && (
                        <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '2px' }}>
                          {row.scheduleSlot}
                        </div>
                      )}
                    </td>

                    {/* STATUS */}
                    <td style={{ padding: '1rem 1.1rem' }}>
                      {getStatusBadge(row.status)}
                    </td>

                    {/* AKSI */}
                    <td style={{ padding: '1rem 1.1rem', textAlign: 'right' }}>
                      <button
                        className="btn-touch-sm"
                        onClick={() => setDetailParticipant(row)}
                        title="Lihat Detail Peserta & Orang Tua"
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
                    </td>
                  </tr>
                ))
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
          <span>Menampilkan {filteredParticipants.length} dari {totalParticipants} peserta didik</span>
          <span style={{ fontWeight: 600 }}>Tersinkronisasi dengan Database Djuniors</span>
        </div>
      </div>

      {/* DETAIL MODAL: GABUNGAN SISWA & ORANG TUA */}
      {detailParticipant && (
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
              maxWidth: '680px',
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: '#4A90D9',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.1rem',
                  }}
                >
                  {detailParticipant.childName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: "'Baloo 2', cursive",
                      fontSize: '1.3rem',
                      fontWeight: 800,
                      color: '#1E293B',
                      margin: 0,
                      lineHeight: 1.1,
                    }}
                  >
                    {detailParticipant.childName}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: 'monospace' }}>
                      {detailParticipant.registrationNumber}
                    </span>
                    {getStatusBadge(detailParticipant.status)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setDetailParticipant(null)}
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
              {/* Section 1: Profil Peserta Didik (Anak) */}
              <div>
                <h4
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    margin: '0 0 0.75rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <GraduationCap size={18} color="#4A90D9" />
                  <span>Profil Peserta Didik</span>
                </h4>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    border: '1px solid #E2E8F0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Nama Lengkap</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>
                      {detailParticipant.childName}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Usia / Jenjang Kelas</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#D97706', marginTop: '2px' }}>
                      {detailParticipant.childAgeOrGrade}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Tanggal Pendaftaran</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '2px' }}>
                      {formatDate(detailParticipant.registrationDate)}
                    </div>
                  </div>

                  {detailParticipant.childNotes && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Catatan Pembelajaran</div>
                      <div style={{ fontSize: '0.875rem', color: '#334155', marginTop: '2px', fontStyle: 'italic' }}>
                        "{detailParticipant.childNotes}"
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Informasi Orang Tua & Kontak */}
              <div>
                <h4
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    margin: '0 0 0.75rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <User size={18} color="#059669" />
                  <span>Informasi Orang Tua / Wali</span>
                </h4>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    border: '1px solid #E2E8F0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Nama Orang Tua</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>
                      {detailParticipant.parentName}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Nomor WhatsApp</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#16A34A' }}>
                        {detailParticipant.parentPhone}
                      </span>
                      {detailParticipant.parentPhone !== '-' && (
                        <a
                          href={formatWhatsAppUrl(
                            detailParticipant.parentPhone,
                            `Halo Bapak/Ibu ${detailParticipant.parentName}, salam hangat dari Tim Djuniors terkait pembelajaran ananda ${detailParticipant.childName}.`
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
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <MessageSquare size={11} />
                          <span>Chat</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Email</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '2px' }}>
                      {detailParticipant.parentEmail || '-'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Kota Domisili</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '2px' }}>
                      {detailParticipant.parentCity || '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Kelas & Program Terdaftar */}
              <div>
                <h4
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    margin: '0 0 0.75rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <BookOpen size={18} color="#FF6B35" />
                  <span>Program Kelas & Jadwal Belajar</span>
                </h4>

                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '14px',
                    padding: '1.25rem',
                    border: '1px solid #E2E8F0',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Nama Kelas</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#4A90D9', marginTop: '2px' }}>
                      {detailParticipant.className}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Slot Jadwal</div>
                    <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '2px' }}>
                      {detailParticipant.scheduleSlot || '-'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Status Pembayaran</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: detailParticipant.paymentStatus === 'paid' ? '#15803D' : '#B45309', marginTop: '2px' }}>
                      {detailParticipant.paymentStatus === 'paid' ? 'Lunas' : detailParticipant.paymentStatus}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Saudara Sekeluarga Terdaftar (Jika Ada) */}
              {detailParticipant.siblings && detailParticipant.siblings.length > 0 && (
                <div>
                  <h4
                    style={{
                      fontFamily: "'Baloo 2', cursive",
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      color: '#1E293B',
                      margin: '0 0 0.75rem 0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Sparkles size={18} color="#FFD93D" />
                    <span>Saudara Terdaftar Bersama ({detailParticipant.siblings.length})</span>
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {detailParticipant.siblings.map((sib, sIdx) => (
                      <div
                        key={sIdx}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: '#F8FAFC',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.9rem' }}>{sib.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>
                          {sib.age_or_class || 'TK/SD'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
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
              }}
            >
              {detailParticipant.parentPhone !== '-' ? (
                <a
                  href={formatWhatsAppUrl(
                    detailParticipant.parentPhone,
                    `Halo Bapak/Ibu ${detailParticipant.parentName}, salam hangat dari Tim Djuniors terkait pembelajaran ananda ${detailParticipant.childName}.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.65rem 1.2rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                  }}
                >
                  <MessageSquare size={16} />
                  <span>Hubungi Orang Tua (WhatsApp)</span>
                </a>
              ) : (
                <div />
              )}

              <button
                onClick={() => setDetailParticipant(null)}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Participants;
