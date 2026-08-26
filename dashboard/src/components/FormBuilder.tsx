// ============================================
// Djuniors Dashboard - Custom Form Builder Component
// ============================================

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Copy,
  Eye,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Type,
  Mail,
  Phone,
  Calendar,
  ListFilter,
  AlignLeft,
  CircleDot,
  Save,
  X,
  Sparkles,
  HelpCircle,
  ArrowLeft,
  Check,
} from 'lucide-react';

export type FieldType = 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea' | 'radio';

export interface FormFieldItem {
  id: string; // internal tracking key
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface FormBuilderProps {
  initialData?: {
    id?: string;
    name: string;
    description?: string;
    fields: Array<{
      name: string;
      label: string;
      type: string;
      required: boolean;
      options?: string[];
      placeholder?: string;
    }>;
    is_active?: boolean | number;
  } | null;
  onSave: (formData: {
    name: string;
    description: string;
    fields: Array<{
      name: string;
      label: string;
      type: string;
      required: boolean;
      options?: string[];
      placeholder?: string;
    }>;
    is_active: number;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

// Field Type Definitions & Metadata
const FIELD_TYPES: Array<{
  type: FieldType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  defaultPlaceholder?: string;
  defaultOptions?: string[];
}> = [
  {
    type: 'text',
    label: 'Teks Singkat',
    description: 'Nama lengkap, sekolah, kota, dll.',
    icon: Type,
    color: '#4A90D9',
    defaultPlaceholder: 'Masukkan teks...',
  },
  {
    type: 'email',
    label: 'Email',
    description: 'Format email otomatis divalidasi',
    icon: Mail,
    color: '#8B5CF6',
    defaultPlaceholder: 'nama@email.com',
  },
  {
    type: 'tel',
    label: 'Nomor WhatsApp/HP',
    description: 'Nomor telepon aktif orang tua',
    icon: Phone,
    color: '#10B981',
    defaultPlaceholder: '08123456789',
  },
  {
    type: 'date',
    label: 'Tanggal',
    description: 'Tanggal lahir anak, jadwal, dll.',
    icon: Calendar,
    color: '#F59E0B',
    defaultPlaceholder: 'Pilih tanggal...',
  },
  {
    type: 'select',
    label: 'Pilihan Dropdown',
    description: 'Daftar opsi dropdown tunggal',
    icon: ListFilter,
    color: '#EC4899',
    defaultOptions: ['Pilihan 1', 'Pilihan 2', 'Pilihan 3'],
  },
  {
    type: 'textarea',
    label: 'Teks Panjang',
    description: 'Alamat lengkap, catatan khusus anak',
    icon: AlignLeft,
    color: '#6366F1',
    defaultPlaceholder: 'Tuliskan rincian di sini...',
  },
  {
    type: 'radio',
    label: 'Pilihan Radio',
    description: 'Pilihan opsi tunggal dengan tombol bulat',
    icon: CircleDot,
    color: '#14B8A6',
    defaultOptions: ['Opsi A', 'Opsi B'],
  },
];

// Helper to generate a slug key from label
const generateKeyFromLabel = (label: string, existingKeys: string[] = []): string => {
  let slug = label
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '_')
    .replace(/^-+|-+$/g, '');

  if (!slug) slug = 'field';

  let uniqueSlug = slug;
  let counter = 1;
  while (existingKeys.includes(uniqueSlug)) {
    uniqueSlug = `${slug}_${counter}`;
    counter++;
  }
  return uniqueSlug;
};

export const FormBuilder: React.FC<FormBuilderProps> = ({
  initialData,
  onSave,
  onCancel,
  isLoading = false,
}) => {
  // Mode: 'editor' or 'preview'
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Form Metadata
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Field List
  const [fields, setFields] = useState<FormFieldItem[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Test state for preview submission simulation
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});
  const [previewSuccess, setPreviewSuccess] = useState<boolean>(false);

  // Initialize data
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setDescription(initialData.description || '');
      setIsActive(initialData.is_active !== undefined ? Boolean(initialData.is_active) : true);

      if (initialData.fields && Array.isArray(initialData.fields)) {
        setFields(
          initialData.fields.map((f, idx) => ({
            id: `field_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
            name: f.name || `field_${idx + 1}`,
            label: f.label || `Kolom ${idx + 1}`,
            type: (f.type as FieldType) || 'text',
            required: Boolean(f.required),
            placeholder: f.placeholder || '',
            options: f.options ? [...f.options] : undefined,
          }))
        );
      } else {
        setFields([]);
      }
    } else {
      // Default initial fields for a new registration form
      setName('Formulir Pendaftaran Siswa Baru');
      setDescription('Silakan lengkapi data calon siswa matematika Djuniors di bawah ini.');
      setIsActive(true);
      setFields([
        {
          id: `field_${Date.now()}_1`,
          name: 'nama_lengkap_anak',
          label: 'Nama Lengkap Anak',
          type: 'text',
          required: true,
          placeholder: 'Contoh: Budi Pratama',
        },
        {
          id: `field_${Date.now()}_2`,
          name: 'tanggal_lahir',
          label: 'Tanggal Lahir Anak',
          type: 'date',
          required: true,
        },
        {
          id: `field_${Date.now()}_3`,
          name: 'jenjang_kelas',
          label: 'Jenjang Kelas Saat Ini',
          type: 'select',
          required: true,
          options: ['TK A (4-5 Tahun)', 'TK B (5-6 Tahun)', 'SD Kelas 1', 'SD Kelas 2', 'SD Kelas 3-6'],
        },
        {
          id: `field_${Date.now()}_4`,
          name: 'whatsapp_wali',
          label: 'Nomor WhatsApp Orang Tua / Wali',
          type: 'tel',
          required: true,
          placeholder: 'Contoh: 081234567890',
        },
        {
          id: `field_${Date.now()}_5`,
          name: 'catatan_khusus',
          label: 'Catatan Khusus / Riwayat Belajar',
          type: 'textarea',
          required: false,
          placeholder: 'Tuliskan jika anak memiliki kebutuhan belajar khusus atau preferensi belajar...',
        },
      ]);
    }
  }, [initialData]);

  // Add new field
  const handleAddField = (type: FieldType) => {
    const meta = FIELD_TYPES.find((t) => t.type === type);
    const count = fields.length + 1;
    const defaultLabel = `${meta?.label || 'Kolom'} ${count}`;
    const existingKeys = fields.map((f) => f.name);
    const newKey = generateKeyFromLabel(defaultLabel, existingKeys);

    const newField: FormFieldItem = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: newKey,
      label: defaultLabel,
      type: type,
      required: false,
      placeholder: meta?.defaultPlaceholder || '',
      options: meta?.defaultOptions ? [...meta.defaultOptions] : undefined,
    };

    setFields([...fields, newField]);
    setValidationError(null);
  };

  // Update existing field
  const handleUpdateField = (index: number, updates: Partial<FormFieldItem>) => {
    setFields((prev) => {
      const updated = [...prev];
      const current = updated[index];
      const newField = { ...current, ...updates };

      // If type changed to select/radio and no options exist, initialize default options
      if (
        (newField.type === 'select' || newField.type === 'radio') &&
        (!newField.options || newField.options.length === 0)
      ) {
        newField.options = ['Pilihan 1', 'Pilihan 2'];
      }

      updated[index] = newField;
      return updated;
    });
  };

  // Delete field
  const handleDeleteField = (index: number) => {
    if (fields.length <= 1) {
      if (!window.confirm('Apakah Anda yakin ingin menghapus kolom ini? Formulir harus memiliki minimal 1 kolom.')) {
        return;
      }
    }
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  // Duplicate field
  const handleDuplicateField = (index: number) => {
    const source = fields[index];
    const existingKeys = fields.map((f) => f.name);
    const newLabel = `${source.label} (Salinan)`;
    const newKey = generateKeyFromLabel(newLabel, existingKeys);

    const duplicated: FormFieldItem = {
      ...source,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: newKey,
      label: newLabel,
      options: source.options ? [...source.options] : undefined,
    };

    const newFields = [...fields];
    newFields.splice(index + 1, 0, duplicated);
    setFields(newFields);
  };

  // Reorder: Move Up / Down
  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === fields.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newFields = [...fields];
    const item = newFields.splice(index, 1)[0];
    newFields.splice(targetIndex, 0, item);
    setFields(newFields);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newFields = [...fields];
    const [draggedItem] = newFields.splice(draggedIndex, 1);
    newFields.splice(targetIndex, 0, draggedItem);
    setFields(newFields);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Options manager for select/radio
  const handleAddOption = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    const currentOptions = field.options || [];
    const newOptionName = `Opsi ${currentOptions.length + 1}`;
    handleUpdateField(fieldIndex, { options: [...currentOptions, newOptionName] });
  };

  const handleUpdateOption = (fieldIndex: number, optionIndex: number, value: string) => {
    const field = fields[fieldIndex];
    const currentOptions = [...(field.options || [])];
    currentOptions[optionIndex] = value;
    handleUpdateField(fieldIndex, { options: currentOptions });
  };

  const handleDeleteOption = (fieldIndex: number, optionIndex: number) => {
    const field = fields[fieldIndex];
    const currentOptions = [...(field.options || [])];
    if (currentOptions.length <= 1) {
      alert('Tipe pilihan harus memiliki minimal 1 opsi.');
      return;
    }
    currentOptions.splice(optionIndex, 1);
    handleUpdateField(fieldIndex, { options: currentOptions });
  };

  // Validation before save
  const handleSaveForm = async () => {
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Nama Formulir wajib diisi!');
      setActiveTab('editor');
      return;
    }

    if (fields.length === 0) {
      setValidationError('Formulir harus memiliki minimal 1 kolom pertanyaan!');
      setActiveTab('editor');
      return;
    }

    // Check empty labels or keys
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      if (!f.label.trim()) {
        setValidationError(`Kolom #${i + 1} belum memiliki Label Pertanyaan.`);
        setActiveTab('editor');
        return;
      }
      if (!f.name.trim()) {
        setValidationError(`Kolom #${i + 1} (${f.label}) belum memiliki kunci (Field ID).`);
        setActiveTab('editor');
        return;
      }
      if ((f.type === 'select' || f.type === 'radio') && (!f.options || f.options.length === 0)) {
        setValidationError(`Kolom #${i + 1} (${f.label}) memerlukan minimal 1 pilihan opsi.`);
        setActiveTab('editor');
        return;
      }
    }

    // Prepare payload
    const cleanedFields = fields.map((f) => {
      const res: any = {
        name: f.name.trim(),
        label: f.label.trim(),
        type: f.type,
        required: f.required,
      };
      if (f.placeholder && f.placeholder.trim()) {
        res.placeholder = f.placeholder.trim();
      }
      if (f.options && (f.type === 'select' || f.type === 'radio')) {
        res.options = f.options.map((opt) => opt.trim()).filter(Boolean);
      }
      return res;
    });

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        fields: cleanedFields,
        is_active: isActive ? 1 : 0,
      });
    } catch (err: any) {
      setValidationError(err?.message || 'Gagal menyimpan formulir');
    }
  };

  // Preview form test submission handler
  const handlePreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    fields.forEach((f) => {
      const val = previewValues[f.name];
      if (f.required && (val === undefined || val === null || val === '')) {
        errors[f.name] = `${f.label} wajib diisi!`;
      }
    });

    setPreviewErrors(errors);

    if (Object.keys(errors).length === 0) {
      setPreviewSuccess(true);
      setTimeout(() => setPreviewSuccess(false), 4000);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 25px rgba(0, 0, 0, 0.04)',
        padding: '2rem',
      }}
    >
      {/* Top Header Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onCancel}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              color: '#475569',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Kembali"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#1E293B',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              {initialData ? 'Edit Formulir Kustom' : 'Buat Formulir Kustom Baru'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
              Susun pertanyaan pendaftaran dinamis untuk siswa baru dengan fitur drag & drop.
            </p>
          </div>
        </div>

        {/* Tab switcher: Editor vs Preview */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#F1F5F9',
            padding: '4px',
            borderRadius: '12px',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeTab === 'editor' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'editor' ? '#4A90D9' : '#64748B',
              boxShadow: activeTab === 'editor' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Edit3 size={16} />
            <span>Form Builder</span>
            <span
              style={{
                padding: '1px 6px',
                borderRadius: '8px',
                fontSize: '0.725rem',
                backgroundColor: activeTab === 'editor' ? '#EFF6FF' : '#E2E8F0',
                color: activeTab === 'editor' ? '#4A90D9' : '#64748B',
                fontWeight: 800,
              }}
            >
              {fields.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('preview');
              setPreviewErrors({});
              setPreviewSuccess(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              backgroundColor: activeTab === 'preview' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'preview' ? '#4A90D9' : '#64748B',
              boxShadow: activeTab === 'preview' ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Eye size={16} />
            <span>Live Preview</span>
          </button>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            color: '#B91C1C',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}

      {/* MAIN CONTENT BASED ON TAB */}
      {activeTab === 'editor' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Form General Settings Card */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '16px',
              padding: '1.5rem',
              border: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#4A90D9" />
                <h3
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    margin: 0,
                  }}
                >
                  Informasi Dasar Formulir
                </h3>
              </div>

              {/* Status Active Toggle Switch */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: isActive ? '#15803D' : '#64748B',
                }}
              >
                <span>Status: {isActive ? 'Formulir Aktif' : 'Nonaktif'}</span>
                <div
                  onClick={() => setIsActive(!isActive)}
                  style={{
                    width: '46px',
                    height: '24px',
                    backgroundColor: isActive ? '#4A90D9' : '#CBD5E1',
                    borderRadius: '12px',
                    position: 'relative',
                    transition: 'background-color 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      backgroundColor: '#FFFFFF',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '3px',
                      left: isActive ? '25px' : '3px',
                      transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    }}
                  />
                </div>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              {/* Form Name */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Nama Formulir <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Formulir Pendaftaran Siswa Baru TA 2026/2027"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.95rem',
                    color: '#1E293B',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#4A90D9')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>

              {/* Form Description */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#334155',
                    marginBottom: '6px',
                  }}
                >
                  Deskripsi / Petunjuk Pengisian Formulir (Opsional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Contoh: Silakan isi data calon siswa matematika Djuniors dengan teliti. Tim kami akan mengonfirmasi jadwal kelas via WhatsApp."
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    color: '#1E293B',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    resize: 'vertical',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#4A90D9')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>
            </div>
          </div>

          {/* Add Field Toolbar */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={18} color="#4A90D9" />
                <span
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontSize: '1.15rem',
                    fontWeight: 700,
                    color: '#1E293B',
                  }}
                >
                  Tambah Kolom Pertanyaan Baru
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Klik tombol tipe kolom di bawah untuk menambahkannya ke form
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '0.75rem',
              }}
            >
              {FIELD_TYPES.map((ft) => {
                const Icon = ft.icon;
                return (
                  <button
                    key={ft.type}
                    type="button"
                    onClick={() => handleAddField(ft.type)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.9rem 0.6rem',
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      gap: '6px',
                      textAlign: 'center',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = ft.color;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: `${ft.color}18`,
                        color: ft.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        color: '#1E293B',
                      }}
                    >
                      {ft.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fields Editor List (Drag & Drop) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: '#1E293B',
                  }}
                >
                  Struktur Kolom Formulir ({fields.length})
                </span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Tarik handle (⋮⋮) atau gunakan tombol panah untuk mengubah urutan
              </span>
            </div>

            {fields.length === 0 ? (
              <div
                style={{
                  padding: '3rem 2rem',
                  borderRadius: '16px',
                  border: '2px dashed #CBD5E1',
                  backgroundColor: '#F8FAFC',
                  textAlign: 'center',
                  color: '#64748B',
                }}
              >
                <HelpCircle size={40} color="#94A3B8" style={{ marginBottom: '0.75rem' }} />
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1E293B', margin: '0 0 0.25rem 0' }}>
                  Belum ada kolom pertanyaan
                </h4>
                <p style={{ fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
                  Pilih salah satu tipe input di atas untuk mulai menyusun formulir.
                </p>
              </div>
            ) : (
              fields.map((field, index) => {
                const meta = FIELD_TYPES.find((t) => t.type === field.type) || FIELD_TYPES[0];
                const TypeIcon = meta.icon;
                const isDragging = draggedIndex === index;
                const isDragOver = dragOverIndex === index && draggedIndex !== index;

                return (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '14px',
                      border: isDragOver
                        ? '2px solid #4A90D9'
                        : isDragging
                        ? '2px dashed #94A3B8'
                        : '1px solid #E2E8F0',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                      opacity: isDragging ? 0.4 : 1,
                      transition: 'border 0.2s, box-shadow 0.2s',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Field Header / Handle Bar */}
                    <div
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#F8FAFC',
                        borderBottom: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                      }}
                    >
                      {/* Left: Drag Handle, Number & Type Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            cursor: 'grab',
                            color: '#94A3B8',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px',
                          }}
                          title="Tahan dan geser untuk memindahkan urutan"
                        >
                          <GripVertical size={18} />
                        </div>

                        <span
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            backgroundColor: '#E2E8F0',
                            color: '#475569',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {index + 1}
                        </span>

                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            backgroundColor: `${meta.color}15`,
                            color: meta.color,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          <TypeIcon size={13} />
                          <span>{meta.label}</span>
                        </div>

                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: 700,
                            color: '#1E293B',
                          }}
                        >
                          {field.label || '(Tanpa Label)'}
                        </span>

                        {field.required && (
                          <span
                            style={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '10px',
                              backgroundColor: '#FEE2E2',
                              color: '#DC2626',
                            }}
                          >
                            Wajib
                          </span>
                        )}
                      </div>

                      {/* Right: Quick Action Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveField(index, 'up')}
                          disabled={index === 0}
                          style={{
                            background: 'transparent',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            padding: '4px',
                            color: index === 0 ? '#CBD5E1' : '#475569',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                          }}
                          title="Pindah Ke Atas"
                        >
                          <ChevronUp size={16} />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveField(index, 'down')}
                          disabled={index === fields.length - 1}
                          style={{
                            background: 'transparent',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            padding: '4px',
                            color: index === fields.length - 1 ? '#CBD5E1' : '#475569',
                            cursor: index === fields.length - 1 ? 'not-allowed' : 'pointer',
                          }}
                          title="Pindah Ke Bawah"
                        >
                          <ChevronDown size={16} />
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleDuplicateField(index)}
                          style={{
                            background: 'transparent',
                            border: '1px solid #E2E8F0',
                            borderRadius: '6px',
                            padding: '4px',
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                          title="Duplikasi Kolom"
                        >
                          <Copy size={16} />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => handleDeleteField(index)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                            padding: '4px',
                            color: '#EF4444',
                            cursor: 'pointer',
                          }}
                          title="Hapus Kolom"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Field Settings Body */}
                    <div
                      style={{
                        padding: '1.25rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '1rem',
                        alignItems: 'start',
                      }}
                    >
                      {/* Label Input */}
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#475569',
                            marginBottom: '4px',
                          }}
                        >
                          Label Pertanyaan <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => {
                            const newLabel = e.target.value;
                            handleUpdateField(index, {
                              label: newLabel,
                            });
                          }}
                          placeholder="e.g. Nama Lengkap Anak"
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.9rem',
                            color: '#1E293B',
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Field ID / Key Identifier */}
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#475569',
                            marginBottom: '4px',
                          }}
                        >
                          Kunci Data (Field ID) <span style={{ color: '#EF4444' }}>*</span>
                        </label>
                        <input
                          type="text"
                          value={field.name}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                            handleUpdateField(index, { name: val });
                          }}
                          placeholder="e.g. nama_lengkap_anak"
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            color: '#334155',
                            backgroundColor: '#F8FAFC',
                            outline: 'none',
                          }}
                        />
                      </div>

                      {/* Field Type Selector */}
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: '#475569',
                            marginBottom: '4px',
                          }}
                        >
                          Tipe Input
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) =>
                            handleUpdateField(index, { type: e.target.value as FieldType })
                          }
                          style={{
                            width: '100%',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.9rem',
                            color: '#1E293B',
                            backgroundColor: '#FFFFFF',
                            outline: 'none',
                          }}
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t.type} value={t.type}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Placeholder (For text, email, tel, textarea) */}
                      {['text', 'email', 'tel', 'textarea'].includes(field.type) && (
                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              color: '#475569',
                              marginBottom: '4px',
                            }}
                          >
                            Placeholder Bantuan (Opsional)
                          </label>
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) =>
                              handleUpdateField(index, { placeholder: e.target.value })
                            }
                            placeholder="Contoh teks petunjuk..."
                            style={{
                              width: '100%',
                              padding: '0.6rem 0.85rem',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              fontSize: '0.9rem',
                              color: '#1E293B',
                              outline: 'none',
                            }}
                          />
                        </div>
                      )}

                      {/* Required Toggle Checkbox */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          paddingTop: '1.6rem',
                        }}
                      >
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: 700,
                            color: field.required ? '#DC2626' : '#64748B',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) =>
                              handleUpdateField(index, { required: e.target.checked })
                            }
                            style={{
                              width: '18px',
                              height: '18px',
                              accentColor: '#4A90D9',
                              cursor: 'pointer',
                            }}
                          />
                          <span>Wajib Diisi (Required)</span>
                        </label>
                      </div>
                    </div>

                    {/* Options Editor for select and radio */}
                    {(field.type === 'select' || field.type === 'radio') && (
                      <div
                        style={{
                          padding: '1rem 1.25rem',
                          backgroundColor: '#F8FAFC',
                          borderTop: '1px dashed #E2E8F0',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '0.75rem',
                          }}
                        >
                          <label
                            style={{
                              fontSize: '0.825rem',
                              fontWeight: 700,
                              color: '#334155',
                            }}
                          >
                            Daftar Pilihan Opsi ({field.options?.length || 0})
                          </label>
                          <button
                            type="button"
                            className="btn-touch-sm"
                            onClick={() => handleAddOption(index)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '8px 12px',
                              borderRadius: '6px',
                              border: '1px solid #4A90D9',
                              backgroundColor: '#EFF6FF',
                              color: '#4A90D9',
                              fontSize: '0.775rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <Plus size={13} />
                            <span>Tambah Opsi</span>
                          </button>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                          }}
                        >
                          {(field.options || []).map((opt, optIdx) => (
                            <div
                              key={optIdx}
                              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  color: '#94A3B8',
                                  width: '20px',
                                  textAlign: 'center',
                                }}
                              >
                                {field.type === 'radio' ? '○' : `${optIdx + 1}.`}
                              </span>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) =>
                                  handleUpdateOption(index, optIdx, e.target.value)
                                }
                                placeholder={`Opsi ${optIdx + 1}`}
                                style={{
                                  flex: 1,
                                  padding: '0.45rem 0.75rem',
                                  borderRadius: '6px',
                                  border: '1px solid #CBD5E1',
                                  fontSize: '0.85rem',
                                  color: '#1E293B',
                                  outline: 'none',
                                  backgroundColor: '#FFFFFF',
                                }}
                              />
                              <button
                                type="button"
                                className="btn-touch-sm"
                                onClick={() => handleDeleteOption(index, optIdx)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#94A3B8',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  minWidth: '34px',
                                  minHeight: '34px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                                title="Hapus opsi"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* LIVE PREVIEW TAB */
        <div
          style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '16px',
            padding: '2rem',
            border: '1px solid #E2E8F0',
            maxWidth: '680px',
            margin: '0 auto',
            width: '100%',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              marginBottom: '1.75rem',
              paddingBottom: '1.25rem',
              borderBottom: '1px solid #E2E8F0',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#4A90D9',
                color: '#FFFFFF',
                fontSize: '1.6rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '0.75rem',
                boxShadow: '0 4px 12px rgba(74, 144, 217, 0.3)',
              }}
            >
              🧮
            </div>
            <h3
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.6rem',
                fontWeight: 800,
                color: '#1E293B',
                margin: '0 0 0.5rem 0',
              }}
            >
              {name || 'Nama Formulir'}
            </h3>
            {description && (
              <p
                style={{
                  color: '#64748B',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {description}
              </p>
            )}
          </div>

          {previewSuccess && (
            <div
              style={{
                padding: '1rem',
                borderRadius: '12px',
                backgroundColor: '#DCFCE7',
                border: '1px solid #BBF7D0',
                color: '#15803D',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={18} />
              <span>Simulasi Berhasil! Semua input valid dan form siap digunakan.</span>
            </div>
          )}

          <form onSubmit={handlePreviewSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {fields.map((f, idx) => {
              const hasError = Boolean(previewErrors[f.name]);
              return (
                <div key={f.id || idx}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      color: '#1E293B',
                      marginBottom: '6px',
                    }}
                  >
                    {f.label}{' '}
                    {f.required && <span style={{ color: '#EF4444' }}>*</span>}
                  </label>

                  {/* Input Based on Field Type */}
                  {f.type === 'text' && (
                    <input
                      type="text"
                      placeholder={f.placeholder || 'Masukkan jawaban...'}
                      value={previewValues[f.name] || ''}
                      onChange={(e) =>
                        setPreviewValues({ ...previewValues, [f.name]: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: hasError ? '1px solid #EF4444' : '1px solid #CBD5E1',
                        fontSize: '0.9rem',
                        color: '#1E293B',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    />
                  )}

                  {f.type === 'email' && (
                    <input
                      type="email"
                      placeholder={f.placeholder || 'nama@email.com'}
                      value={previewValues[f.name] || ''}
                      onChange={(e) =>
                        setPreviewValues({ ...previewValues, [f.name]: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: hasError ? '1px solid #EF4444' : '1px solid #CBD5E1',
                        fontSize: '0.9rem',
                        color: '#1E293B',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    />
                  )}

                  {f.type === 'tel' && (
                    <input
                      type="tel"
                      placeholder={f.placeholder || '081234567890'}
                      value={previewValues[f.name] || ''}
                      onChange={(e) =>
                        setPreviewValues({ ...previewValues, [f.name]: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: hasError ? '1px solid #EF4444' : '1px solid #CBD5E1',
                        fontSize: '0.9rem',
                        color: '#1E293B',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    />
                  )}

                  {f.type === 'date' && (
                    <input
                      type="date"
                      value={previewValues[f.name] || ''}
                      onChange={(e) =>
                        setPreviewValues({ ...previewValues, [f.name]: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: hasError ? '1px solid #EF4444' : '1px solid #CBD5E1',
                        fontSize: '0.9rem',
                        color: '#1E293B',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
                      }}
                    />
                  )}

                  {f.type === 'select' && (
                    <select
                      value={previewValues[f.name] || ''}
                      onChange={(e) =>
                        setPreviewValues({ ...previewValues, [f.name]: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: hasError ? '1px solid #EF4444' : '1px solid #CBD5E1',
                        fontSize: '0.9rem',
                        color: '#1E293B',
                        backgroundColor: '#FFFFFF',
                        outline: 'none',
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
                      placeholder={f.placeholder || 'Tuliskan jawaban lengkap...'}
                      value={previewValues[f.name] || ''}
                      onChange={(e) =>
                        setPreviewValues({ ...previewValues, [f.name]: e.target.value })
                      }
                      style={{
                        width: '100%',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: hasError ? '1px solid #EF4444' : '1px solid #CBD5E1',
                        fontSize: '0.9rem',
                        color: '#1E293B',
                        backgroundColor: '#FFFFFF',
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
                            checked={previewValues[f.name] === opt}
                            onChange={() =>
                              setPreviewValues({ ...previewValues, [f.name]: opt })
                            }
                            style={{ accentColor: '#4A90D9', cursor: 'pointer' }}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {hasError && (
                    <span style={{ fontSize: '0.75rem', color: '#EF4444', fontWeight: 600, marginTop: '4px', display: 'block' }}>
                      {previewErrors[f.name]}
                    </span>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0' }}>
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#4A90D9',
                  color: '#FFFFFF',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(74, 144, 217, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Check size={18} />
                <span>Tes Kirim Pendaftaran (Simulasi)</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BOTTOM ACTION BUTTONS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '1rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid #E2E8F0',
        }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          style={{
            padding: '0.75rem 1.5rem',
            borderRadius: '12px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
            color: '#475569',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Batal
        </button>

        <button
          type="button"
          onClick={handleSaveForm}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.75rem',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: '#4A90D9',
            color: '#FFFFFF',
            fontSize: '0.9rem',
            fontWeight: 700,
            cursor: isLoading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(74, 144, 217, 0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          <Save size={18} />
          <span>{isLoading ? 'Menyimpan Formulir...' : 'Simpan Formulir'}</span>
        </button>
      </div>
    </div>
  );
};

export default FormBuilder;
