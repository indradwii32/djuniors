// ============================================
// Djuniors Dashboard - Custom Forms Management Page
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  X,
  Copy,
  Layers,
  Sparkles,
  Code,
  Calendar,
  Filter,
} from 'lucide-react';
import { formsApi, FormItem } from '../utils/api';
import FormBuilder from '../components/FormBuilder';

export const Forms: React.FC = () => {
  // Data States
  const [forms, setForms] = useState<FormItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Builder View State
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [selectedFormForEdit, setSelectedFormForEdit] = useState<FormItem | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Preview Modal State
  const [previewModalForm, setPreviewModalForm] = useState<FormItem | null>(null);
  const [previewTestValues, setPreviewTestValues] = useState<Record<string, any>>({});
  const [previewSuccessMsg, setPreviewSuccessMsg] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<boolean>(false);

  // Delete Modal State
  const [deleteConfirmForm, setDeleteConfirmForm] = useState<FormItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Fetch all forms from API
  const loadForms = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);
      setErrorMsg(null);

      const data = await formsApi.getAll();
      setForms(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal memuat daftar formulir pendaftaran');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // Show temporary toast notification
  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  // Format creation date
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Toggle active status
  const handleToggleActive = async (form: FormItem) => {
    const isCurrentlyActive = Boolean(form.is_active);
    const newStatus = isCurrentlyActive ? 0 : 1;

    // Optimistic UI update
    setForms((prev) =>
      prev.map((f) => (f.id === form.id ? { ...f, is_active: newStatus } : f))
    );

    try {
      await formsApi.update(form.id, { is_active: newStatus });
      showToast(
        `Formulir "${form.name}" berhasil di${newStatus === 1 ? 'aktifkan' : 'nonaktifkan'}!`
      );
    } catch (err: any) {
      // Revert on error
      setForms((prev) =>
        prev.map((f) => (f.id === form.id ? { ...f, is_active: isCurrentlyActive } : f))
      );
      setErrorMsg(err?.message || 'Gagal mengubah status formulir');
    }
  };

  // Open builder for new form
  const handleCreateNew = () => {
    setSelectedFormForEdit(null);
    setIsBuilderOpen(true);
  };

  // Open builder for edit
  const handleEdit = (form: FormItem) => {
    setSelectedFormForEdit(form);
    setIsBuilderOpen(true);
  };

  // Save form (create or update)
  const handleSaveForm = async (formData: {
    name: string;
    description: string;
    fields: any[];
    is_active: number;
  }) => {
    try {
      setIsSaving(true);

      if (selectedFormForEdit) {
        // Update existing form
        await formsApi.update(selectedFormForEdit.id, formData);
        showToast(`Formulir "${formData.name}" berhasil diperbarui!`);
      } else {
        // Create new form
        await formsApi.create(formData);
        showToast(`Formulir "${formData.name}" berhasil dibuat!`);
      }

      setIsBuilderOpen(false);
      setSelectedFormForEdit(null);
      await loadForms();
    } catch (err: any) {
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Open delete confirmation modal
  const handleDeleteClick = (form: FormItem) => {
    setDeleteConfirmForm(form);
  };

  // Confirm delete form
  const handleConfirmDelete = async () => {
    if (!deleteConfirmForm) return;

    try {
      setIsDeleting(true);
      await formsApi.delete(deleteConfirmForm.id);
      showToast(`Formulir "${deleteConfirmForm.name}" berhasil dihapus.`);
      setDeleteConfirmForm(null);
      await loadForms();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Gagal menghapus formulir');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open preview modal
  const handleOpenPreview = (form: FormItem) => {
    setPreviewModalForm(form);
    setPreviewTestValues({});
    setPreviewSuccessMsg(false);
    setCopiedId(false);
  };

  // Copy Form ID to clipboard
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  // Filter forms list
  const filteredForms = forms.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const isActive = Boolean(f.is_active);
    if (filterStatus === 'active') return matchesSearch && isActive;
    if (filterStatus === 'inactive') return matchesSearch && !isActive;
    return matchesSearch;
  });

  // Calculate statistics
  const totalForms = forms.length;
  const activeForms = forms.filter((f) => Boolean(f.is_active)).length;
  const inactiveForms = totalForms - activeForms;
  const totalFields = forms.reduce((acc, f) => acc + (Array.isArray(f.fields) ? f.fields.length : 0), 0);

  // If builder mode is active, render FormBuilder view
  if (isBuilderOpen) {
    return (
      <FormBuilder
        initialData={selectedFormForEdit}
        onSave={handleSaveForm}
        onCancel={() => {
          setIsBuilderOpen(false);
          setSelectedFormForEdit(null);
        }}
        isLoading={isSaving}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Toast Notification */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#10B981',
            color: '#FFFFFF',
            padding: '0.9rem 1.4rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '0.9rem',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Banner & Header */}
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
            <Sparkles size={14} color="#FFD93D" />
            <span>Kustomisasi Formulir Dinamis</span>
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
            Formulir Pendaftaran Kustom 📝
          </h2>

          <p style={{ margin: 0, color: '#CBD5E1', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Buat dan sesuaikan kolom pendaftaran siswa baru secara fleksibel. Formulir yang aktif akan
            otomatis muncul di alur pendaftaran siswa website.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', zIndex: 1 }}>
          <button
            onClick={() => loadForms(true)}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.75rem 1.1rem',
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

          <button
            onClick={handleCreateNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.75rem 1.35rem',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#4A90D9',
              color: '#FFFFFF',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(74, 144, 217, 0.4)',
              transition: 'all 0.2s ease',
            }}
          >
            <Plus size={18} />
            <span>Buat Formulir Baru</span>
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
            onClick={() => loadForms()}
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

      {/* Stats Summary Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {/* Total Forms */}
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
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
              Total Formulir
            </div>
            <div
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#1E293B',
                lineHeight: 1.1,
              }}
            >
              {totalForms}
            </div>
          </div>
        </div>

        {/* Active Forms */}
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
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
              Formulir Aktif
            </div>
            <div
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#1E293B',
                lineHeight: 1.1,
              }}
            >
              {activeForms}
            </div>
          </div>
        </div>

        {/* Inactive Forms */}
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
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#F1F5F9',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Filter size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
              Formulir Nonaktif
            </div>
            <div
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#1E293B',
                lineHeight: 1.1,
              }}
            >
              {inactiveForms}
            </div>
          </div>
        </div>

        {/* Total Input Questions */}
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
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#FFFBEB',
              color: '#D97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Layers size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>
              Total Kolom Pertanyaan
            </div>
            <div
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#1E293B',
                lineHeight: 1.1,
              }}
            >
              {totalFields}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
        {/* Search input */}
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
            placeholder="Cari formulir berdasarkan nama atau deskripsi..."
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

        {/* Filter Status Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setFilterStatus('all')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: filterStatus === 'all' ? '#4A90D9' : '#F1F5F9',
              color: filterStatus === 'all' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s',
            }}
          >
            Semua ({totalForms})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('active')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: filterStatus === 'active' ? '#10B981' : '#F1F5F9',
              color: filterStatus === 'active' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s',
            }}
          >
            Aktif ({activeForms})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('inactive')}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: filterStatus === 'inactive' ? '#64748B' : '#F1F5F9',
              color: filterStatus === 'inactive' ? '#FFFFFF' : '#475569',
              transition: 'all 0.2s',
            }}
          >
            Nonaktif ({inactiveForms})
          </button>
        </div>
      </div>

      {/* Forms List Table / Grid */}
      {isLoading ? (
        <div
          style={{
            padding: '4rem 2rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            textAlign: 'center',
            color: '#64748B',
          }}
        >
          <RefreshCw size={32} className="animate-spin" color="#4A90D9" style={{ margin: '0 auto 1rem auto' }} />
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1E293B' }}>
            Memuat daftar formulir pendaftaran...
          </div>
        </div>
      ) : filteredForms.length === 0 ? (
        <div
          style={{
            padding: '4rem 2rem',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '2px dashed #CBD5E1',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
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
            <FileText size={32} />
          </div>
          <div>
            <h3
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.4rem',
                fontWeight: 700,
                color: '#1E293B',
                margin: '0 0 0.5rem 0',
              }}
            >
              {searchQuery ? 'Formulir Tidak Ditemukan' : 'Belum Ada Formulir Kustom'}
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '450px', margin: 0 }}>
              {searchQuery
                ? 'Tidak ada formulir yang cocok dengan kata kunci pencarian Anda.'
                : 'Mulai buat formulir pendaftaran dinamis pertama Anda untuk mengumpulkan informasi calon siswa baru.'}
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#4A90D9',
              color: '#FFFFFF',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(74, 144, 217, 0.3)',
            }}
          >
            <Plus size={18} />
            <span>Buat Formulir Sekarang</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.25rem' }}>
          {filteredForms.map((form) => {
            const isActive = Boolean(form.is_active);
            const fieldsCount = Array.isArray(form.fields) ? form.fields.length : 0;

            return (
              <div
                key={form.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.02)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                }}
                className="hover-lift"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  {/* Left: Form Info */}
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <h3
                        style={{
                          fontFamily: "'Baloo 2', cursive",
                          fontSize: '1.35rem',
                          fontWeight: 700,
                          color: '#1E293B',
                          margin: 0,
                        }}
                      >
                        {form.name}
                      </h3>

                      {/* Status Badge */}
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: '20px',
                          backgroundColor: isActive ? '#DCFCE7' : '#F1F5F9',
                          color: isActive ? '#15803D' : '#64748B',
                          border: `1px solid ${isActive ? '#BBF7D0' : '#E2E8F0'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isActive ? '#15803D' : '#94A3B8',
                          }}
                        />
                        <span>{isActive ? 'Aktif' : 'Nonaktif'}</span>
                      </span>
                    </div>

                    {form.description ? (
                      <p
                        style={{
                          color: '#64748B',
                          fontSize: '0.875rem',
                          margin: '0 0 0.75rem 0',
                          lineHeight: 1.5,
                        }}
                      >
                        {form.description}
                      </p>
                    ) : (
                      <p style={{ color: '#94A3B8', fontSize: '0.85rem', fontStyle: 'italic', margin: '0 0 0.75rem 0' }}>
                        (Tidak ada deskripsi)
                      </p>
                    )}

                    {/* Metadata Badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#4A90D9',
                          backgroundColor: '#EFF6FF',
                          padding: '3px 10px',
                          borderRadius: '8px',
                        }}
                      >
                        <Layers size={14} />
                        <span>{fieldsCount} Kolom Pertanyaan</span>
                      </div>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.8rem',
                          color: '#64748B',
                        }}
                      >
                        <Calendar size={14} />
                        <span>Dibuat: {formatDate(form.created_at)}</span>
                      </div>

                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          color: '#94A3B8',
                          fontFamily: 'monospace',
                        }}
                      >
                        <Code size={12} />
                        <span>ID: {form.id.substring(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Toggle Active Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(form)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.55rem 0.9rem',
                        borderRadius: '10px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: isActive ? '#FEF2F2' : '#F0FDF4',
                        color: isActive ? '#DC2626' : '#16A34A',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title={isActive ? 'Nonaktifkan formulir ini' : 'Aktifkan formulir ini'}
                    >
                      {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>

                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(form)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.55rem 0.9rem',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: '#F8FAFC',
                        color: '#475569',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Eye size={15} color="#4A90D9" />
                      <span>Preview</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleEdit(form)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.55rem 0.9rem',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#4A90D9',
                        color: '#FFFFFF',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(74, 144, 217, 0.25)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <Edit2 size={15} />
                      <span>Edit</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteClick(form)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        backgroundColor: 'rgba(239, 68, 68, 0.08)',
                        color: '#EF4444',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title="Hapus formulir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Field Tags Preview */}
                {Array.isArray(form.fields) && form.fields.length > 0 && (
                  <div
                    style={{
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #F1F5F9',
                      display: 'flex',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8' }}>
                      Kolom Input:
                    </span>
                    {form.fields.map((f, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: '0.75rem',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#F1F5F9',
                          color: '#334155',
                          fontWeight: 600,
                        }}
                      >
                        {f.label}{' '}
                        <span style={{ color: '#94A3B8', fontSize: '0.7rem' }}>({f.type})</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewModalForm && (
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
          onClick={() => setPreviewModalForm(null)}
        >
          <div
            className="modal-content modal-responsive"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '650px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              animation: 'fadeIn 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Title & Close */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.5rem 1.75rem',
                borderBottom: '1px solid #F1F5F9',
                position: 'sticky',
                top: 0,
                backgroundColor: '#FFFFFF',
                zIndex: 10,
                borderRadius: '20px 20px 0 0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    backgroundColor: '#EFF6FF',
                    color: '#4A90D9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Eye size={20} />
                </div>
                <div>
                  <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                    {previewModalForm.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    Live Interactive Preview Formulir
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPreviewModalForm(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Form Rendering */}
            <div style={{ padding: '2rem 1.75rem' }}>
              {/* Form Header Info */}
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: '#4A90D9',
                    color: '#FFFFFF',
                    fontSize: '1.5rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '0.75rem',
                  }}
                >
                  🧮
                </div>
                <h3
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: '#1E293B',
                    margin: '0 0 0.5rem 0',
                  }}
                >
                  {previewModalForm.name}
                </h3>
                {previewModalForm.description && (
                  <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
                    {previewModalForm.description}
                  </p>
                )}
              </div>

              {previewSuccessMsg && (
                <div
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '12px',
                    backgroundColor: '#DCFCE7',
                    border: '1px solid #BBF7D0',
                    color: '#15803D',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '1.5rem',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>Simulasi Submit Berhasil! Data form valid.</span>
                </div>
              )}

              {/* Form Input Fields */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setPreviewSuccessMsg(true);
                  setTimeout(() => setPreviewSuccessMsg(false), 3500);
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              >
                {Array.isArray(previewModalForm.fields) &&
                  previewModalForm.fields.map((f, i) => (
                    <div key={i}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.875rem',
                          fontWeight: 700,
                          color: '#1E293B',
                          marginBottom: '6px',
                        }}
                      >
                        {f.label} {f.required && <span style={{ color: '#EF4444' }}>*</span>}
                      </label>

                      {f.type === 'text' && (
                        <input
                          type="text"
                          required={f.required}
                          placeholder={f.placeholder || 'Masukkan jawaban...'}
                          value={previewTestValues[f.name] || ''}
                          onChange={(e) =>
                            setPreviewTestValues({ ...previewTestValues, [f.name]: e.target.value })
                          }
                          style={{
                            width: '100%',
                            padding: '0.7rem 0.95rem',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      )}

                      {f.type === 'email' && (
                        <input
                          type="email"
                          required={f.required}
                          placeholder={f.placeholder || 'nama@email.com'}
                          value={previewTestValues[f.name] || ''}
                          onChange={(e) =>
                            setPreviewTestValues({ ...previewTestValues, [f.name]: e.target.value })
                          }
                          style={{
                            width: '100%',
                            padding: '0.7rem 0.95rem',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      )}

                      {f.type === 'tel' && (
                        <input
                          type="tel"
                          required={f.required}
                          placeholder={f.placeholder || '081234567890'}
                          value={previewTestValues[f.name] || ''}
                          onChange={(e) =>
                            setPreviewTestValues({ ...previewTestValues, [f.name]: e.target.value })
                          }
                          style={{
                            width: '100%',
                            padding: '0.7rem 0.95rem',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      )}

                      {f.type === 'date' && (
                        <input
                          type="date"
                          required={f.required}
                          value={previewTestValues[f.name] || ''}
                          onChange={(e) =>
                            setPreviewTestValues({ ...previewTestValues, [f.name]: e.target.value })
                          }
                          style={{
                            width: '100%',
                            padding: '0.7rem 0.95rem',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.9rem',
                            outline: 'none',
                          }}
                        />
                      )}

                      {f.type === 'select' && (
                        <select
                          required={f.required}
                          value={previewTestValues[f.name] || ''}
                          onChange={(e) =>
                            setPreviewTestValues({ ...previewTestValues, [f.name]: e.target.value })
                          }
                          style={{
                            width: '100%',
                            padding: '0.7rem 0.95rem',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.9rem',
                            outline: 'none',
                            backgroundColor: '#FFFFFF',
                          }}
                        >
                          <option value="">-- Pilih salah satu opsi --</option>
                          {(f.options || []).map((opt, oIdx) => (
                            <option key={oIdx} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {f.type === 'textarea' && (
                        <textarea
                          rows={3}
                          required={f.required}
                          placeholder={f.placeholder || 'Tuliskan jawaban lengkap...'}
                          value={previewTestValues[f.name] || ''}
                          onChange={(e) =>
                            setPreviewTestValues({ ...previewTestValues, [f.name]: e.target.value })
                          }
                          style={{
                            width: '100%',
                            padding: '0.7rem 0.95rem',
                            borderRadius: '10px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.9rem',
                            outline: 'none',
                            resize: 'vertical',
                          }}
                        />
                      )}

                      {f.type === 'radio' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '4px' }}>
                          {(f.options || []).map((opt, oIdx) => (
                            <label
                              key={oIdx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.875rem',
                                color: '#334155',
                                cursor: 'pointer',
                              }}
                            >
                              <input
                                type="radio"
                                name={`preview_${f.name}`}
                                value={opt}
                                checked={previewTestValues[f.name] === opt}
                                onChange={() =>
                                  setPreviewTestValues({ ...previewTestValues, [f.name]: opt })
                                }
                                style={{ accentColor: '#4A90D9', cursor: 'pointer' }}
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                <button
                  type="submit"
                  style={{
                    marginTop: '0.5rem',
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#4A90D9',
                    color: '#FFFFFF',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(74, 144, 217, 0.35)',
                  }}
                >
                  Tes Kirim Pendaftaran (Simulasi)
                </button>
              </form>

              {/* Form ID & Integration Copy */}
              <div
                style={{
                  marginTop: '2rem',
                  padding: '1rem',
                  borderRadius: '12px',
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>
                    ID FORMULIR (API)
                  </div>
                  <div style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#1E293B' }}>
                    {previewModalForm.id}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-touch-sm"
                  onClick={() => handleCopyId(previewModalForm.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {copiedId ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                  <span>{copiedId ? 'Tersalin!' : 'Salin Form ID'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmForm && (
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
          onClick={() => setDeleteConfirmForm(null)}
        >
          <div
            className="modal-content modal-responsive"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              animation: 'fadeIn 0.2s ease',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#FEE2E2',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={28} />
            </div>

            <div>
              <h3
                style={{
                  fontFamily: "'Baloo 2', cursive",
                  fontSize: '1.4rem',
                  fontWeight: 800,
                  color: '#1E293B',
                  margin: '0 0 0.5rem 0',
                }}
              >
                Hapus Formulir?
              </h3>
              <p style={{ color: '#64748B', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                Apakah Anda yakin ingin menghapus formulir{' '}
                <strong style={{ color: '#1E293B' }}>"{deleteConfirmForm.name}"</strong>? Data form
                yang dihapus tidak dapat dikembalikan.
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                width: '100%',
                marginTop: '0.5rem',
              }}
            >
              <button
                type="button"
                onClick={() => setDeleteConfirmForm(null)}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                }}
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Forms;
