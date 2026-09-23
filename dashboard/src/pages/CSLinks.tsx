// ============================================
// Djuniors Dashboard - Link & Tracking CS
// ============================================
// Admin : daftar semua CS + link pendaftaran masing-masing (salin) + statistik
//         (pendaftaran, lunas, nominal) + tombol kelola akun di Pengaturan.
// CS    : hanya link & statistik miliknya sendiri.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Link2,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Wallet,
  ExternalLink,
  Settings,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  csApi,
  CsOverview,
  buildRefLink,
} from '../utils/api';

const formatIDR = (val?: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);

export const CSLinks: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const [overview, setOverview] = useState<CsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      // Halaman ini menampilkan data milik CS yang login (atau ?ref untuk admin).
      const res = await csApi.getOverview();
      setOverview(res);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat data link');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCopy = async (refCode: string) => {
    try {
      await navigator.clipboard.writeText(buildRefLink(refCode));
      setCopiedRef(refCode);
      setTimeout(() => setCopiedRef(null), 2000);
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
            {isAdmin ? 'Link Pendaftaran per CS' : 'Link Pendaftaran Saya'}
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>
            {isAdmin
              ? 'Bagikan link unik tiap CS agar pendaftar tercatat & ter-tracking sesuai CS yang membawa.'
              : 'Bagukkan link ini ke calon pendaftar. Semua pendaftaran dari link akan tercatat sebagai milik Anda.'}
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
          {/* Kartu link */}
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
              <Link2 size={14} /> Link Pendaftaran · Kode Ref: {overview.ref_code}
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
              {buildRefLink(overview.ref_code)}
            </div>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.9rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => handleCopy(overview.ref_code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.7rem 1.3rem',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: copiedRef === overview.ref_code ? '#6BCB77' : '#FFFFFF',
                  color: copiedRef === overview.ref_code ? '#064E3B' : '#4C1D95',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                {copiedRef === overview.ref_code ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copiedRef === overview.ref_code ? 'Tersalin!' : 'Salin Link'}
              </button>
              <button
                onClick={() => window.open(buildRefLink(overview.ref_code), '_blank', 'noopener')}
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
          </div>

          {/* Statistik */}
          <div className="stats-grid" style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#EFF6FF', color: '#4A90D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UserCheck size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Total Pendaftaran</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{overview.total}</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Sudah Dibayar</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{overview.paid}</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#FEF3C7', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wallet size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Nominal Terkumpul</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{formatIDR(overview.revenue)}</div>
              </div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: '14px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '12px', backgroundColor: '#FFF0EA', color: '#FF6B35', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RefreshCw size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>Menunggu Verifikasi</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>{overview.pending_verification}</div>
              </div>
            </div>
          </div>

          <p style={{ color: '#94A3B8', fontSize: '0.8rem', margin: 0, textAlign: 'center' }}>
            Statistik dihitung dari pendaftaran dengan kode ref <strong>{overview.ref_code}</strong>.
            {isAdmin && ' Untuk melihat semua CS sekaligus, buka Pengaturan Sistem → Akun Tim.'}
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
