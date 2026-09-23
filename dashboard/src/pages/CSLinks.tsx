// ============================================
// Djuniors Dashboard - Link & Tracking CS
// ============================================
// Isi halaman ini (permintaan pemilik produk):
//  1. Statistik pendaftaran milik CS — TANPA nominal uang.
//  2. Generator link pendaftaran per kelas: link memakai kode ref CS + kelas
//     terpilih, sehingga form pendaftaran mengunci jenjang/level/kelas dan
//     pendaftar hanya memilih jam & jadwal.
//
// Setelan notifikasi WhatsApp (Fonnte + template per CS) TIDAK lagi di sini —
// pindah ke menu Notifikasi WA.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Clock,
  ExternalLink,
  Settings,
  BookOpen,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  csApi,
  classesApi,
  adminAccountsApi,
  CsOverview,
  ClassItem,
  AdminAccountItem,
  buildRefLink,
  buildClassRefLink,
} from '../utils/api';

const CARD: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '14px',
  border: '1px solid #E2E8F0',
  padding: '1.25rem',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
};

export const CSLinks: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [overview, setOverview] = useState<CsOverview | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  // Multi-pilih kelas: generator bisa membuat beberapa link per kelas sekaligus
  // (bukan hanya satu link umum atau satu kelas saja).
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  // Admin melihat SEMUA CS, jadi halaman ini butuh satu CS terpilih: link hanya
  // bisa dibuat kalau ada ref_code konkret (tanpa ref, server mengembalikan
  // agregat tanpa kode link — generator jadi buntu).
  const [accounts, setAccounts] = useState<AdminAccountItem[]>([]);
  const [selectedRef, setSelectedRef] = useState<string>('');
  const [accountsLoaded, setAccountsLoaded] = useState<boolean>(false);

  // Admin: muat daftar CS untuk dipilih.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAdmin) {
        setAccountsLoaded(true);
        return;
      }
      try {
        const res = await adminAccountsApi.list();
        const csList = (res.accounts || []).filter((a) => a.role === 'cs' && a.is_active);
        if (cancelled) return;
        setAccounts(csList);
        setSelectedRef((prev) => prev || csList[0]?.ref_code || '');
      } catch {
        if (!cancelled) setAccounts([]);
      } finally {
        if (!cancelled) setAccountsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      // CS: selalu data milik sendiri. Admin: CS yang dipilih di dropdown.
      const ref = isAdmin ? selectedRef : undefined;
      const [ovRes, clsRes] = await Promise.allSettled([
        csApi.getOverview(ref || undefined),
        classesApi.getAll(),
      ]);
      if (ovRes.status === 'fulfilled') {
        setOverview(ovRes.value);
      } else {
        throw ovRes.reason;
      }
      if (clsRes.status === 'fulfilled' && Array.isArray(clsRes.value)) {
        const active = clsRes.value.filter((c) => Boolean(c.is_active));
        setClasses(active);
        // Awalnya kelas pertama dipilih supaya link per-kelas langsung terlihat.
        setSelectedClassIds((prev) => (prev.length > 0 ? prev : active[0]?.id ? [active[0].id] : []));
      } else if (clsRes.status === 'rejected') {
        // Jangan diam-diam tampil "belum ada kelas" — beri tahu sebabnya, karena
        // kegagalan memuat kelas membuat generator link tidak bisa dipakai.
        setClasses([]);
        const reason: unknown = clsRes.reason;
        const detail = reason instanceof Error ? reason.message : '';
        setErrorMsg(
          detail
            ? `Gagal memuat daftar kelas: ${detail}`
            : 'Gagal memuat daftar kelas, sehingga link per kelas belum bisa dibuat.'
        );
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat data link');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, selectedRef]);

  useEffect(() => {
    // Tunggu daftar CS termuat dulu (admin) supaya tidak meminta overview tanpa ref.
    if (!accountsLoaded) return;
    if (isAdmin && !selectedRef) {
      setOverview(null);
      setIsLoading(false);
      return;
    }
    load();
  }, [accountsLoaded, isAdmin, selectedRef, load]);

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // clipboard tidak tersedia
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '10px', color: '#64748B' }}>
        <RefreshCw size={20} className="animate-spin" color="#4A90D9" />
        <span style={{ fontWeight: 700 }}>Memuat link & statistik...</span>
      </div>
    );
  }

  const refCode = overview?.ref_code || '';
  const byClass = overview?.by_class || [];
  const classStatById = new Map(byClass.map((c) => [c.class_id, c]));
  const selectedClasses = classes.filter((c) => selectedClassIds.includes(c.id));
  // Teks siap tempel (WhatsApp/chat): satu baris per kelas terpilih.
  const bulkLinksText = selectedClasses
    .map((c) => `- ${c.name}${c.level_name ? ` (Level ${c.level_name})` : ''}: ${buildClassRefLink(refCode, c.id)}`)
    .join('\n');

  const toggleClassSelection = (id: string, on: boolean) => {
    setSelectedClassIds((prev) => {
      if (on) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  };

  const selectedAccount = accounts.find((a) => a.ref_code === selectedRef) || null;
  // Pesan saat tidak ada ref_code: bedakan CS sendiri vs admin yang belum
  // memilih CS, supaya admin tidak disuruh "hubungi administrator" (dirinya sendiri).
  const noRefMessage = isAdmin
    ? accounts.length === 0
      ? 'Belum ada akun CS aktif. Buat akun CS terlebih dahulu di Pengaturan Sistem → Akun Tim.'
      : selectedAccount && !selectedAccount.ref_code
        ? `Akun CS "${selectedAccount.name}" belum memiliki kode link. Atur kode ref-nya di Pengaturan Sistem → Akun Tim.`
        : 'Pilih CS pada dropdown "Buat link untuk CS" untuk membuat link pendaftaran.'
    : 'Akun Anda belum memiliki kode link. Hubungi administrator.';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {errorMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#B91C1C',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
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
              backgroundColor: '#F5F3FF',
              color: '#6D28D9',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Link2 size={14} /> {isAdmin ? 'Link & Tracking CS' : 'Link Kelas Saya'}
          </span>
          <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.5rem', color: '#1E293B', margin: '8px 0 4px 0', lineHeight: 1.2 }}>
            {isAdmin ? 'Link Pendaftaran per CS & Kelas' : 'Link Pendaftaran Saya'}
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>
            {isAdmin
              ? 'Bagikan link unik tiap CS agar pendaftar tercatat & ter-tracking sesuai CS yang membawa.'
              : 'Bagikan link ini ke calon pendaftar. Semua pendaftaran dari link akan tercatat sebagai milik Anda.'}
          </p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '240px' }}>
              <label
                htmlFor="cs-link-account"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#475569',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '6px',
                }}
              >
                <Users size={13} /> Buat link untuk CS
              </label>
              <select
                id="cs-link-account"
                value={selectedRef}
                onChange={(e) => setSelectedRef(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  backgroundColor: '#FFFFFF',
                  color: '#1E293B',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                {accounts.length === 0 && <option value="">— Belum ada akun CS —</option>}
                {accounts.map((a) => (
                  <option key={a.id} value={a.ref_code || ''}>
                    {a.name}
                    {a.ref_code ? ` (${a.ref_code})` : ' — belum punya kode link'}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => navigate('/settings')}
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
              <Settings size={16} /> Kelola Akun CS
            </button>
          </div>
        )}
      </div>

      {overview ? (
        <>
          {/* Statistik tanpa nominal */}
          <div className="stats-grid" style={{ display: 'grid', gap: '1rem' }}>
            <div style={CARD}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#4A90D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Total Pendaftaran</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{overview.total}</div>
              </div>
            </div>
            <div style={CARD}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Sudah Dibayar</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{overview.paid}</div>
              </div>
            </div>
            <div style={CARD}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Menunggu Verifikasi</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{overview.pending_verification}</div>
              </div>
            </div>
            <div style={CARD}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#FFF0EA', color: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Belum Bayar</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>
                  {Math.max(0, overview.total - overview.paid)}
                </div>
              </div>
            </div>
          </div>

          {/* Link umum CS */}
          {refCode && (
            <div
              style={{
                background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)',
                borderRadius: '16px',
                padding: '1.5rem 1.75rem',
                color: '#FFFFFF',
                boxShadow: '0 10px 25px -8px rgba(109, 40, 217, 0.5)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>
                <Link2 size={14} /> Link Pendaftaran Umum · Kode Ref: {refCode}
              </div>
              <div
                style={{
                  marginTop: '10px',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  padding: '0.7rem 0.95rem',
                  borderRadius: '10px',
                }}
              >
                {buildRefLink(refCode)}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => copy('ref', buildRefLink(refCode))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.7rem 1.3rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: copied === 'ref' ? '#6BCB77' : '#FFFFFF',
                    color: copied === 'ref' ? '#064E3B' : '#4C1D95',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  {copied === 'ref' ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  {copied === 'ref' ? 'Tersalin!' : 'Salin Link'}
                </button>
                <button
                  onClick={() => window.open(buildRefLink(refCode), '_blank', 'noopener')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.7rem 1.3rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.5)',
                    backgroundColor: 'rgba(255,255,255,0.12)',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  <ExternalLink size={15} /> Buka Form Pendaftaran
                </button>
              </div>
              <p style={{ margin: '0.85rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.8)' }}>
                Link umum: pendaftar bebas memilih jenjang & kelas. Untuk mengunci satu kelas, pakai generator per kelas di bawah.
              </p>
            </div>
          )}

          {/* Generator link per kelas */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '1.5rem 1.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  backgroundColor: '#F5F3FF',
                  color: '#6D28D9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1E293B' }}>Generator Link per Kelas</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Centang satu atau beberapa kelas → setiap kelas dapat link sendiri yang mengunci jenjang/level/kelasnya.
                  Pendaftar tinggal memilih jam & jadwal.
                </div>
              </div>
            </div>

            {!refCode ? (
              <div
                style={{
                  color: '#92400E',
                  fontSize: '0.9rem',
                  backgroundColor: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  fontWeight: 600,
                }}
              >
                {noRefMessage}
              </div>
            ) : classes.length === 0 ? (
              <div style={{ color: '#64748B', fontSize: '0.9rem' }}>Belum ada kelas aktif yang bisa dibuatkan link.</div>
            ) : (
              <>
                {/* Kontrol pilih kelas */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
                  <span
                    style={{
                      backgroundColor: '#F5F3FF',
                      color: '#6D28D9',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                    }}
                  >
                    {selectedClassIds.length} dari {classes.length} kelas dipilih
                  </span>
                  <button
                    onClick={() => setSelectedClassIds(classes.map((c) => c.id))}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '9px',
                      border: '1px solid #DDD6FE',
                      backgroundColor: '#FFFFFF',
                      color: '#6D28D9',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    Pilih Semua Kelas
                  </button>
                  <button
                    onClick={() => setSelectedClassIds([])}
                    style={{
                      padding: '0.45rem 0.9rem',
                      borderRadius: '9px',
                      border: '1px solid #E2E8F0',
                      backgroundColor: '#FFFFFF',
                      color: '#64748B',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      cursor: 'pointer',
                    }}
                  >
                    Kosongkan
                  </button>
                  {selectedClasses.length > 0 && (
                    <button
                      onClick={() => copy('bulk', bulkLinksText)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.45rem 1rem',
                        borderRadius: '9px',
                        border: 'none',
                        backgroundColor: copied === 'bulk' ? '#6BCB77' : '#6D28D9',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      {copied === 'bulk' ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      {copied === 'bulk' ? 'Tersalin!' : `Salin Semua Link (${selectedClasses.length})`}
                    </button>
                  )}
                </div>

                {/* Daftar kelas dengan centang + statistik */}
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {classes.map((c) => {
                    const stat = classStatById.get(c.id);
                    const link = buildClassRefLink(refCode, c.id);
                    const checked = selectedClassIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          flexWrap: 'wrap',
                          padding: '0.7rem 0.9rem',
                          borderRadius: '12px',
                          border: `1px solid ${checked ? '#DDD6FE' : '#E2E8F0'}`,
                          backgroundColor: checked ? '#FAF5FF' : '#FFFFFF',
                        }}
                      >
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer',
                            flex: '1 1 220px',
                            minWidth: 0,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => toggleClassSelection(c.id, e.target.checked)}
                            aria-label={`Pilih kelas ${c.name}`}
                            style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                          />
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                            <BookOpen size={15} color="#6D28D9" />
                            <span style={{ fontWeight: 700, color: '#1E293B' }}>{c.name}</span>
                            {c.level_name && (
                              <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 700 }}>
                                Level {c.level_name}
                              </span>
                            )}
                          </span>
                        </label>

                        <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700 }}>
                          {stat?.total ?? 0} pendaftaran · <span style={{ color: '#059669' }}>{stat?.paid ?? 0} dibayar</span>
                        </span>

                        <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto' }}>
                          <button
                            onClick={() => copy(`row-${c.id}`, link)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '0.45rem 0.8rem',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              backgroundColor: copied === `row-${c.id}` ? '#ECFDF5' : '#FFFFFF',
                              color: copied === `row-${c.id}` ? '#059669' : '#475569',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                            }}
                          >
                            {copied === `row-${c.id}` ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                            {copied === `row-${c.id}` ? 'Tersalin' : 'Salin Link'}
                          </button>
                          <button
                            onClick={() => window.open(link, '_blank', 'noopener')}
                            title={`Pratinjau form untuk ${c.name}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '0.45rem 0.7rem',
                              borderRadius: '8px',
                              border: '1px solid #DDD6FE',
                              backgroundColor: '#FFFFFF',
                              color: '#6D28D9',
                              fontWeight: 700,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                            }}
                          >
                            <ExternalLink size={14} /> Pratinjau
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Hasil link untuk kelas terpilih */}
                {selectedClasses.length > 0 ? (
                  <div style={{ border: '1px solid #DDD6FE', backgroundColor: '#FAF5FF', borderRadius: '12px', padding: '1rem 1.1rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
                      Link siap dibagikan ({selectedClasses.length})
                    </div>
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      {selectedClasses.map((c) => {
                        const link = buildClassRefLink(refCode, c.id);
                        return (
                          <div key={c.id}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6D28D9', marginBottom: '4px' }}>
                              {c.name}
                              {c.level_name ? ` · Level ${c.level_name}` : ''}
                            </div>
                            <div
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.82rem',
                                color: '#1E293B',
                                wordBreak: 'break-all',
                                backgroundColor: '#FFFFFF',
                                border: '1px solid #E9D5FF',
                                borderRadius: '8px',
                                padding: '0.55rem 0.7rem',
                              }}
                            >
                              {link}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p style={{ margin: '0.75rem 0 0', fontSize: '0.75rem', color: '#7C3AED' }}>
                      Tombol <strong>Salin Semua Link</strong> menyalin daftar ini beserta nama kelasnya — praktis untuk ditempel ke WhatsApp.
                    </p>
                  </div>
                ) : (
                  <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: 0 }}>
                    Belum ada kelas dipilih. Centang kelas di atas untuk membuat link pendaftarannya.
                  </p>
                )}
              </>
            )}
          </div>

          <p style={{ color: '#94A3B8', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>
            {refCode ? (
              <>
                Statistik dihitung dari pendaftaran dengan kode ref <strong>{refCode}</strong>
                {isAdmin && selectedAccount ? <> milik <strong>{selectedAccount.name}</strong></> : null}.
              </>
            ) : (
              <>
                Statistik agregat <strong>semua CS</strong>.
              </>
            )}
            {' Setelan notifikasi WhatsApp tiap CS kini ada di menu Notifikasi WA.'}
            {isAdmin && ' Untuk mengelola akun & kode link CS, buka Pengaturan Sistem → Akun Tim.'}
          </p>
        </>
      ) : (
        !errorMsg && (
          <div style={{ backgroundColor: '#FFFFFF', padding: '2rem', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center', color: '#64748B' }}>
            {noRefMessage}
          </div>
        )
      )}
    </div>
  );
};

export default CSLinks;
