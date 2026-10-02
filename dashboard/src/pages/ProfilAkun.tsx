// ============================================================
// Profil Akun — nama yang tampil untuk admin & CS.
//
// Satu sumber nama untuk seluruh aplikasi: dashboard, laporan, dan tanda
// tangan pesan WhatsApp. Sebelumnya nama CS punya dua tempat berbeda (label
// internal milik admin + nama pengirim WA), sehingga dashboard dan pesan bisa
// menampilkan nama berbeda untuk orang yang sama.
//
// `name` (label internal) tidak bisa diubah di sini — itu milik admin lewat
// Pengaturan → Akun Tim, karena dipakai untuk mengenali akun. Yang bebas
// diubah setiap akun adalah nama tampil + nomor WhatsApp.
// ============================================================

import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../utils/api';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.85rem',
  borderRadius: '10px',
  border: '1px solid #E2E8F0',
  fontSize: '0.9rem',
  fontFamily: 'inherit',
  backgroundColor: '#FFFFFF',
  color: '#1E293B',
  outline: 'none',
  boxSizing: 'border-box',
};

const cardStyle: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderRadius: '16px',
  border: '1px solid #E2E8F0',
  padding: '1.5rem 1.75rem',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 800,
  color: '#475569',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  cs: 'Customer Service',
};

const ProfilAkun: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const shownName = displayName.trim() || user?.name || '';

  // Isi form dari context, TAPI hanya saat akun berganti atau belum pernah
  // diisi. Setelah simpan, form yang otoritatif adalah form ini sendiri.
  //
  // Kenapa: /auth/me mengembalikan display_name yang sudah di-resolve ke `name`
  // kalau kolomnya kosong. Kalau form di-set ulang dari situ setiap context
  // berubah, mengosongkan kolom akan langsung terisi `Administrator` lagi —
  // user menekan Simpan, tidak ada error, tapi namanya kembali sendiri.
  const [hydratedFor, setHydratedFor] = useState<string>('');
  useEffect(() => {
    if (!user?.id) return;
    if (hydratedFor === user.id) return;
    setDisplayName((user.display_name || '').trim() || user.name || '');
    setPhone(user.phone || '');
    setHydratedFor(user.id);
  }, [user?.id, user?.display_name, user?.name, user?.phone, hydratedFor]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const res = await authApi.saveProfile({
        display_name: displayName.trim(),
        phone: phone.trim(),
      });
      // Samakan form dengan nilai yang benar-benar tersimpan di server, bukan
      // dengan apa yang diketik: kolom kosong berarti "pakai nama akun", jadi
      // kolom harus ikut kosong, bukan diisi nama akun.
      const saved = res.account;
      if (saved) {
        setDisplayName((saved.display_name || '').trim());
        setPhone(saved.phone || '');
      }
      // Segarkan context supaya Header, sidebar, dan halaman lain ikut nama
      // baru. Kegagalan di sini tidak menggagalkan simpan profil.
      try {
        await refreshUser();
      } catch {
        /* ignore */
      }
      setNotice({ text: res.message || 'Profil berhasil disimpan', type: 'success' });
      setTimeout(() => setNotice(null), 4000);
    } catch (err) {
      setNotice({
        text: err instanceof Error ? err.message : 'Gagal menyimpan profil',
        type: 'error',
      });
      setTimeout(() => setNotice(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const isChanged =
    displayName.trim() !== ((user?.display_name || '').trim() || user?.name || '') ||
    phone.trim() !== (user?.phone || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '860px' }}>
      {/* Identitas akun — hanya baca */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#4A90D9',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.4rem',
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {shownName ? shownName.charAt(0).toUpperCase() : 'A'}
          </div>
          <div style={{ minWidth: 0 }}>
            <h2
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.35rem',
                margin: 0,
                color: '#1E293B',
                overflowWrap: 'anywhere',
              }}
            >
              {shownName || 'Akun Dashboard'}
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '2px' }}>
              @{user?.username || '—'}
              <span
                style={{
                  marginLeft: '8px',
                  padding: '2px 9px',
                  borderRadius: '20px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  backgroundColor: user?.role === 'cs' ? '#F5F3FF' : '#EFF6FF',
                  color: user?.role === 'cs' ? '#6D28D9' : '#1D4ED8',
                }}
              >
                {ROLE_LABEL[user?.role || ''] || user?.role || 'Admin'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label htmlFor="profil-display-name" style={labelStyle}>
              <UserRound size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
              Nama yang tampil
            </label>
            <input
              id="profil-display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={user?.name || 'Nama Anda'}
              style={inputStyle}
              maxLength={80}
            />
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '6px 0 0 0' }}>
              Nama ini dipakai di dashboard, nama laporan harian, dan tanda tangan pesan WhatsApp. Kosongkan untuk
              kembali memakai nama akun bawaan.
            </p>
          </div>

          <div>
            <label htmlFor="profil-phone" style={labelStyle}>
              Nomor WhatsApp
            </label>
            <input
              id="profil-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
              style={{ ...inputStyle, maxWidth: '260px' }}
              maxLength={30}
            />
            <p style={{ fontSize: '0.8rem', color: '#94A3B8', margin: '6px 0 0 0' }}>
              Opsional. Dipakai untuk mengabayatkan CS kalau ada pendaftaran dari link-nya yang perlu diperiksa.
            </p>
          </div>

          {notice && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0.7rem 1rem',
                borderRadius: '10px',
                backgroundColor: notice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                border: `1px solid ${notice.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
                color: notice.type === 'success' ? '#047857' : '#B91C1C',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              {notice.type === 'success' && <CheckCircle2 size={16} />}
              {notice.text}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isSaving || !isChanged}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.7rem 1.5rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: isSaving || !isChanged ? '#94A3B8' : '#4A90D9',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: isSaving ? 'wait' : !isChanged ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              {isSaving ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </div>
        </form>
      </div>

      {/* Yang tidak bisa diubah sendiri */}
      <div style={cardStyle}>
        <h3
          style={{
            fontFamily: "'Baloo 2', cursive",
            fontSize: '1.1rem',
            margin: '0 0 6px 0',
            color: '#1E293B',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ShieldCheck size={17} color="#64748B" /> Dikelola admin
        </h3>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.83rem', color: '#64748B' }}>
          Bagian ini hanya bisa diubah admin, jadi tidak bisa diubah dari sini.
        </p>
        <dl style={{ margin: 0, display: 'grid', gap: '0.75rem', gridTemplateColumns: 'auto 1fr' }}>
          <dt style={{ fontSize: '0.83rem', color: '#64748B', fontWeight: 700 }}>Username</dt>
          <dd style={{ margin: 0, fontSize: '0.83rem', color: '#1E293B', fontFamily: 'monospace' }}>
            @{user?.username || '—'}
          </dd>
          <dt style={{ fontSize: '0.83rem', color: '#64748B', fontWeight: 700 }}>Label internal</dt>
          <dd style={{ margin: 0, fontSize: '0.83rem', color: '#1E293B' }}>{user?.name || '—'}</dd>
          {user?.ref_code && (
            <>
              <dt style={{ fontSize: '0.83rem', color: '#64748B', fontWeight: 700 }}>Kode link CS</dt>
              <dd style={{ margin: 0, fontSize: '0.83rem', color: '#6D28D9', fontFamily: 'monospace' }}>
                {user.ref_code}
              </dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
};

export default ProfilAkun;