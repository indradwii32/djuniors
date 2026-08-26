// ============================================
// Djuniors Dashboard - CMS Management Page
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  LayoutTemplate,
  Heading,
  Footprints,
  Sparkles,
  Award,
  BookOpen,
  MessageSquareQuote,
  Megaphone,
  Globe,
  Palette,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  Code2,
  Image as ImageIcon,
  Upload,
  Copy,
  Check,
  Search,
  Shapes,
  X,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import {
  SOCIAL_PLATFORMS,
  SOCIAL_PLATFORM_MAP,
  SocialBrandIcon,
  isKnownPlatform,
} from '../components/SocialPlatforms';
import {
  cmsApi,
  cmsFilesApi,
  cmsIconsApi,
  classesApi,
  CMSFile,
  CMSIcon,
  ClassItem,
} from '../utils/api';
import IconPicker, { renderIconPreview } from '../components/IconPicker';


// Default CMS state
const DEFAULT_CMS: Record<string, Record<string, any>> = {
  header: {
    site_name: 'Djuniors',
    logo_text: 'Djuniors',
    nav_items: [
      { label: 'Fitur', href: '#features' },
      { label: 'Pilihan Kelas', href: '#classes' },
      { label: 'Cara Kerja', href: '#how-it-works' },
      { label: 'Testimoni', href: '#testimonials' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Lacak Pendaftaran', href: 'lacak.html' },
    ],
    cta_button_text: 'Daftar Sekarang',
  },
  footer: {
    footer_tagline: 'Belajar matematika jadi seru untuk anak Indonesia!',
    footer_email: 'hello@djuniors.id',
    footer_phone: '081234567890',
    footer_address: 'Jakarta, Indonesia',
    copyright: '2026 Djuniors Learning Center',
    social_links: [
      { platform: 'facebook',  label: 'Facebook Djuniors',  url: 'https://facebook.com/djuniors',  icon: '📘', order: 1 },
      { platform: 'instagram', label: 'Instagram Djuniors', url: 'https://instagram.com/djuniors', icon: '📸', order: 2 },
      { platform: 'tiktok',    label: 'TikTok Djuniors',    url: 'https://tiktok.com/@djuniors',    icon: '🎵', order: 3 },
      { platform: 'youtube',   label: 'YouTube Djuniors',   url: 'https://youtube.com/@djuniors',   icon: '📺', order: 4 },
      { platform: 'whatsapp',  label: 'WhatsApp Djuniors',  url: 'https://wa.me/6281234567890',     icon: '💬', order: 5 },
      { platform: 'telegram',  label: 'Telegram Djuniors',  url: '',                                icon: '✈️', order: 6 },
    ],
  },
  hero: {
    hero_badge: '🎯',
    hero_title: 'Kelas Matematika Live Interaktif untuk Anak!',
    hero_subtitle: 'Belajar matematika langsung dengan guru via Google Meet.',
    hero_cta_text: 'Daftar Kelas Gratis!',
    hero_cta_link: 'daftar.html',
  },
  features: {
    features_title: 'Kenapa Pilih Djuniors?',
    features_subtitle: 'Kelas live interaktif yang bikin anak ketagihan belajar!',
    features_items: [
      {
        icon: '👩‍🏫',
        title: 'Live Class dengan Guru',
        description: 'Belajar langsung dengan guru berpengalaman via Google Meet. Bukan sekadar nonton video!',
      },
      {
        icon: '🤝',
        title: 'Interaktif & Real-Time',
        description: 'Anak bisa bertanya, berdiskusi, dan bermain game langsung di kelas. Belajar jadi menyenangkan!',
      },
      {
        icon: '👨‍👩‍👧',
        title: 'Kelas Kecil (Maks 8 Siswa)',
        description: 'Kelas kecil agar setiap anak mendapat perhatian penuh dari guru. Kualitas belajar terjamin!',
      },
      {
        icon: '📱',
        title: 'Akses dari Mana Saja',
        description: 'Cukup HP atau laptop dengan internet. Anak bisa belajar dari rumah tanpa ribet!',
      },
    ],
  },
  classes: {
    classes_title: 'Pilihan Kelas & Jadwal',
    classes_subtitle: 'Pilih kelas yang sesuai dengan usia dan jadwal belajar anak Anda!',
  },
  testimonials: {
    testimonials_title: 'Kata Orang Tua',
    testimonials_subtitle: 'Mereka sudah membuktikan anak jadi semangat belajar!',
    testimonials_items: [
      {
        name: 'Ibu Sarah',
        relation: 'Ibu dari Rizky (7 tahun)',
        text: 'Anak saya yang tadinya tidak suka matematika, sekarang minta belajar setiap hari! Kelas live-nya seru banget, guru-nya juga sabar.',
        rating: 5,
      },
      {
        name: 'Bapak Ahmad',
        relation: 'Ayah dari Siti (5 tahun)',
        text: 'Kelas kecil jadi anak saya lebih percaya diri bertanya. Guru-gurunya juga selalu kasih feedback setelah kelas. Recommended banget!',
        rating: 5,
      },
      {
        name: 'Ibu Dewi',
        relation: 'Ibu dari Budi (9 tahun)',
        text: 'Praktis banget! Gak perlu antar-jemput. Anak belajar dari rumah lewat Google Meet, tapi tetap interaktif. Nilai matematikanya naik!',
        rating: 5,
      },
    ],
  },
  cta: {
    cta_title: 'Siap Belajar Live?',
    cta_subtitle: 'Daftar sekarang dan dapatkan 1 kelas gratis via Google Meet!',
    cta_button_text: 'Daftar Gratis Sekarang!',
  },
  meta: {
    meta_title: 'Djuniors - Kelas Matematika Live Interaktif untuk Anak!',
    meta_description: 'Kelas online matematika live interaktif untuk anak TK & SD via Google Meet.',
    meta_keywords: 'matematika anak, kelas online live, Google Meet, TK, SD',
  },
  style: {
    primary_color: '#4A90D9',
    secondary_color: '#FFD93D',
    accent_color: '#FF6B35',
    font_heading: 'Baloo 2',
    font_body: 'Nunito',
  },
};

type TabKey =
  | 'header'
  | 'hero'
  | 'features'
  | 'classes'
  | 'testimonials'
  | 'cta'
  | 'footer'
  | 'meta'
  | 'style'
  | 'media';

// Reusable Media Upload Component with Drag & Drop, Preview before upload, and Loading State
interface MediaUploadCardProps {
  title: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  description: string;
  accept: string;
  fileType: 'logo' | 'favicon' | 'hero_image';
  currentActiveFile?: CMSFile | null;
  historyFiles?: CMSFile[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string, name: string) => Promise<void>;
  onToggleActive?: (file: CMSFile) => Promise<void>;
  isUploading: boolean;
}

const MediaUploadCard: React.FC<MediaUploadCardProps> = ({
  title,
  badge,
  badgeBg,
  badgeColor,
  description,
  accept,
  fileType,
  currentActiveFile,
  historyFiles = [],
  onUpload,
  onDelete,
  onToggleActive,
  isUploading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleClearPreview = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExecuteUpload = async () => {
    if (!selectedFile) return;
    await onUpload(selectedFile);
    handleClearPreview();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ backgroundColor: badgeBg, color: badgeColor, padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>{badge}</span>
            {title}
          </h4>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
            {description}
          </p>
        </div>
      </div>

      {/* Upload & Drag Drop Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {!selectedFile ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileSelect(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: isDragging ? `2px dashed ${badgeColor}` : '2px dashed #CBD5E1',
              backgroundColor: isDragging ? '#F8FAFC' : '#FAFAFA',
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              style={{ display: 'none' }}
              disabled={isUploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: badgeBg, color: badgeColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Upload size={20} />
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                Tarik & lepas file di sini, atau <span style={{ color: badgeColor, textDecoration: 'underline' }}>pilih file</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                Format didukung: {accept.replace(/\./g, ' ').toUpperCase()} (Maks. 5MB)
              </div>
            </div>
          </div>
        ) : (
          /* Preview before upload */
          <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {previewUrl && (
                  <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                )}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', marginBottom: '2px' }}>
                  ✓ Pratinjau Siap Diunggah
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {selectedFile.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <button
                type="button"
                onClick={handleClearPreview}
                disabled={isUploading}
                style={{
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#64748B',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteUpload}
                disabled={isUploading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.5rem 1.15rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: badgeColor,
                  color: '#FFFFFF',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  boxShadow: `0 2px 8px ${badgeColor}40`,
                }}
              >
                {isUploading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={15} />}
                <span>{isUploading ? 'Mengunggah...' : 'Upload ke Server'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Current Active File Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', backgroundColor: '#F8FAFC', padding: '1rem', borderRadius: '10px', border: '1px dashed #CBD5E1' }}>
          <div
            style={{
              width: fileType === 'favicon' ? '44px' : '90px',
              height: fileType === 'favicon' ? '44px' : '50px',
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {currentActiveFile ? (
              <img src={currentActiveFile.file_url} alt={title} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: fileType === 'hero_image' ? '1.8rem' : '0.8rem', color: '#94A3B8', fontWeight: 700 }}>
                {fileType === 'hero_image' ? '👩‍🏫' : fileType === 'favicon' ? '🧮' : 'Default Text'}
              </span>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#1E293B' }}>
                {currentActiveFile ? currentActiveFile.name : `Default ${title}`}
              </span>
              {currentActiveFile && (
                <span style={{ backgroundColor: '#DEF7EC', color: '#03543F', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '12px' }}>
                  Sedang Aktif
                </span>
              )}
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentActiveFile ? `URL: ${currentActiveFile.file_url}` : 'Menggunakan asset bawaan website.'}
            </p>
          </div>
          {currentActiveFile && (
            <button
              type="button"
              onClick={() => onDelete(currentActiveFile.id, currentActiveFile.name)}
              title={`Hapus ${title}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #FCA5A5',
                backgroundColor: '#FEF2F2',
                color: '#EF4444',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Trash2 size={13} />
              <span>Hapus</span>
            </button>
          )}
        </div>

        {/* History of uploaded files */}
        {historyFiles.length > 0 && (
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>
              Riwayat {title} ({historyFiles.length})
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {historyFiles.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: item.is_active ? `2px solid ${badgeColor}` : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    backgroundColor: '#FFFFFF',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', borderRadius: '6px', overflow: 'hidden' }}>
                    <img src={item.file_url} alt={item.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    {onToggleActive && (
                      <button
                        type="button"
                        onClick={() => onToggleActive(item)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: item.is_active ? '#DEF7EC' : '#EFF6FF',
                          color: item.is_active ? '#03543F' : '#2563EB',
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        {item.is_active ? 'Aktif' : 'Gunakan'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(item.id, item.name)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '3px' }}
                      title="Hapus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const CMS: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('header');
  const [formData, setFormData] = useState<Record<string, Record<string, any>>>(DEFAULT_CMS);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState<boolean>(true);
  const [rawJsonMode, setRawJsonMode] = useState<boolean>(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Media & Icons State
  const [files, setFiles] = useState<CMSFile[]>([]);
  const [icons, setIcons] = useState<CMSIcon[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [selectedIconCategory, setSelectedIconCategory] = useState<string>('all');
  const [iconSearch, setIconSearch] = useState<string>('');
  const [copiedIconId, setCopiedIconId] = useState<string | null>(null);
  const [showAddIconModal, setShowAddIconModal] = useState<boolean>(false);
  const [newIcon, setNewIcon] = useState<{ name: string; category: string; svg_code: string }>({
    name: '',
    category: 'feature',
    svg_code: '',
  });
  const [selectedClassForUpload, setSelectedClassForUpload] = useState<string>('');

  // Class Image Local Drag & Preview State
  const [classImageFile, setClassImageFile] = useState<File | null>(null);
  const [classImagePreview, setClassImagePreview] = useState<string | null>(null);
  const [isClassDragging, setIsClassDragging] = useState<boolean>(false);
  const classFileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load content from API
  const loadCmsData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await cmsApi.getAll();
      if (res && res.items && Array.isArray(res.items)) {
        const grouped: Record<string, Record<string, any>> = JSON.parse(JSON.stringify(DEFAULT_CMS));

        for (const item of res.items) {
          if (!grouped[item.section]) {
            grouped[item.section] = {};
          }
          if (item.type === 'json') {
            try {
              grouped[item.section][item.key] = JSON.parse(item.value);
            } catch {
              grouped[item.section][item.key] = item.value;
            }
          } else {
            grouped[item.section][item.key] = item.value;
          }
        }
        setFormData(grouped);
      }
    } catch (err: any) {
      console.warn('Could not load CMS from API, using defaults:', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load Media & Icons Data
  const loadMediaData = useCallback(async () => {
    try {
      setLoadingMedia(true);
      const [filesRes, iconsRes, classesRes] = await Promise.allSettled([
        cmsFilesApi.getAll(),
        cmsIconsApi.getAll(),
        classesApi.getAll(),
      ]);

      if (filesRes.status === 'fulfilled' && filesRes.value?.files) {
        setFiles(filesRes.value.files);
      }
      if (iconsRes.status === 'fulfilled' && iconsRes.value?.icons) {
        setIcons(iconsRes.value.icons);
      }
      if (classesRes.status === 'fulfilled' && Array.isArray(classesRes.value)) {
        setClassesList(classesRes.value);
        if (classesRes.value.length > 0 && !selectedClassForUpload) {
          setSelectedClassForUpload(classesRes.value[0].id);
        }
      }
    } catch (err: any) {
      console.warn('Could not load media data:', err?.message);
    } finally {
      setLoadingMedia(false);
    }
  }, [selectedClassForUpload]);

  useEffect(() => {
    loadCmsData();
    loadMediaData();
  }, [loadCmsData, loadMediaData]);

  // Media Handlers
  const handleFileUpload = async (
    fileType: 'logo' | 'favicon' | 'hero_image' | 'class_image',
    fileObj: File,
    customMetadata?: any
  ) => {
    try {
      setIsUploading(fileType);
      const res = await cmsFilesApi.upload(fileObj, fileType, customMetadata);
      if (res.success) {
        showToast(`Berhasil mengunggah ${fileType}!`);
        await loadMediaData();
      }
    } catch (err: any) {
      showToast(err.message || `Gagal mengunggah ${fileType}`, 'error');
    } finally {
      setIsUploading(null);
    }
  };

  const handleDeleteFile = async (id: string, name: string) => {
    if (!window.confirm(`Hapus file "${name}"?`)) return;
    try {
      await cmsFilesApi.delete(id);
      showToast('File berhasil dihapus!');
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus file', 'error');
    }
  };

  const handleToggleActiveFile = async (file: CMSFile) => {
    try {
      const newActive = !file.is_active;
      await cmsFilesApi.update(file.id, { is_active: newActive });
      showToast(newActive ? `File "${file.name}" diaktifkan!` : `File "${file.name}" dinonaktifkan!`);
      await loadMediaData();
    } catch (err: any) {
      showToast(err.message || 'Gagal mengubah status file', 'error');
    }
  };

  const handleClassImageSelect = (file: File) => {
    setClassImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setClassImagePreview(objectUrl);
  };

  const handleClearClassImagePreview = () => {
    setClassImageFile(null);
    if (classImagePreview) {
      URL.revokeObjectURL(classImagePreview);
      setClassImagePreview(null);
    }
    if (classFileInputRef.current) {
      classFileInputRef.current.value = '';
    }
  };

  const handleUploadClassImage = async () => {
    if (!classImageFile) {
      showToast('Pilih file gambar kelas terlebih dahulu', 'error');
      return;
    }
    await handleFileUpload('class_image', classImageFile, { class_id: selectedClassForUpload });
    handleClearClassImagePreview();
  };

  const handleAddIcon = async () => {
    if (!newIcon.name.trim() || !newIcon.svg_code.trim()) {
      showToast('Nama icon dan kode SVG wajib diisi', 'error');
      return;
    }
    if (!newIcon.svg_code.includes('<svg') || !newIcon.svg_code.includes('</svg>')) {
      showToast('Kode SVG harus memiliki tag <svg> dan </svg> yang valid', 'error');
      return;
    }
    try {
      const res = await cmsIconsApi.create({
        name: newIcon.name.trim(),
        category: newIcon.category || 'feature',
        svg_code: newIcon.svg_code.trim(),
        is_active: 1,
      });
      if (res.success) {
        showToast('Icon SVG berhasil ditambahkan!');
        setShowAddIconModal(false);
        setNewIcon({ name: '', category: 'feature', svg_code: '' });
        await loadMediaData();
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal menambahkan icon', 'error');
    }
  };

  const handleDeleteIcon = async (id: string, name: string) => {
    if (!window.confirm(`Hapus icon "${name}"?`)) return;
    try {
      await cmsIconsApi.delete(id);
      showToast('Icon SVG berhasil dihapus!');
      setIcons((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus icon', 'error');
    }
  };

  const handleCopySvg = (svgCode: string, id: string, name: string) => {
    navigator.clipboard.writeText(svgCode);
    setCopiedIconId(id);
    setTimeout(() => setCopiedIconId(null), 2500);
    showToast(`Kode SVG "${name}" berhasil disalin ke clipboard!`);
  };

  // Update a single field in the current active tab
  const updateField = (tab: TabKey, key: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [tab]: {
        ...(prev[tab] || {}),
        [key]: value,
      },
    }));
  };

  // Save active tab or all tabs
  const handleSave = async (tabToSave?: TabKey) => {
    try {
      setIsSaving(true);
      const targetTabs: TabKey[] = tabToSave ? [tabToSave] : (Object.keys(formData) as TabKey[]);

      const itemsToUpdate: Array<{ section: string; key: string; value: any; type?: string }> = [];
      const settingsToUpdate: Array<{ key: string; value: string; category?: string }> = [];

      for (const sec of targetTabs) {
        if (sec === 'media') continue;
        const secData = formData[sec] || {};
        for (const [key, val] of Object.entries(secData)) {
          const isObj = typeof val === 'object' && val !== null;
          const isColor = key.includes('color');
          const itemType = isObj ? 'json' : isColor ? 'color' : 'text';

          itemsToUpdate.push({
            section: sec,
            key,
            value: val,
            type: itemType,
          });

          if (sec === 'meta' || sec === 'style' || key === 'site_name' || key === 'logo_text') {
            settingsToUpdate.push({
              key,
              value: typeof val === 'string' ? val : JSON.stringify(val),
              category: sec === 'meta' ? 'seo' : sec === 'style' ? 'style' : 'general',
            });
          }
        }
      }

      if (itemsToUpdate.length > 0) {
        await cmsApi.bulkUpdate(itemsToUpdate);
      }

      if (settingsToUpdate.length > 0) {
        await cmsApi.bulkUpdateSettings(settingsToUpdate);
      }

      showToast(`Konten ${tabToSave ? tabToSave.toUpperCase() : 'CMS'} berhasil disimpan ke database!`);
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan perubahan CMS', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = (tab: TabKey) => {
    if (tab === 'media') {
      loadMediaData();
      showToast('Media & Icons diperbarui dari server.');
      return;
    }
    if (window.confirm(`Kembalikan pengaturan tab "${tab}" ke default?`)) {
      setFormData((prev) => ({
        ...prev,
        [tab]: JSON.parse(JSON.stringify(DEFAULT_CMS[tab] || {})),
      }));
      showToast(`Tab ${tab} di-reset ke nilai default.`);
    }
  };

  // Helpers for array editors
  const handleAddNavItem = () => {
    const currentList = Array.isArray(formData.header?.nav_items) ? formData.header.nav_items : [];
    updateField('header', 'nav_items', [...currentList, { label: 'Menu Baru', href: '#menu' }]);
  };

  const handleRemoveNavItem = (index: number) => {
    const currentList = Array.isArray(formData.header?.nav_items) ? [...formData.header.nav_items] : [];
    currentList.splice(index, 1);
    updateField('header', 'nav_items', currentList);
  };

  const handleUpdateNavItem = (index: number, field: 'label' | 'href', val: string) => {
    const currentList = Array.isArray(formData.header?.nav_items) ? [...formData.header.nav_items] : [];
    if (currentList[index]) {
      currentList[index] = { ...currentList[index], [field]: val };
      updateField('header', 'nav_items', currentList);
    }
  };

  const handleAddFeatureItem = () => {
    const currentList = Array.isArray(formData.features?.features_items) ? formData.features.features_items : [];
    updateField('features', 'features_items', [
      ...currentList,
      { icon: '⭐', title: 'Fitur Baru', description: 'Deskripsi keunggulan kelas Djuniors.' },
    ]);
  };

  const handleRemoveFeatureItem = (index: number) => {
    const currentList = Array.isArray(formData.features?.features_items) ? [...formData.features.features_items] : [];
    currentList.splice(index, 1);
    updateField('features', 'features_items', currentList);
  };

  const handleUpdateFeatureItem = (index: number, field: string, val: string) => {
    const currentList = Array.isArray(formData.features?.features_items) ? [...formData.features.features_items] : [];
    if (currentList[index]) {
      currentList[index] = { ...currentList[index], [field]: val };
      updateField('features', 'features_items', currentList);
    }
  };

  const handleAddTestimonial = () => {
    const currentList = Array.isArray(formData.testimonials?.testimonials_items) ? formData.testimonials.testimonials_items : [];
    updateField('testimonials', 'testimonials_items', [
      ...currentList,
      {
        name: 'Nama Orang Tua',
        relation: 'Orang tua siswa',
        text: 'Pengalaman seru dan menyenangkan belajar matematika di Djuniors!',
        rating: 5,
      },
    ]);
  };

  const handleRemoveTestimonial = (index: number) => {
    const currentList = Array.isArray(formData.testimonials?.testimonials_items) ? [...formData.testimonials.testimonials_items] : [];
    currentList.splice(index, 1);
    updateField('testimonials', 'testimonials_items', currentList);
  };

  const handleUpdateTestimonial = (index: number, field: string, val: any) => {
    const currentList = Array.isArray(formData.testimonials?.testimonials_items) ? [...formData.testimonials.testimonials_items] : [];
    if (currentList[index]) {
      currentList[index] = { ...currentList[index], [field]: val };
      updateField('testimonials', 'testimonials_items', currentList);
    }
  };

  // Tabs Definition - Tab Media & Icons is placed after Style & Tema
  const tabs: Array<{ id: TabKey; label: string; icon: React.ElementType; color: string }> = [
    { id: 'header', label: 'Header & Nav', icon: Heading, color: '#4A90D9' },
    { id: 'hero', label: 'Hero Banner', icon: Sparkles, color: '#FF6B35' },
    { id: 'features', label: 'Fitur', icon: Award, color: '#10B981' },
    { id: 'classes', label: 'Section Kelas', icon: BookOpen, color: '#F59E0B' },
    { id: 'testimonials', label: 'Testimoni', icon: MessageSquareQuote, color: '#EC4899' },
    { id: 'cta', label: 'Call To Action', icon: Megaphone, color: '#EA580C' },
    { id: 'footer', label: 'Footer & Kontak', icon: Footprints, color: '#64748B' },
    { id: 'meta', label: 'Meta SEO', icon: Globe, color: '#0EA5E9' },
    { id: 'style', label: 'Style & Tema', icon: Palette, color: '#6366F1' },
    { id: 'media', label: 'Media & Icons', icon: ImageIcon, color: '#8B5CF6' },
  ];

  // Active files helper
  const activeLogo = files.find((f) => f.file_type === 'logo' && f.is_active);
  const logoFiles = files.filter((f) => f.file_type === 'logo');

  const activeFavicon = files.find((f) => f.file_type === 'favicon' && f.is_active);
  const faviconFiles = files.filter((f) => f.file_type === 'favicon');

  const activeHero = files.find((f) => f.file_type === 'hero_image' && f.is_active);
  const heroFiles = files.filter((f) => f.file_type === 'hero_image');

  const classImages = files.filter((f) => f.file_type === 'class_image');

  // Categories list for Icon Library
  const iconCategories = [
    { id: 'all', label: 'Semua Icon' },
    { id: 'feature', label: '⭐ Fitur' },
    { id: 'class', label: '📚 Kelas' },
    { id: 'nav', label: '🧭 Navigasi' },
    { id: 'social', label: '🌐 Sosial' },
    { id: 'math', label: '🧮 Matematika' },
    { id: 'kids', label: '🚀 Anak' },
    { id: 'education', label: '🎓 Edukasi' },
  ];


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontFamily: "'Nunito', sans-serif", width: '100%', minWidth: 0, maxWidth: '100%' }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 100,
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div
        className="cms-header-box"
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
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
              <LayoutTemplate size={13} /> CMS Landing Page
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
            Pengaturan Konten & Tampilan Web
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Kelola teks hero, fitur, judul kelas, testimoni, tombol CTA, footer, meta SEO, dan warna tema landing page.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{showPreview ? 'Sembunyikan Preview' : 'Tampilkan Preview'}</span>
          </button>

          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.65rem 1rem',
              borderRadius: '10px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '0.875rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={16} />
            <span>Lihat Website</span>
          </a>

          <button
            onClick={() => handleSave(activeTab)}
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.65rem 1.4rem',
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
            <Save size={16} />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Tab Ini'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div
        className="cms-tabs-bar"
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '0.5rem',
          overflowX: 'auto',
          maxWidth: '100%',
          minWidth: 0,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.65rem 1.15rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: isActive ? t.color : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#475569',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                boxShadow: isActive ? `0 4px 12px ${t.color}40` : 'none',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Form and Preview Layout */}
      <div
        className="cms-main-layout"
        style={{
          display: 'grid',
          gridTemplateColumns: showPreview ? '1.2fr 0.8fr' : '1fr',
          gap: '1.5rem',
          alignItems: 'start',
          minWidth: 0,
        }}
      >
        {/* Left Form Column */}
        <div
          className="cms-form-card"
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            padding: '1.75rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            minWidth: 0,
            maxWidth: '100%',
          }}
        >
          {/* Active Tab Title & Action Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', margin: 0, color: '#1E293B' }}>
                {tabs.find((t) => t.id === activeTab)?.label}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                Sesuaikan teks, gambar, dan elemen tampilan untuk bagian ini.
              </p>
            </div>
            <button
              className="btn-touch-sm"
              onClick={() => handleReset(activeTab)}
              title="Reset ke Default"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                color: '#64748B',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} />
              <span>Reset Default</span>
            </button>
          </div>

          {/* Form Content per Tab */}
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              Memuat data CMS...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* TAB 1: HEADER */}
              {activeTab === 'header' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Nama Website (Site Name)
                    </label>
                    <input
                      type="text"
                      value={formData.header?.site_name || ''}
                      onChange={(e) => updateField('header', 'site_name', e.target.value)}
                      placeholder="Djuniors"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Logo Text (Nama Brand di Navbar)
                    </label>
                    <input
                      type="text"
                      value={formData.header?.logo_text || ''}
                      onChange={(e) => updateField('header', 'logo_text', e.target.value)}
                      placeholder="Djuniors"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Teks Tombol CTA Navbar
                    </label>
                    <input
                      type="text"
                      value={formData.header?.cta_button_text || ''}
                      onChange={(e) => updateField('header', 'cta_button_text', e.target.value)}
                      placeholder="Daftar Sekarang"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                    />
                  </div>

                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1E293B' }}>
                        Menu Navigasi ({Array.isArray(formData.header?.nav_items) ? formData.header.nav_items.length : 0})
                      </label>
                      <button
                        type="button"
                        className="btn-touch-sm"
                        onClick={handleAddNavItem}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#4A90D9',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} /> Tambah Menu
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {Array.isArray(formData.header?.nav_items) &&
                        formData.header.nav_items.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="cms-nav-row"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1.2fr 1.2fr 40px',
                              gap: '0.5rem',
                              alignItems: 'center',
                              backgroundColor: '#F8FAFC',
                              padding: '0.5rem 0.75rem',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                            }}
                          >
                            <input
                              type="text"
                              value={item.label || ''}
                              onChange={(e) => handleUpdateNavItem(idx, 'label', e.target.value)}
                              placeholder="Nama Label (e.g. Fitur)"
                              style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 700, fontSize: '0.85rem' }}
                            />
                            <input
                              type="text"
                              value={item.href || ''}
                              onChange={(e) => handleUpdateNavItem(idx, 'href', e.target.value)}
                              placeholder="Link Target (e.g. #features)"
                              style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                            />
                            <button
                              type="button"
                              className="btn-touch-sm"
                              onClick={() => handleRemoveNavItem(idx)}
                              title="Hapus Menu"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#EF4444',
                                cursor: 'pointer',
                                padding: '4px',
                                minHeight: '34px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 2: HERO SECTION */}
              {activeTab === 'hero' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Badge Text / Emoji di Atas Judul
                    </label>
                    <input
                      type="text"
                      value={formData.hero?.hero_badge || ''}
                      onChange={(e) => updateField('hero', 'hero_badge', e.target.value)}
                      placeholder="🎯 Diskon Khusus Bulan Ini!"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Judul Utama Hero (Hero Title)
                    </label>
                    <textarea
                      rows={2}
                      value={formData.hero?.hero_title || ''}
                      onChange={(e) => updateField('hero', 'hero_title', e.target.value)}
                      placeholder="Kelas Matematika Live Interaktif untuk Anak!"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Subjudul Hero (Subtitle / Deskripsi Singkat)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.hero?.hero_subtitle || ''}
                      onChange={(e) => updateField('hero', 'hero_subtitle', e.target.value)}
                      placeholder="Belajar matematika langsung dengan guru via Google Meet."
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Teks Tombol CTA Hero
                      </label>
                      <input
                        type="text"
                        value={formData.hero?.hero_cta_text || ''}
                        onChange={(e) => updateField('hero', 'hero_cta_text', e.target.value)}
                        placeholder="Daftar Kelas Gratis!"
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Link Tombol CTA Hero
                      </label>
                      <input
                        type="text"
                        value={formData.hero?.hero_cta_link || ''}
                        onChange={(e) => updateField('hero', 'hero_cta_link', e.target.value)}
                        placeholder="daftar.html"
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TAB 3: FEATURES */}
              {activeTab === 'features' && (

                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Judul Section Fitur
                    </label>
                    <input
                      type="text"
                      value={formData.features?.features_title || ''}
                      onChange={(e) => updateField('features', 'features_title', e.target.value)}
                      placeholder="Kenapa Pilih Djuniors?"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Subjudul Section Fitur
                    </label>
                    <input
                      type="text"
                      value={formData.features?.features_subtitle || ''}
                      onChange={(e) => updateField('features', 'features_subtitle', e.target.value)}
                      placeholder="Kelas live interaktif yang bikin anak ketagihan belajar!"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                    />
                  </div>

                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1E293B' }}>
                        Daftar Poin Keunggulan / Fitur
                      </label>
                      <button
                        type="button"
                        className="btn-touch-sm"
                        onClick={handleAddFeatureItem}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} /> Tambah Fitur
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {Array.isArray(formData.features?.features_items) &&
                        formData.features.features_items.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: '#F8FAFC',
                              padding: '0.85rem',
                              borderRadius: '10px',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                            }}
                          >
                            <div className="cms-feature-row" style={{ display: 'grid', gridTemplateColumns: '140px 1fr 30px', gap: '0.5rem', alignItems: 'center' }}>
                              <IconPicker
                                value={item.icon || ''}
                                onChange={(val) => handleUpdateFeatureItem(idx, 'icon', val)}
                                placeholder="Pilih Icon..."
                                type="emoji"
                                size="sm"
                              />
                              <input
                                type="text"
                                value={item.title || ''}
                                onChange={(e) => handleUpdateFeatureItem(idx, 'title', e.target.value)}
                                placeholder="Judul Fitur"
                                style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 700, fontSize: '0.875rem' }}
                              />
                              <button
                                type="button"
                                className="btn-touch-sm"
                                onClick={() => handleRemoveFeatureItem(idx)}
                                title="Hapus Fitur"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  minWidth: '34px',
                                  minHeight: '34px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={item.description || ''}
                              onChange={(e) => handleUpdateFeatureItem(idx, 'description', e.target.value)}
                              placeholder="Deskripsi detail fitur..."
                              style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.825rem', resize: 'vertical' }}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 4: CLASSES SECTION HEADER */}
              {activeTab === 'classes' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Judul Section Kelas
                    </label>
                    <input
                      type="text"
                      value={formData.classes?.classes_title || ''}
                      onChange={(e) => updateField('classes', 'classes_title', e.target.value)}
                      placeholder="Pilihan Kelas & Jadwal"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Subjudul Section Kelas
                    </label>
                    <textarea
                      rows={3}
                      value={formData.classes?.classes_subtitle || ''}
                      onChange={(e) => updateField('classes', 'classes_subtitle', e.target.value)}
                      placeholder="Pilih kelas yang sesuai dengan usia dan jadwal belajar anak Anda!"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  <div style={{ backgroundColor: '#EFF6FF', padding: '1rem', borderRadius: '10px', border: '1px solid #BFDBFE' }}>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#1E40AF' }}>
                      💡 <strong>Catatan:</strong> Data list kelas, harga, dan jadwal dikelola secara dinamis di menu{' '}
                      <strong>Kelas</strong> & <strong>Level Kelas</strong>.
                    </p>
                  </div>
                </>
              )}

              {/* TAB 5: TESTIMONIALS */}
              {activeTab === 'testimonials' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Judul Section Testimoni
                    </label>
                    <input
                      type="text"
                      value={formData.testimonials?.testimonials_title || ''}
                      onChange={(e) => updateField('testimonials', 'testimonials_title', e.target.value)}
                      placeholder="Kata Orang Tua"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Subjudul Section Testimoni
                    </label>
                    <input
                      type="text"
                      value={formData.testimonials?.testimonials_subtitle || ''}
                      onChange={(e) => updateField('testimonials', 'testimonials_subtitle', e.target.value)}
                      placeholder="Mereka sudah membuktikan anak jadi semangat belajar!"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                    />
                  </div>

                  <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.875rem', fontWeight: 800, color: '#1E293B' }}>
                        Daftar Testimoni ({Array.isArray(formData.testimonials?.testimonials_items) ? formData.testimonials.testimonials_items.length : 0})
                      </label>
                      <button
                        type="button"
                        className="btn-touch-sm"
                        onClick={handleAddTestimonial}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#EC4899',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={14} /> Tambah Testimoni
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {Array.isArray(formData.testimonials?.testimonials_items) &&
                        formData.testimonials.testimonials_items.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: '#F8FAFC',
                              padding: '0.85rem',
                              borderRadius: '10px',
                              border: '1px solid #E2E8F0',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.5rem',
                            }}
                          >
                            <div className="cms-testimonial-row" style={{ display: 'grid', gridTemplateColumns: '130px 1.2fr 1.2fr 70px 30px', gap: '0.5rem', alignItems: 'center' }}>
                              <IconPicker
                                value={item.avatar || '👩'}
                                onChange={(val) => handleUpdateTestimonial(idx, 'avatar', val)}
                                placeholder="Avatar..."
                                type="emoji"
                                size="sm"
                              />
                              <input
                                type="text"
                                value={item.name || ''}
                                onChange={(e) => handleUpdateTestimonial(idx, 'name', e.target.value)}
                                placeholder="Nama Orang Tua"
                                style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 700, fontSize: '0.85rem' }}
                              />
                              <input
                                type="text"
                                value={item.relation || ''}
                                onChange={(e) => handleUpdateTestimonial(idx, 'relation', e.target.value)}
                                placeholder="Hubungan (Ibu dari Rizky 7th)"
                                style={{ padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                              />
                              <select
                                value={item.rating || 5}
                                onChange={(e) => handleUpdateTestimonial(idx, 'rating', Number(e.target.value))}
                                style={{ padding: '0.45rem 0.4rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.85rem' }}
                              >
                                <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                                <option value={4}>⭐⭐⭐⭐ (4)</option>
                                <option value={3}>⭐⭐⭐ (3)</option>
                              </select>
                              <button
                                type="button"
                                className="btn-touch-sm"
                                onClick={() => handleRemoveTestimonial(idx)}
                                title="Hapus Testimoni"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#EF4444',
                                  cursor: 'pointer',
                                  padding: '4px',
                                  minWidth: '34px',
                                  minHeight: '34px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={item.text || ''}
                              onChange={(e) => handleUpdateTestimonial(idx, 'text', e.target.value)}
                              placeholder="Isi ulasan / kata orang tua..."
                              style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.825rem', resize: 'vertical' }}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )}

              {/* TAB 6: CTA */}
              {activeTab === 'cta' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Judul CTA (Call To Action)
                    </label>
                    <input
                      type="text"
                      value={formData.cta?.cta_title || ''}
                      onChange={(e) => updateField('cta', 'cta_title', e.target.value)}
                      placeholder="Siap Belajar Live?"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Subjudul / Deskripsi CTA
                    </label>
                    <textarea
                      rows={3}
                      value={formData.cta?.cta_subtitle || ''}
                      onChange={(e) => updateField('cta', 'cta_subtitle', e.target.value)}
                      placeholder="Daftar sekarang dan dapatkan 1 kelas gratis via Google Meet!"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Teks Tombol CTA
                    </label>
                    <input
                      type="text"
                      value={formData.cta?.cta_button_text || ''}
                      onChange={(e) => updateField('cta', 'cta_button_text', e.target.value)}
                      placeholder="Daftar Gratis Sekarang!"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                    />
                  </div>
                </>
              )}

              {/* TAB 7: FOOTER */}
              {activeTab === 'footer' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Tagline / Deskripsi Singkat Footer
                    </label>
                    <textarea
                      rows={2}
                      value={formData.footer?.footer_tagline || ''}
                      onChange={(e) => updateField('footer', 'footer_tagline', e.target.value)}
                      placeholder="Belajar matematika jadi seru untuk anak Indonesia!"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Email Footer
                      </label>
                      <input
                        type="email"
                        value={formData.footer?.footer_email || ''}
                        onChange={(e) => updateField('footer', 'footer_email', e.target.value)}
                        placeholder="hello@djuniors.id"
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Telepon / WhatsApp Footer
                      </label>
                      <input
                        type="text"
                        value={formData.footer?.footer_phone || ''}
                        onChange={(e) => updateField('footer', 'footer_phone', e.target.value)}
                        placeholder="081234567890"
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Alamat / Lokasi Footer
                    </label>
                    <input
                      type="text"
                      value={formData.footer?.footer_address || ''}
                      onChange={(e) => updateField('footer', 'footer_address', e.target.value)}
                      placeholder="Jakarta, Indonesia"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Teks Hak Cipta (Copyright)
                    </label>
                    <input
                      type="text"
                      value={formData.footer?.copyright || ''}
                      onChange={(e) => updateField('footer', 'copyright', e.target.value)}
                      placeholder="2026 Djuniors"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                    />
                  </div>

                  {/* === Social Links editor (icons rendered in footer) === */}
                  <div style={{ marginTop: '0.5rem', padding: '1rem', borderRadius: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#1E293B' }}>
                          🔗 Tautan Media Sosial Footer
                        </h4>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                          Atur ikon media sosial yang muncul di footer landing page.
                          Biarkan URL kosong untuk menyembunyikan platform.
                        </p>
                      </div>
                      {/* Add link: pick a platform from the dropdown — the
                          official brand icon is applied automatically. */}
                      <select
                        value=""
                        onChange={(e) => {
                          const pid = e.target.value;
                          if (!pid) return;
                          const meta = SOCIAL_PLATFORM_MAP[pid];
                          const links = Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : [];
                          // Default label from the platform name (still editable).
                          const next = [...links, {
                            platform: pid,
                            label: meta ? `Djuniors di ${meta.name}` : pid,
                            url: '',
                            icon: meta ? pid : '🔗',
                            order: links.length + 1,
                          }];
                          updateField('footer', 'social_links', next);
                          // reset so the same platform can be picked again later
                          e.target.value = '';
                        }}
                        style={{
                          padding: '0.4rem 0.6rem',
                          borderRadius: '8px',
                          border: '1px solid #0EA5E9',
                          background: '#FFFFFF',
                          color: '#0EA5E9',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                        title="Pilih platform sosial media untuk ditambahkan — ikon resmi otomatis dipakai"
                      >
                        <option value="">+ Tambah Platform…</option>
                        {SOCIAL_PLATFORMS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : []).length === 0 && (
                      <p style={{ fontSize: '0.85rem', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', padding: '1.5rem 0' }}>
                        Belum ada tautan. Klik "Tambah Tautan" untuk memulai.
                      </p>
                    )}

                    <div style={{ display: 'grid', gap: '0.65rem' }}>
                      {(Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : [])
                        .slice()
                        .sort((a, b) => (a?.order || 99) - (b?.order || 99))
                        .map((link, idx) => (
                          <div
                            key={`${link.platform}-${idx}`}
                            className="cms-social-row"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'minmax(150px, 190px) minmax(130px, 1fr) 1.5fr 50px 50px',
                              gap: '0.45rem',
                              alignItems: 'center',
                              padding: '0.55rem 0.65rem',
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '8px',
                            }}
                          >
                            {/* Platform picker — selecting a platform applies the
                                official brand icon automatically. One control
                                replaces the old emoji + platform-id inputs. */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span
                                title={isKnownPlatform(link.platform) ? `Ikon resmi ${SOCIAL_PLATFORM_MAP[link.platform]?.name}` : 'Ikon kustom (emoji)'}
                                style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', background: '#1E293B', flexShrink: 0 }}
                              >
                                {isKnownPlatform(link.platform) ? (
                                  <SocialBrandIcon platform={link.platform} size={18} />
                                ) : (
                                  <span style={{ fontSize: '1.05rem' }}>{link.icon || '🔗'}</span>
                                )}
                              </span>
                              <select
                                value={isKnownPlatform(link.platform) ? link.platform : 'custom'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const links = Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : [];
                                  const next = [...links];
                                  const origIdx = links.indexOf(link);
                                  if (val === 'custom') {
                                    next[origIdx] = { ...next[origIdx], platform: 'new-platform', icon: link.icon || '🔗' };
                                  } else {
                                    next[origIdx] = { ...next[origIdx], platform: val, icon: val };
                                  }
                                  updateField('footer', 'social_links', next);
                                }}
                                title="Pilih platform — ikon resmi otomatis diterapkan"
                                style={{ width: '100%', padding: '0.4rem 0.45rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', background: '#FFFFFF' }}
                              >
                                {SOCIAL_PLATFORMS.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                                <option value="custom">Lainnya (emoji manual)</option>
                              </select>
                            </div>
                            {/* Display label */}
                            <input
                              type="text"
                              value={link.label || ''}
                              maxLength={48}
                              onChange={(e) => {
                                const links = Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : [];
                                const next = [...links];
                                const origIdx = links.indexOf(link);
                                next[origIdx] = { ...next[origIdx], label: e.target.value };
                                updateField('footer', 'social_links', next);
                              }}
                              title="Label untuk tooltip & aksesibilitas"
                              placeholder="Label tampilan"
                              style={{ width: '100%', padding: '0.4rem 0.55rem', fontSize: '0.825rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none' }}
                            />
                            {/* URL */}
                            <input
                              type="url"
                              value={link.url || ''}
                              onChange={(e) => {
                                const links = Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : [];
                                const next = [...links];
                                const origIdx = links.indexOf(link);
                                next[origIdx] = { ...next[origIdx], url: e.target.value };
                                updateField('footer', 'social_links', next);
                              }}
                              title="URL lengkap — kosongkan untuk menyembunyikan"
                              placeholder="https://..."
                              style={{ width: '100%', padding: '0.4rem 0.55rem', fontSize: '0.825rem', borderRadius: '6px', border: '1px solid #CBD5E1', outline: 'none', fontFamily: 'monospace' }}
                            />
                            {/* Order (up/down buttons) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  const links = Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : [];
                                  const sorted = [...links].sort((a, b) => (a.order || 99) - (b.order || 99));
                                  if (idx === 0) return;
                                  [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
                                  // Reassign order 1..N
                                  const renum = sorted.map((l, i) => ({ ...l, order: i + 1 }));
                                  updateField('footer', 'social_links', renum);
                                }}
                                title="Naikkan urutan"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid #CBD5E1', background: idx === 0 ? '#F1F5F9' : '#FFFFFF', color: idx === 0 ? '#CBD5E1' : '#475569', cursor: idx === 0 ? 'not-allowed' : 'pointer', minHeight: '18px' }}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                disabled={idx === (Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : []).length - 1}
                                onClick={() => {
                                  const links = Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : [];
                                  const sorted = [...links].sort((a, b) => (a.order || 99) - (b.order || 99));
                                  if (idx === sorted.length - 1) return;
                                  [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
                                  const renum = sorted.map((l, i) => ({ ...l, order: i + 1 }));
                                  updateField('footer', 'social_links', renum);
                                }}
                                title="Turunkan urutan"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem', borderRadius: '4px', border: '1px solid #CBD5E1', background: idx === (Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : []).length - 1 ? '#F1F5F9' : '#FFFFFF', color: idx === (Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : []).length - 1 ? '#CBD5E1' : '#475569', cursor: idx === (Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : []).length - 1 ? 'not-allowed' : 'pointer', minHeight: '18px' }}
                              >
                                ▼
                              </button>
                            </div>
                            {/* Remove */}
                            <button
                              type="button"
                              className="btn-touch-sm"
                              onClick={() => {
                                const links = Array.isArray(formData.footer?.social_links) ? formData.footer.social_links : [];
                                const next = links.filter((l) => l !== link);
                                updateField('footer', 'social_links', next);
                              }}
                              title="Hapus tautan"
                              style={{
                                padding: '0.4rem',
                                fontSize: '0.85rem',
                                borderRadius: '6px',
                                border: '1px solid #FECACA',
                                background: '#FEF2F2',
                                color: '#B91C1C',
                                cursor: 'pointer',
                                fontWeight: 600,
                                minWidth: '34px',
                                minHeight: '34px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                    </div>

                    <p style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.6rem', marginBottom: 0 }}>
                      💡 Tip: pilih platform dari dropdown — ikon resmi (Facebook, Instagram, TikTok, YouTube, WhatsApp, Telegram, X, LinkedIn, Threads, Discord) otomatis dipakai di landing page. Pilih "Lainnya" hanya untuk platform tak terdaftar (ikon emoji manual).
                      Setiap perubahan disimpan saat klik tombol <strong>Simpan Pengaturan Footer</strong>.
                    </p>
                  </div>
                </>
              )}

              {/* TAB 8: META / SEO */}
              {activeTab === 'meta' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Meta Title (Judul Tab Browser & Google Search)
                    </label>
                    <input
                      type="text"
                      value={formData.meta?.meta_title || ''}
                      onChange={(e) => updateField('meta', 'meta_title', e.target.value)}
                      placeholder="Djuniors - Kelas Matematika Live Interaktif untuk Anak!"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Meta Description (Deskripsi Cuplikan Mesin Pencari)
                    </label>
                    <textarea
                      rows={3}
                      value={formData.meta?.meta_description || ''}
                      onChange={(e) => updateField('meta', 'meta_description', e.target.value)}
                      placeholder="Kelas online matematika live interaktif untuk anak TK & SD via Google Meet."
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                      Meta Keywords (Kata Kunci Dipisah Koma)
                    </label>
                    <input
                      type="text"
                      value={formData.meta?.meta_keywords || ''}
                      onChange={(e) => updateField('meta', 'meta_keywords', e.target.value)}
                      placeholder="matematika anak, kelas online live, Google Meet, TK, SD"
                      style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                    />
                  </div>
                </>
              )}

              {/* TAB 9: STYLE */}
              {activeTab === 'style' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Warna Utama (Primary)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="color"
                          value={formData.style?.primary_color || '#4A90D9'}
                          onChange={(e) => updateField('style', 'primary_color', e.target.value)}
                          style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', cursor: 'pointer', padding: 0 }}
                        />
                        <input
                          type="text"
                          value={formData.style?.primary_color || '#4A90D9'}
                          onChange={(e) => updateField('style', 'primary_color', e.target.value)}
                          style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Warna Sekunder (Secondary)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="color"
                          value={formData.style?.secondary_color || '#FFD93D'}
                          onChange={(e) => updateField('style', 'secondary_color', e.target.value)}
                          style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', cursor: 'pointer', padding: 0 }}
                        />
                        <input
                          type="text"
                          value={formData.style?.secondary_color || '#FFD93D'}
                          onChange={(e) => updateField('style', 'secondary_color', e.target.value)}
                          style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Warna Aksen (Accent)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="color"
                          value={formData.style?.accent_color || '#FF6B35'}
                          onChange={(e) => updateField('style', 'accent_color', e.target.value)}
                          style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px solid #CBD5E1', cursor: 'pointer', padding: 0 }}
                        />
                        <input
                          type="text"
                          value={formData.style?.accent_color || '#FF6B35'}
                          onChange={(e) => updateField('style', 'accent_color', e.target.value)}
                          style={{ flex: 1, padding: '0.55rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontFamily: 'monospace' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Font Judul (Heading Font)
                      </label>
                      <select
                        value={formData.style?.font_heading || 'Baloo 2'}
                        onChange={(e) => updateField('style', 'font_heading', e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                      >
                        <option value="Baloo 2">Baloo 2 (Ceria & Modern)</option>
                        <option value="Nunito">Nunito</option>
                        <option value="Poppins">Poppins</option>
                        <option value="Fredoka">Fredoka</option>
                        <option value="Quicksand">Quicksand</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                        Font Konten (Body Font)
                      </label>
                      <select
                        value={formData.style?.font_body || 'Nunito'}
                        onChange={(e) => updateField('style', 'font_body', e.target.value)}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                      >
                        <option value="Nunito">Nunito (Rekomendasi Anak)</option>
                        <option value="Inter">Inter</option>
                        <option value="Open Sans">Open Sans</option>
                        <option value="Roboto">Roboto</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* TAB 10: MEDIA & ICONS (SETELAH TAB STYLE & TEMA) */}
              {activeTab === 'media' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {/* Top Intro Notice */}
                  <div style={{ backgroundColor: '#F5F3FF', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ backgroundColor: '#8B5CF6', color: '#FFFFFF', padding: '8px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ImageIcon size={20} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#5B21B6' }}>
                          Pusat Media & Asset Visual Website
                        </h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#6D28D9' }}>
                          Kelola Logo, Favicon browser, Maskot/Hero Image, Foto kartu kelas, dan Pustaka Icon SVG interaktif.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={loadMediaData}
                      disabled={loadingMedia}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.5rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #DDD6FE',
                        backgroundColor: '#FFFFFF',
                        color: '#7C3AED',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: loadingMedia ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <RefreshCw size={14} style={{ animation: loadingMedia ? 'spin 1s linear infinite' : 'none' }} />
                      <span>{loadingMedia ? 'Memuat...' : 'Segarkan'}</span>
                    </button>
                  </div>

                  {/* 1. LOGO UPLOAD */}
                  <MediaUploadCard
                    title="Logo Utama Website"
                    badge="Navbar & Footer"
                    badgeBg="#EFF6FF"
                    badgeColor="#4A90D9"
                    description="Upload logo utama brand Djuniors untuk header navbar dan footer. Format didukung: PNG transparan, SVG, JPG, WEBP."
                    accept=".png,.svg,.jpg,.jpeg,.webp"
                    fileType="logo"
                    currentActiveFile={activeLogo}
                    historyFiles={logoFiles}
                    onUpload={(file) => handleFileUpload('logo', file)}
                    onDelete={handleDeleteFile}
                    onToggleActive={handleToggleActiveFile}
                    isUploading={isUploading === 'logo'}
                  />

                  {/* 2. FAVICON UPLOAD */}
                  <MediaUploadCard
                    title="Favicon Website"
                    badge="Tab Browser"
                    badgeBg="#FEF3C7"
                    badgeColor="#D97706"
                    description="Icon kecil yang muncul pada tab browser dan bookmark. Format didukung: .ico, .png, .svg."
                    accept=".ico,.png,.svg"
                    fileType="favicon"
                    currentActiveFile={activeFavicon}
                    historyFiles={faviconFiles}
                    onUpload={(file) => handleFileUpload('favicon', file)}
                    onDelete={handleDeleteFile}
                    onToggleActive={handleToggleActiveFile}
                    isUploading={isUploading === 'favicon'}
                  />

                  {/* 3. HERO IMAGE / MASCOT UPLOAD */}
                  <MediaUploadCard
                    title="Gambar Maskot / Hero Banner"
                    badge="Hero Section"
                    badgeBg="#FEE2E2"
                    badgeColor="#DC2626"
                    description="Ilustrasi utama pada bagian atas landing page (menggantikan maskot emoji 👩‍🏫 default). Format: PNG, SVG, JPG, WEBP."
                    accept=".png,.svg,.jpg,.jpeg,.webp"
                    fileType="hero_image"
                    currentActiveFile={activeHero}
                    historyFiles={heroFiles}
                    onUpload={(file) => handleFileUpload('hero_image', file)}
                    onDelete={handleDeleteFile}
                    onToggleActive={handleToggleActiveFile}
                    isUploading={isUploading === 'hero_image'}
                  />

                  {/* 4. CLASS IMAGES SECTION */}
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ backgroundColor: '#ECFDF5', color: '#059669', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>Kartu Kelas</span>
                          Gambar / Banner Pilihan Kelas
                        </h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                          Upload foto atau ilustrasi visual untuk kartu paket kelas spesifik.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <select
                          value={selectedClassForUpload}
                          onChange={(e) => setSelectedClassForUpload(e.target.value)}
                          style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: 700 }}
                        >
                          <option value="">-- Hubungkan dengan Kelas --</option>
                          {classesList.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Class Image Drag & Drop Area */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {!classImageFile ? (
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsClassDragging(true);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            setIsClassDragging(false);
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsClassDragging(false);
                            const f = e.dataTransfer.files?.[0];
                            if (f) handleClassImageSelect(f);
                          }}
                          onClick={() => classFileInputRef.current?.click()}
                          style={{
                            border: isClassDragging ? '2px dashed #10B981' : '2px dashed #CBD5E1',
                            backgroundColor: isClassDragging ? '#ECFDF5' : '#FAFAFA',
                            borderRadius: '12px',
                            padding: '1.5rem',
                            textAlign: 'center',
                            cursor: isUploading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <input
                            ref={classFileInputRef}
                            type="file"
                            accept=".png,.svg,.jpg,.jpeg,.webp"
                            style={{ display: 'none' }}
                            disabled={!!isUploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleClassImageSelect(f);
                            }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Upload size={20} />
                            </div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>
                              Tarik & lepas gambar kelas di sini, atau <span style={{ color: '#10B981', textDecoration: 'underline' }}>pilih file</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                              Format didukung: PNG, JPG, WEBP, SVG (Maks. 5MB)
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Preview before upload for Class Image */
                        <div style={{ backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', overflow: 'hidden' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '8px', backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                              {classImagePreview && (
                                <img src={classImagePreview} alt="Preview Class" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                              )}
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669', marginBottom: '2px' }}>
                                ✓ Gambar Kelas Siap Diunggah
                              </div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {classImageFile.name}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                                {classesList.find((c) => c.id === selectedClassForUpload)?.name ? `🎯 Target: ${classesList.find((c) => c.id === selectedClassForUpload)?.name}` : '📌 Target: Umum'}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={handleClearClassImagePreview}
                              disabled={isUploading === 'class_image'}
                              style={{
                                padding: '0.5rem 0.85rem',
                                borderRadius: '8px',
                                border: '1px solid #CBD5E1',
                                backgroundColor: '#FFFFFF',
                                color: '#64748B',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: isUploading === 'class_image' ? 'not-allowed' : 'pointer',
                              }}
                            >
                              Batal
                            </button>
                            <button
                              type="button"
                              onClick={handleUploadClassImage}
                              disabled={isUploading === 'class_image'}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '0.5rem 1.15rem',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#10B981',
                                color: '#FFFFFF',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                cursor: isUploading === 'class_image' ? 'not-allowed' : 'pointer',
                                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                              }}
                            >
                              {isUploading === 'class_image' ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={15} />}
                              <span>{isUploading === 'class_image' ? 'Mengunggah...' : 'Upload Gambar'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Class Images Grid */}
                      {classImages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8', fontSize: '0.85rem' }}>
                          Belum ada gambar kelas yang diunggah. Pilih kelas di atas lalu upload gambar kartu.
                        </div>
                      ) : (
                        <div>
                          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.5rem' }}>
                            Daftar Gambar Kelas Terunggah ({classImages.length})
                          </label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                            {classImages.map((img) => {
                              const meta = typeof img.metadata === 'object' ? img.metadata : {};
                              const linkedClass = classesList.find((c) => c.id === meta?.class_id);

                              return (
                                <div
                                  key={img.id}
                                  style={{
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    backgroundColor: '#FFFFFF',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                  }}
                                >
                                  <div style={{ height: '120px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    <img src={img.file_url} alt={img.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  </div>
                                  <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1E293B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {img.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                                      {linkedClass ? `🎯 ${linkedClass.name}` : '📌 Umum / Semua Kelas'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                                      <button
                                        type="button"
                                        className="btn-touch-sm"
                                        onClick={() => handleToggleActiveFile(img)}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          padding: '6px 10px',
                                          borderRadius: '4px',
                                          border: 'none',
                                          backgroundColor: img.is_active ? '#DEF7EC' : '#F1F5F9',
                                          color: img.is_active ? '#03543F' : '#475569',
                                          fontSize: '0.7rem',
                                          fontWeight: 800,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        {img.is_active ? 'Aktif' : 'Nonaktif'}
                                      </button>
                                      <button
                                        type="button"
                                        className="btn-touch-sm"
                                        onClick={() => handleDeleteFile(img.id, img.name)}
                                        style={{
                                          background: 'transparent',
                                          border: 'none',
                                          color: '#EF4444',
                                          cursor: 'pointer',
                                          padding: '4px',
                                          minWidth: '34px',
                                          minHeight: '34px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                        title="Hapus Gambar Kelas"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 5. ICON LIBRARY SECTION */}
                  <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ backgroundColor: '#F3E8FF', color: '#7E22CE', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem' }}>Icon Library</span>
                          Pustaka Icon SVG (Fitur, Kelas, Navigasi, Sosial)
                        </h4>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748B' }}>
                          Koleksi icon vektor SVG ringan untuk mempercantik fitur, navigasi, dan materi.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAddIconModal(true)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.5rem 1rem',
                          backgroundColor: '#8B5CF6',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                        }}
                      >
                        <Plus size={14} />
                        <span>Tambah Icon Baru</span>
                      </button>
                    </div>

                    {/* Filter by category & search */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {iconCategories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setSelectedIconCategory(cat.id)}
                            style={{
                              padding: '0.4rem 0.75rem',
                              borderRadius: '20px',
                              border: 'none',
                              backgroundColor: selectedIconCategory === cat.id ? '#8B5CF6' : '#F1F5F9',
                              color: selectedIconCategory === cat.id ? '#FFFFFF' : '#475569',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>

                      <div style={{ position: 'relative', minWidth: '180px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                        <input
                          type="text"
                          value={iconSearch}
                          onChange={(e) => setIconSearch(e.target.value)}
                          placeholder="Cari icon..."
                          style={{
                            padding: '0.4rem 0.65rem 0.4rem 30px',
                            borderRadius: '8px',
                            border: '1px solid #CBD5E1',
                            fontSize: '0.8rem',
                            width: '100%',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    {/* SVG Icons Grid / List */}
                    {(() => {
                      const filteredIcons = icons.filter((i) => {
                        const matchCat = selectedIconCategory === 'all' || i.category === selectedIconCategory;
                        const matchSearch = !iconSearch || i.name.toLowerCase().includes(iconSearch.toLowerCase());
                        return matchCat && matchSearch;
                      });

                      if (filteredIcons.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94A3B8', fontSize: '0.85rem' }}>
                            Tidak ada icon SVG yang sesuai dengan filter atau kata kunci.
                          </div>
                        );
                      }

                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
                          {filteredIcons.map((ic, icIdx) => {
                            const VIBRANT_COLORS = ['#E11D48', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
                            const iconColor = VIBRANT_COLORS[icIdx % VIBRANT_COLORS.length];
                            return (
                            <div
                              key={ic.id}
                              style={{
                                border: '1px solid #E2E8F0',
                                borderRadius: '10px',
                                padding: '0.75rem',
                                backgroundColor: '#F8FAFC',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '0.5rem',
                                textAlign: 'center',
                                transition: 'transform 0.15s, border-color 0.15s',
                              }}
                            >
                              <div
                                className="cms-icon-box"
                                style={{
                                  width: '44px',
                                  height: '44px',
                                  backgroundColor: '#FFFFFF',
                                  borderRadius: '8px',
                                  border: '1px solid #E2E8F0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: iconColor,
                                  padding: '4px',
                                }}
                              >
                                {renderIconPreview(ic.svg_code, 28, undefined, icons, iconColor)}
                              </div>
                              <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#1E293B', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ic.name}
                              </div>
                              <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#EDE9FE', color: '#6D28D9', fontWeight: 800 }}>
                                {ic.category || 'feature'}
                              </span>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', width: '100%', justifyContent: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-touch-sm"
                                  onClick={() => handleCopySvg(ic.svg_code, ic.id, ic.name)}
                                  title="Salin Kode SVG"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '6px 8px',
                                    borderRadius: '5px',
                                    border: '1px solid #CBD5E1',
                                    backgroundColor: copiedIconId === ic.id ? '#DEF7EC' : '#FFFFFF',
                                    color: copiedIconId === ic.id ? '#03543F' : '#475569',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {copiedIconId === ic.id ? <Check size={11} /> : <Copy size={11} />}
                                  <span>{copiedIconId === ic.id ? 'Tersalin' : 'Salin'}</span>
                                </button>

                                <button
                                  type="button"
                                  className="btn-touch-sm"
                                  onClick={() => handleDeleteIcon(ic.id, ic.name)}
                                  title="Hapus Icon"
                                  style={{
                                    padding: '6px 8px',
                                    borderRadius: '5px',
                                    border: '1px solid #FCA5A5',
                                    backgroundColor: '#FEF2F2',
                                    color: '#EF4444',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minWidth: '34px',
                                  }}
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* FORM TAMBAH ICON BARU (MODAL) */}
                  {showAddIconModal && (
                    <div
                      style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(15, 23, 42, 0.6)',
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                      }}
                    >
                      <div
                        className="modal-content modal-responsive"
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '16px',
                          width: '100%',
                          maxWidth: '520px',
                          padding: '1.5rem',
                          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
                          <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Shapes size={18} color="#8B5CF6" /> Tambah Icon SVG Baru
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowAddIconModal(false)}
                            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                            Nama Icon
                          </label>
                          <input
                            type="text"
                            value={newIcon.name}
                            onChange={(e) => setNewIcon({ ...newIcon, name: e.target.value })}
                            placeholder="Contoh: Bintang Fitur, Sempoa Ceria..."
                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '0.85rem' }}
                          />
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                            Kategori Icon
                          </label>
                          <select
                            value={newIcon.category}
                            onChange={(e) => setNewIcon({ ...newIcon, category: e.target.value })}
                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontSize: '0.85rem' }}
                          >
                            <option value="feature">⭐ Feature (Fitur Keunggulan)</option>
                            <option value="class">📚 Class (Paket Kelas & Materi)</option>
                            <option value="nav">🧭 Nav (Navigasi & Menu)</option>
                            <option value="social">🌐 Social (Sosial Media & Kontak)</option>
                            <option value="math">🧮 Math (Matematika)</option>
                            <option value="kids">🚀 Kids (Anak & Fun)</option>
                            <option value="education">🎓 Education (Edukasi)</option>
                            <option value="shapes">📐 Shapes (Bentuk & Geometri)</option>
                            <option value="general">📌 General (Umum)</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                            Kode SVG (Mulai dengan &lt;svg&gt; dan diakhiri &lt;/svg&gt;)
                          </label>
                          <textarea
                            rows={4}
                            value={newIcon.svg_code}
                            onChange={(e) => setNewIcon({ ...newIcon, svg_code: e.target.value })}
                            placeholder='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">...</svg>'
                            style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontFamily: 'monospace', fontSize: '0.75rem' }}
                          />
                        </div>

                        {/* Live SVG Preview Box */}
                        {newIcon.svg_code.includes('<svg') && (
                          <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem', borderRadius: '8px', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div
                              className="cms-icon-box"
                              style={{ width: '40px', height: '40px', backgroundColor: '#FFFFFF', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827', padding: '4px' }}
                            >
                              {renderIconPreview(newIcon.svg_code, 24)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
                              ✓ Pratinjau SVG Valid
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => setShowAddIconModal(false)}
                            style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#64748B', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={handleAddIcon}
                            style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#8B5CF6', color: '#FFFFFF', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                          >
                            Simpan Icon
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Live Preview Column */}
        {showPreview && (
          <div
            className="cms-preview-card"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              position: 'sticky',
              top: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={16} color="#4A90D9" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#1E293B' }}>
                  Live Preview: {tabs.find((t) => t.id === activeTab)?.label}
                </h4>
              </div>
              <button
                className="btn-touch-sm"
                onClick={() => setRawJsonMode(!rawJsonMode)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: rawJsonMode ? '#334155' : '#F8FAFC',
                  color: rawJsonMode ? '#FFFFFF' : '#64748B',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                <Code2 size={12} />
                <span>JSON Mode</span>
              </button>
            </div>

            {rawJsonMode ? (
              <pre
                style={{
                  backgroundColor: '#0F172A',
                  color: '#38BDF8',
                  padding: '1rem',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                  maxHeight: '420px',
                }}
              >
                {JSON.stringify(formData[activeTab], null, 2)}
              </pre>
            ) : (
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '1.25rem',
                  minHeight: '300px',
                  maxHeight: '520px',
                  overflowY: 'auto',
                }}
              >
                {/* Header Preview */}
                {activeTab === 'header' && (
                  <div style={{ backgroundColor: '#FFFFFF', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: formData.style?.primary_color || '#4A90D9' }}>
                      🧮 {formData.header?.logo_text || 'Djuniors'}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: '#475569', fontWeight: 600, flexWrap: 'wrap' }}>
                      {(formData.header?.nav_items || []).slice(0, 4).map((m: any, i: number) => (
                        <span key={i}>{m.label}</span>
                      ))}
                    </div>
                    <button className="btn-touch-sm" style={{ backgroundColor: formData.style?.accent_color || '#FF6B35', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {formData.header?.cta_button_text || 'Daftar Sekarang'}
                    </button>
                  </div>
                )}

                {/* Hero Preview */}
                {activeTab === 'hero' && (
                  <div style={{ backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', color: '#111827' }}>
                      {renderIconPreview(formData.hero?.hero_badge || '🎯', 36, undefined, icons)}
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', margin: '0 0 0.5rem 0' }}>
                      {formData.hero?.hero_title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '0 0 1rem 0' }}>
                      {formData.hero?.hero_subtitle}
                    </p>
                    <button style={{ backgroundColor: formData.style?.primary_color || '#4A90D9', color: '#FFFFFF', border: 'none', padding: '8px 18px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                      {formData.hero?.hero_cta_text}
                    </button>
                  </div>
                )}


                {/* Features Preview */}
                {activeTab === 'features' && (

                  <div>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1E293B' }}>{formData.features?.features_title}</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>{formData.features?.features_subtitle}</p>
                    </div>
                    <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      {(formData.features?.features_items || []).map((f: any, i: number) => (
                        <div key={i} style={{ backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', height: '28px', color: '#111827' }}>
                            {renderIconPreview(f.icon || '✨', 24, undefined, icons)}
                          </div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1E293B', marginTop: '4px' }}>{f.title}</div>
                          <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px', lineHeight: 1.3 }}>{f.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Classes Section Preview */}
                {activeTab === 'classes' && (
                  <div style={{ textAlign: 'center', backgroundColor: '#FFFFFF', padding: '1.5rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1E293B', margin: '0 0 0.5rem 0' }}>
                      {formData.classes?.classes_title} 🧮
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748B', margin: 0 }}>
                      {formData.classes?.classes_subtitle}
                    </p>
                  </div>
                )}

                {/* Testimonials Preview */}
                {activeTab === 'testimonials' && (
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#1E293B' }}>{formData.testimonials?.testimonials_title} 🥰</h4>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748B' }}>{formData.testimonials?.testimonials_subtitle}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {(formData.testimonials?.testimonials_items || []).map((t: any, i: number) => (
                        <div key={i} style={{ backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#F59E0B' }}>{'⭐'.repeat(t.rating || 5)}</div>
                          <div style={{ fontSize: '0.75rem', color: '#334155', fontStyle: 'italic', margin: '3px 0' }}>"{t.text}"</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', color: '#111827' }}>
                            {t.avatar && renderIconPreview(t.avatar, 16, undefined, icons)}
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#1E293B' }}>
                              {t.name} <span style={{ fontWeight: 400, color: '#64748B' }}>- {t.relation}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CTA Preview */}
                {activeTab === 'cta' && (
                  <div style={{ backgroundColor: formData.style?.primary_color || '#4A90D9', color: '#FFFFFF', padding: '1.5rem', borderRadius: '10px', textAlign: 'center' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
                      {formData.cta?.cta_title} 🚀
                    </h3>
                    <p style={{ fontSize: '0.85rem', margin: '0 0 1rem 0', opacity: 0.9 }}>
                      {formData.cta?.cta_subtitle}
                    </p>
                    <button style={{ backgroundColor: formData.style?.secondary_color || '#FFD93D', color: '#1E293B', border: 'none', padding: '8px 20px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer' }}>
                      🎉 {formData.cta?.cta_button_text}
                    </button>
                  </div>
                )}

                {/* Footer Preview */}
                {activeTab === 'footer' && (
                  <div style={{ backgroundColor: '#1E293B', color: '#F8FAFC', padding: '1.25rem', borderRadius: '10px', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#38BDF8' }}>🧮 Djuniors</div>
                    <p style={{ margin: 0, color: '#94A3B8' }}>{formData.footer?.footer_tagline}</p>
                    <div style={{ color: '#CBD5E1', marginTop: '4px' }}>
                      <div>📧 {formData.footer?.footer_email}</div>
                      <div>📱 {formData.footer?.footer_phone}</div>
                      <div>📍 {formData.footer?.footer_address}</div>
                    </div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', color: '#64748B' }}>
                      © {formData.footer?.copyright}.
                    </div>
                  </div>
                )}

                {/* Meta SEO Preview */}
                {activeTab === 'meta' && (
                  <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '0.75rem', color: '#202124' }}>https://djuniors.id</div>
                    <div style={{ fontSize: '1rem', color: '#1A0DAB', fontWeight: 600, margin: '2px 0', textDecoration: 'underline' }}>
                      {formData.meta?.meta_title}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#4D5156', lineHeight: 1.4 }}>
                      {formData.meta?.meta_description}
                    </div>
                  </div>
                )}

                {/* Style Preview */}
                {activeTab === 'style' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ flex: 1, height: '40px', backgroundColor: formData.style?.primary_color || '#4A90D9', borderRadius: '6px', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                        Primary
                      </div>
                      <div style={{ flex: 1, height: '40px', backgroundColor: formData.style?.secondary_color || '#FFD93D', borderRadius: '6px', color: '#1E293B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                        Secondary
                      </div>
                      <div style={{ flex: 1, height: '40px', backgroundColor: formData.style?.accent_color || '#FF6B35', borderRadius: '6px', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                        Accent
                      </div>
                    </div>
                    <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <h4 style={{ fontFamily: formData.style?.font_heading || 'Baloo 2', margin: '0 0 0.35rem 0', color: '#1E293B', fontSize: '1.1rem' }}>
                        Contoh Teks Heading ({formData.style?.font_heading})
                      </h4>
                      <p style={{ fontFamily: formData.style?.font_body || 'Nunito', margin: 0, color: '#475569', fontSize: '0.85rem' }}>
                        Contoh teks body paragraph yang akan tampil pada landing page menggunakan font {formData.style?.font_body}.
                      </p>
                    </div>
                  </div>
                )}

                {/* Media & Icons Preview */}
                {activeTab === 'media' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* 1. Navbar Mockup with Active Logo */}
                    <div style={{ backgroundColor: '#FFFFFF', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {activeLogo ? (
                          <img src={activeLogo.file_url} alt="Logo" style={{ height: '24px', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ fontWeight: 800, fontSize: '1rem', color: formData.style?.primary_color || '#4A90D9' }}>🧮 {formData.header?.logo_text || 'Djuniors'}</div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', fontSize: '0.7rem', color: '#64748B' }}>
                        <span>Fitur</span>
                        <span>Kelas</span>
                        <span>Daftar</span>
                      </div>
                    </div>

                    {/* 2. Browser Tab Mockup with Active Favicon */}
                    <div style={{ backgroundColor: '#F1F5F9', padding: '6px 10px', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {activeFavicon ? (
                        <img src={activeFavicon.file_url} alt="Favicon" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                      ) : (
                        <span>🧮</span>
                      )}
                      <span style={{ color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formData.meta?.meta_title || 'Djuniors - Tab Preview'}</span>
                    </div>

                    {/* 3. Hero Banner Mockup with Hero Mascot Image */}
                    <div style={{ backgroundColor: '#FFFFFF', padding: '1rem', borderRadius: '10px', border: '1px solid #E2E8F0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {activeHero ? (
                          <img src={activeHero.file_url} alt="Hero Mascot" style={{ maxHeight: '70px', maxWidth: '100%', objectFit: 'contain' }} />
                        ) : (
                          <div style={{ fontSize: '2.5rem' }}>👩‍🏫</div>
                        )}
                      </div>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#1E293B' }}>
                        {formData.hero?.hero_title}
                      </h4>
                    </div>

                    {/* 4. Active SVG Icons Gallery Preview */}
                    <div style={{ backgroundColor: '#FFFFFF', padding: '0.75rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1E293B', marginBottom: '0.5rem' }}>
                        Icon Vektor ({icons.length})
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {icons.slice(0, 8).map((ic) => (
                          <div
                            key={ic.id}
                            title={ic.name}
                            className="cms-icon-box"
                            style={{ width: '28px', height: '28px', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111827', padding: '2px' }}
                          >
                            {renderIconPreview(ic.svg_code, 18, undefined, icons)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CMS;
