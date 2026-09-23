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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  csApi,
  classesApi,
  CsOverview,
  ClassItem,
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
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      // Halaman ini menampilkan data milik CS yang login (atau ?ref untuk admin).
      const [ovRes, clsRes] = await Promise.allSettled([
        csApi.getOverview(),
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
        setSelectedClassId((prev) => prev || active[0]?.id || '');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat data link');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
  const selectedClass = classes.find((c) => c.id === selectedClassId) || null;
  const selectedLink = refCode && selectedClass ? buildClassRefLink(refCode, selectedClass.id) : '';

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
                  Pilih kelas → link otomatis mengunci jenjang/level/kelas tersebut. Pendaftar tinggal memilih jam & jadwal.
                </div>
              </div>
            </div>

            {!refCode ? (
              <div style={{ color: '#64748B', fontSize: '0.9rem' }}>
                Akun Anda belum memiliki kode link. Hubungi administrator.
              </div>
            ) : classes.length === 0 ? (
              <div style={{ color: '#64748B', fontSize: '0.9rem' }}>Belum ada kelas aktif yang bisa dibuatkan link.</div>
            ) : (
              <>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 260px', minWidth: '220px' }}>
                    <label
                      htmlFor="class-link-select"
                      style={{
                        display: 'block',
                        fontSize: '0.78rem',
                        fontWeight: 800,
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '6px',
                      }}
                    >
                      Pilih Kelas
                    </label>
                    <select
                      id="class-link-select"
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.85rem',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        fontSize: '0.9rem',
                        fontFamily: 'inherit',
                        color: '#1E293B',
                        backgroundColor: '#FFFFFF',
                        boxSizing: 'border-box',
                      }}
                    >
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                          {c.level_name ? ` — Level ${c.level_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedLink && (
                  <div
                    style={{
                      border: '1px solid #DDD6FE',
                      backgroundColor: '#FAF5FF',
                      borderRadius: '12px',
                      padding: '1rem 1.1rem',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#6D28D9', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>
                      Link untuk {selectedClass?.name}
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        color: '#1E293B',
                        wordBreak: 'break-all',
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E9D5FF',
                        borderRadius: '8px',
                        padding: '0.65rem 0.8rem',
                      }}
                    >
                      {selectedLink}
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => copy('selected', selectedLink)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.6rem 1.1rem',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: copied === 'selected' ? '#6BCB77' : '#6D28D9',
                          color: '#FFFFFF',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        {copied === 'selected' ? <CheckCircle2 size={15} /> : <Copy size={15} />}
                        {copied === 'selected' ? 'Tersalin!' : 'Salin Link Kelas'}
                      </button>
                      <button
                        onClick={() => window.open(selectedLink, '_blank', 'noopener')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '0.6rem 1.1rem',
                          borderRadius: '10px',
                          border: '1px solid #DDD6FE',
                          backgroundColor: '#FFFFFF',
                          color: '#6D28D9',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                        }}
                      >
                        <ExternalLink size={15} /> Pratinjau
                      </button>
                    </div>
                  </div>
                )}

                {/* Rincian per kelas + tombol salin cepat */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', color: '#64748B', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        <th style={{ padding: '0.6rem 0.75rem' }}>Kelas</th>
                        <th style={{ padding: '0.6rem 0.75rem' }}>Pendaftaran</th>
                        <th style={{ padding: '0.6rem 0.75rem' }}>Dibayar</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right' }}>Link Kelas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((c) => {
                        const stat = classStatById.get(c.id);
                        const link = buildClassRefLink(refCode, c.id);
                        return (
                          <tr key={c.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '0.7rem 0.75rem', fontWeight: 700, color: '#1E293B' }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <BookOpen size={15} color="#6D28D9" />
                                {c.name}
                              </span>
                              {c.level_name && (
                                <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600 }}>Level {c.level_name}</div>
                              )}
                            </td>
                            <td style={{ padding: '0.7rem 0.75rem', color: '#334155' }}>{stat?.total ?? 0}</td>
                            <td style={{ padding: '0.7rem 0.75rem', color: '#059669', fontWeight: 700 }}>{stat?.paid ?? 0}</td>
                            <td style={{ padding: '0.7rem 0.75rem', textAlign: 'right' }}>
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
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <p style={{ color: '#94A3B8', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>
            {refCode ? (
              <>
                Statistik dihitung dari pendaftaran dengan kode ref <strong>{refCode}</strong>.
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
            Akun Anda belum memiliki kode link. Hubungi administrator.
          </div>
        )
      )}
    </div>
  );
};

export default CSLinks;
