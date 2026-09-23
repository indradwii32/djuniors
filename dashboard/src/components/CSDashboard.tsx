// ============================================
// Djuniors Dashboard - Dashboard Ringkas untuk Role CS
// ============================================
// Menampilkan statistik milik CS masing-masing (dari link ?ref= miliknya):
// total pendaftaran, yang lunas, dan antrian verifikasi — TANPA nominal uang
// (permintaan pemilik produk: CS tidak perlu melihat nilai rupiah).
// Plus kartu link pendaftaran milik CS dengan tombol salin.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  Link2,
  Copy,
  ClipboardCheck,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { csApi, CsOverview, buildRefLink } from '../utils/api';

export const CSDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<CsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setIsLoading(true);
      setErrorMsg(null);
      const res = await csApi.getOverview();
      setOverview(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat statistik';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const link = overview?.ref_code ? buildRefLink(overview.ref_code) : '';

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard tidak tersedia — tampilkan link agar bisa disalin manual
    }
  };

  const stats: Array<{ label: string; value: string; icon: React.ElementType; color: string; bg: string; hint: string }> = [
    {
      label: 'Pendaftaran via Link Saya',
      value: String(overview?.total ?? 0),
      icon: UserCheck,
      color: '#4A90D9',
      bg: '#EFF6FF',
      hint: 'Semua pendaftar dari link Anda',
    },
    {
      label: 'Sudah Dibayar',
      value: String(overview?.paid ?? 0),
      icon: CheckCircle2,
      color: '#059669',
      bg: '#ECFDF5',
      hint: 'Lunas & terkonfirmasi',
    },
    {
      label: 'Menunggu Verifikasi',
      value: String(overview?.pending_verification ?? 0),
      icon: Clock,
      color: '#FF6B35',
      bg: '#FFF0EA',
      hint: 'Bukti bayar perlu dicek',
    },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: '10px', color: '#64748B' }}>
        <RefreshCw size={20} className="animate-spin" color="#4A90D9" />
        <span style={{ fontWeight: 700 }}>Memuat statistik CS...</span>
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
          <button
            onClick={() => load(true)}
            style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: '8px', border: '1px solid #FECACA', background: '#FFFFFF', color: '#B91C1C', fontWeight: 700, cursor: 'pointer' }}
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Header */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          padding: '1.5rem 1.75rem',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
        }}
      >
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
          <ClipboardCheck size={14} /> Dashboard CS
        </span>
        <h2 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.5rem', color: '#1E293B', margin: '8px 0 4px 0', lineHeight: 1.2 }}>
          Halo! Ini ringkasan performa link Anda 👋
        </h2>
        <p style={{ color: '#64748B', fontSize: '0.875rem', margin: 0 }}>
          Statistik di bawah hanya menghitung pendaftaran yang masuk lewat link milik Anda.
        </p>
      </div>

      {/* Link CS */}
      <div
        style={{
          background: 'linear-gradient(135deg, #4A90D9 0%, #3575C4 100%)',
          borderRadius: '16px',
          padding: '1.5rem 1.75rem',
          color: '#FFFFFF',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: '0 10px 25px -8px rgba(74, 144, 217, 0.5)',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 800, opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px' }}>
            <Link2 size={14} /> Link Pendaftaran Saya
          </div>
          <div
            style={{
              marginTop: '6px',
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: 'monospace',
              wordBreak: 'break-all',
              backgroundColor: 'rgba(255,255,255,0.15)',
              padding: '0.6rem 0.85rem',
              borderRadius: '10px',
            }}
          >
            {link || 'Kode link belum tersedia'}
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '6px' }}>
            Kode ref: <strong>{overview?.ref_code || '-'}</strong> — bagikan link ini ke calon pendaftar agar tercatat sebagai milik Anda.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', flexShrink: 0 }}>
          <button
            onClick={handleCopy}
            disabled={!link}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.7rem 1.25rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: copied ? '#6BCB77' : '#FFFFFF',
              color: copied ? '#064E3B' : '#3575C4',
              fontWeight: 800,
              fontSize: '0.9rem',
              cursor: link ? 'pointer' : 'not-allowed',
            }}
          >
            <Copy size={16} />
            <span>{copied ? 'Tersalin!' : 'Salin Link'}</span>
          </button>
          <button
            onClick={() => window.open(link, '_blank', 'noopener')}
            disabled={!link}
            style={{
              padding: '0.7rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.5)',
              backgroundColor: 'rgba(255,255,255,0.12)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: link ? 'pointer' : 'not-allowed',
            }}
          >
            Buka Form
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stats-grid" style={{ display: 'grid', gap: '1rem' }}>
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
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
                  backgroundColor: s.bg,
                  color: s.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={24} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px' }}>{s.hint}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
        <button
          onClick={() => navigate('/registrations')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.4rem',
            borderRadius: '12px',
            border: 'none',
            backgroundColor: '#4A90D9',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(74, 144, 217, 0.35)',
          }}
        >
          <UserCheck size={17} /> Kelola Pendaftaran
        </button>
        <button
          onClick={() => navigate('/verifikasi')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.4rem',
            borderRadius: '12px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
            color: '#334155',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <ClipboardCheck size={17} /> Verifikasi Pembayaran
          {(overview?.pending_verification ?? 0) > 0 && (
            <span
              style={{
                backgroundColor: '#FF6B35',
                color: '#FFFFFF',
                borderRadius: '10px',
                padding: '1px 8px',
                fontSize: '0.75rem',
                fontWeight: 800,
              }}
            >
              {overview?.pending_verification}
            </span>
          )}
        </button>
        <button
          onClick={() => navigate('/cs-links')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.4rem',
            borderRadius: '12px',
            border: '1px solid #CBD5E1',
            backgroundColor: '#FFFFFF',
            color: '#334155',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <Link2 size={17} /> Lihat Link & Statistik
        </button>
        <button
          onClick={() => load(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.25rem',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            color: '#475569',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>
    </div>
  );
};

export default CSDashboard;
