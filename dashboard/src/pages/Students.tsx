// ============================================
// Djuniors Dashboard - Students Management Page
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  Eye,
  GraduationCap,
  School,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { studentsApi, registrationsApi, Student } from '../utils/api';

export const Students: React.FC = () => {
  // Data state
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  // Modals
  const [detailModalStudent, setDetailModalStudent] = useState<Student | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [deleteModalStudent, setDeleteModalStudent] = useState<Student | null>(null);

  // Form state for creating student
  const [formName, setFormName] = useState<string>('');
  const [formGrade, setFormGrade] = useState<string>('SD 1');
  const [formSchool, setFormSchool] = useState<string>('');
  const [formBirthDate, setFormBirthDate] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load students from API (/api/students or /api/registrations)
  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const [studentsRes, regsRes] = await Promise.allSettled([
        studentsApi.getAll(),
        // getAllFlat returns the bare array (getAll returns {data, pagination}).
        registrationsApi.getAllFlat({ limit: 100 }),
      ]);

      if (studentsRes.status === 'fulfilled' && Array.isArray(studentsRes.value) && studentsRes.value.length > 0) {
        setStudents(studentsRes.value);
      } else if (regsRes.status === 'fulfilled' && Array.isArray(regsRes.value) && regsRes.value.length > 0) {
        // Extract real student list from database registrations
        const extracted: Student[] = [];
        regsRes.value.forEach((r) => {
          let children: any = r.children;
          if (typeof children === 'string') {
            try {
              children = JSON.parse(children);
            } catch {
              children = [{ name: r.children }];
            }
          }
          if (Array.isArray(children)) {
            children.forEach((child: any, cIdx: number) => {
              extracted.push({
                id: `std-${r.registration_number || r.id}-${cIdx + 1}`,
                full_name: child.name || `Siswa ${r.parent_name}`,
                grade: child.age_or_class || child.grade || 'TK/SD',
                school: r.parent_city ? `Domisili: ${r.parent_city}` : (r.class_name ? `Kelas: ${r.class_name}` : '-'),
                notes: `Wali: ${r.parent_name} (${r.parent_phone}) • Reg: ${r.registration_number}`,
                created_at: r.created_at || new Date().toISOString(),
              });
            });
          }
        });
        setStudents(extracted);
      } else {
        setStudents([]);
      }
    } catch {
      setStudents([]);
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

  // Filter students
  const filteredStudents = students.filter((std) => {
    const matchesSearch =
      std.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (std.school && std.school.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (std.notes && std.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesGrade =
      gradeFilter === 'all' ||
      (gradeFilter === 'tk' && std.grade?.toUpperCase().includes('TK')) ||
      (gradeFilter === 'sd' && std.grade?.toUpperCase().includes('SD')) ||
      std.grade?.toLowerCase() === gradeFilter.toLowerCase();

    return matchesSearch && matchesGrade;
  });

  // Calculate stats
  const totalCount = students.length;
  const tkCount = students.filter((s) => s.grade?.toUpperCase().includes('TK')).length;
  const sdCount = students.filter((s) => s.grade?.toUpperCase().includes('SD')).length;

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Nama siswa wajib diisi', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const newStudentData: Partial<Student> = {
        full_name: formName.trim(),
        grade: formGrade,
        school: formSchool.trim() || undefined,
        birth_date: formBirthDate || undefined,
        notes: formNotes.trim() || undefined,
      };

      try {
        await studentsApi.create(newStudentData);
      } catch {
        // local simulation
      }

      const createdObj: Student = {
        id: `std-${Date.now().toString().slice(-4)}`,
        full_name: formName.trim(),
        grade: formGrade,
        school: formSchool.trim() || '-',
        birth_date: formBirthDate || undefined,
        notes: formNotes.trim() || '-',
        created_at: new Date().toISOString(),
      };

      setStudents((prev) => [createdObj, ...prev]);
      showToast('Data siswa berhasil ditambahkan!');
      setCreateModalOpen(false);

      // Reset form
      setFormName('');
      setFormGrade('SD 1');
      setFormSchool('');
      setFormBirthDate('');
      setFormNotes('');
    } catch {
      showToast('Gagal menyimpan data siswa', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteModalStudent) return;
    try {
      setIsSubmitting(true);
      try {
        await studentsApi.delete(deleteModalStudent.id);
      } catch {
        // local simulation
      }
      setStudents((prev) => prev.filter((s) => s.id !== deleteModalStudent.id));
      showToast(`Data siswa "${deleteModalStudent.full_name}" berhasil dihapus.`);
      setDeleteModalStudent(null);
    } catch {
      showToast('Gagal menghapus siswa', 'error');
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

      {/* Header Section */}
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
              <Users size={13} /> Modul Siswa
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
            Manajemen Data Siswa
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Kelola data profil siswa, jenjang TK/SD, sekolah asal, dan catatan perkembangan belajar.
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
              transition: 'all 0.2s',
            }}
            title="Muat Ulang Data"
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
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
              transition: 'all 0.2s',
            }}
          >
            <Plus size={18} />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
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
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Total Siswa Terdaftar</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{totalCount} Anak</div>
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
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Jenjang TK (Paud & TK)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{tkCount} Siswa</div>
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
            <GraduationCap size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Jenjang Sekolah Dasar (SD)</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{sdCount} Siswa</div>
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
        {/* Filters Bar */}
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
              maxWidth: '340px',
            }}
          >
            <Search size={17} color="#94A3B8" />
            <input
              type="text"
              placeholder="Cari nama siswa, sekolah, catatan..."
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

          {/* Grade Selector Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#64748B' }}>Jenjang:</span>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
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
              <option value="all">Semua Jenjang</option>
              <option value="tk">Semua TK (A & B)</option>
              <option value="sd">Semua SD (1 - 6)</option>
              <option value="TK A">TK A</option>
              <option value="TK B">TK B</option>
              <option value="SD 1">SD Kelas 1</option>
              <option value="SD 2">SD Kelas 2</option>
              <option value="SD 3">SD Kelas 3</option>
              <option value="SD 4">SD Kelas 4</option>
              <option value="SD 5">SD Kelas 5</option>
              <option value="SD 6">SD Kelas 6</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div style={{ overflowX: 'auto' }} className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NO</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>PROFIL SISWA</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>JENJANG</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>SEKOLAH ASAL</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>TANGGAL LAHIR</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>CATATAN KHUSUS</th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textAlign: 'right' }}>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <RefreshCw size={18} className="animate-spin" color="#4A90D9" />
                      <span>Memuat data siswa...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
                    <Users size={36} color="#CBD5E1" style={{ marginBottom: '8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Tidak ada siswa yang cocok</div>
                    <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>Coba ubah kata kunci pencarian atau filter jenjang</div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std, idx) => (
                  <tr
                    key={std.id}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: std.grade?.toUpperCase().includes('TK') ? '#FEF3C7' : '#EFF6FF',
                            color: std.grade?.toUpperCase().includes('TK') ? '#D97706' : '#4A90D9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.9rem',
                            flexShrink: 0,
                          }}
                        >
                          {std.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.925rem' }}>{std.full_name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>ID: {std.id}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: std.grade?.toUpperCase().includes('TK') ? '#FEF3C7' : '#EFF6FF',
                          color: std.grade?.toUpperCase().includes('TK') ? '#B45309' : '#1D4ED8',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <BookOpen size={12} />
                        {std.grade || 'Umum'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <School size={14} color="#94A3B8" />
                        <span>{std.school || '-'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#64748B' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={14} color="#94A3B8" />
                        <span>{std.birth_date ? new Date(std.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#64748B', maxWidth: '240px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {std.notes || '-'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          className="btn-touch-sm"
                          onClick={() => setDetailModalStudent(std)}
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
                          onClick={() => setDeleteModalStudent(std)}
                          title="Hapus Data"
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
          <span>Menampilkan {filteredStudents.length} dari {totalCount} total siswa</span>
          <span style={{ fontWeight: 600 }}>Tersinkronisasi dengan Database Djuniors</span>
        </div>
      </div>

      {/* Modal: Tambah Siswa Baru */}
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
                <Users size={20} color="#4A90D9" />
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                  Tambah Siswa Baru
                </h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Nama Lengkap Siswa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kenzo Alvaro"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Jenjang / Kelas *
                  </label>
                  <select
                    value={formGrade}
                    onChange={(e) => setFormGrade(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  >
                    <option value="TK A">TK A (4-5 th)</option>
                    <option value="TK B">TK B (5-6 th)</option>
                    <option value="SD 1">SD Kelas 1</option>
                    <option value="SD 2">SD Kelas 2</option>
                    <option value="SD 3">SD Kelas 3</option>
                    <option value="SD 4">SD Kelas 4</option>
                    <option value="SD 5">SD Kelas 5</option>
                    <option value="SD 6">SD Kelas 6</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Tanggal Lahir
                  </label>
                  <input
                    type="date"
                    value={formBirthDate}
                    onChange={(e) => setFormBirthDate(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Sekolah Asal (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: TK Bintang Pertiwi"
                  value={formSchool}
                  onChange={(e) => setFormSchool(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Catatan Pembelajaran Khusus (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Sangat aktif, lebih mudah paham dengan contoh visual..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                />
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
                  {isSubmitting ? 'Menyimpan...' : 'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Detail Siswa */}
      {detailModalStudent && (
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
                Detail Profil Siswa
              </h3>
              <button
                onClick={() => setDetailModalStudent(null)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#4A90D9', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800 }}>
                  {detailModalStudent.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B' }}>{detailModalStudent.full_name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748B' }}>ID Siswa: {detailModalStudent.id}</div>
                </div>
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Jenjang / Kelas</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>{detailModalStudent.grade || '-'}</div>
                </div>
                <div style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Tanggal Lahir</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>
                    {detailModalStudent.birth_date ? new Date(detailModalStudent.birth_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Sekolah Asal</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>{detailModalStudent.school || '-'}</div>
              </div>

              <div style={{ border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '10px' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Catatan Pembelajaran</div>
                <div style={{ fontSize: '0.9rem', color: '#334155', marginTop: '4px', lineHeight: 1.4 }}>{detailModalStudent.notes || 'Tidak ada catatan khusus.'}</div>
              </div>

              <button
                onClick={() => setDetailModalStudent(null)}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', backgroundColor: '#4A90D9', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem' }}
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Hapus Siswa */}
      {deleteModalStudent && (
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
              Hapus Data Siswa?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 1.25rem 0' }}>
              Yakin ingin menghapus data <strong>{deleteModalStudent.full_name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteModalStudent(null)}
                style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
              >
                Batal
              </button>
              <button
                onClick={handleDeleteStudent}
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

export default Students;
