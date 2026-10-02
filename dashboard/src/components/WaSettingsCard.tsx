// ============================================================
// Kartu "Token Fonnte" — device WhatsApp milik satu CS.
//
// Isi pesan & saklar aktif TIDAK ada di kartu ini. Keduanya milik editor
// template (Notifikasi → Editor Template), dipakai bersama oleh admin dan CS:
// pesan notifikasi untuk pendaftar sama untuk semua orang, jadi tidak boleh
// ada versi per-CS yang bisa berbeda diam-diam. Yang tetap per-CS hanya token
// Fonnte — device tempat pesan dikirim atas nama CS tersebut.
// ============================================================

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, RefreshCw, Save, Send } from 'lucide-react';
import { csWaApi, adminAccountsApi, AdminAccountItem, CsWaSettingsResponse } from '../utils/api';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.8rem',
  borderRadius: '10px',
  border: '1px solid #E2E8F0',
  fontSize: '0.875rem',
  fontFamily: 'inherit',
  backgroundColor: '#FFFFFF',
  color: '#1E293B',
  outline: 'none',
  boxSizing: 'border-box',
};

interface Props {
  isAdmin: boolean;
}

export const WaSettingsCard: React.FC<Props> = ({ isAdmin }) => {
  const [accounts, setAccounts] = useState<AdminAccountItem[]>([]);
  const [selectedRef, setSelectedRef] = useState<string>('');
  const [data, setData] = useState<CsWaSettingsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [tokenInput, setTokenInput] = useState('');
  const [clearToken, setClearToken] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4000);
  };

  const applyData = useCallback((res: CsWaSettingsResponse) => {
    setData(res);
    setTokenInput('');
    setClearToken(false);
  }, []);

  // Admin: daftar CS untuk dropdown. CS: langsung load setelan sendiri.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isAdmin) {
          const res = await adminAccountsApi.list();
          const csList = (res.accounts || []).filter((a) => a.role === 'cs' && a.is_active);
          if (cancelled) return;
          setAccounts(csList);
          if (csList.length > 0) setSelectedRef((prev) => prev || (csList[0].ref_code || ''));
        }
      } catch {
        if (!cancelled) setAccounts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin && !selectedRef) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const res = await csWaApi.getSettings(isAdmin ? selectedRef : undefined);
        if (cancelled) return;
        applyData(res);
      } catch (err) {
        if (!cancelled) showNotice(err instanceof Error ? err.message : 'Gagal memuat token Fonnte', 'error');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, selectedRef, applyData]);

  const handleSave = async () => {
    if (isAdmin && !selectedRef) return;
    try {
      setIsSaving(true);
      const res = await csWaApi.saveSettings({
        ref: isAdmin && selectedRef ? selectedRef : undefined,
        fonnte_token: tokenInput.trim() || undefined,
        clear_token: clearToken || undefined,
      });
      applyData({ ...(data as CsWaSettingsResponse), settings: res.settings });
      setTokenInput('');
      setClearToken(false);
      showNotice('Token Fonnte tersimpan');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal menyimpan', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testPhone.trim()) {
      showNotice('Isi nomor WhatsApp tes terlebih dahulu', 'error');
      return;
    }
    try {
      const res = await csWaApi.sendTest({
        phone: testPhone.trim(),
        ref: isAdmin && selectedRef ? selectedRef : undefined,
      });
      if (res.success) {
        showNotice(
          `Pesan tes terkirim via ${res.source === 'cs_token' ? 'token CS' : 'token global'}`
        );
      } else {
        showNotice(res.message || 'Gagal mengirim pesan tes', 'error');
      }
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal mengirim pesan tes', 'error');
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        padding: '1.5rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <span
            style={{
              backgroundColor: '#ECFDF5',
              color: '#059669',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.75rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <KeyRound size={14} /> Token Fonnte · Device CS
          </span>
          <h3
            style={{
              fontFamily: "'Baloo 2', cursive",
              fontSize: '1.2rem',
              color: '#1E293B',
              margin: '8px 0 4px 0',
            }}
          >
            Device WhatsApp milik CS
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0, maxWidth: '58ch' }}>
            Token Fonnte opsional. Kalau diisi, pesan notifikasi dari CS ini dikirim lewat device
            tersebut; kalau kosong, sistem memakai token global. Isi pesan &amp; saklar aktif diatur di{' '}
            <strong>Editor Template</strong>. Nama yang tampil di pesan diatur di <strong>Profil Akun</strong>.
          </p>
        </div>
        {isAdmin && (
          <div style={{ minWidth: '230px' }}>
            <label
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
              Kelola device CS
            </label>
            <select
              value={selectedRef}
              onChange={(e) => setSelectedRef(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {accounts.length === 0 && <option value="">— Belum ada akun CS —</option>}
              {accounts.map((a) => (
                <option key={a.id} value={a.ref_code || ''}>
                  {a.display_name || a.name} ({a.ref_code || 'tanpa ref'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {notice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '1rem',
            padding: '0.7rem 1rem',
            borderRadius: '10px',
            backgroundColor: notice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${notice.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            color: notice.type === 'success' ? '#047857' : '#B91C1C',
            fontWeight: 700,
            fontSize: '0.85rem',
          }}
        >
          {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {notice.text}
        </div>
      )}

      {isAdmin && accounts.length === 0 && !isLoading && (
        <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '1rem' }}>
          Belum ada akun CS. Buat dulu di Pengaturan → Akun Tim.
        </p>
      )}

      {isLoading ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#64748B',
            marginTop: '1.25rem',
            fontWeight: 700,
            fontSize: '0.9rem',
          }}
        >
          <RefreshCw size={16} className="animate-spin" /> Memuat token...
        </div>
      ) : data ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.1rem',
            marginTop: '1.25rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1rem 1.1rem',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '6px',
              }}
            >
              <KeyRound size={13} /> Token Fonnte ({data.account.name})
            </label>
            <div
              style={{
                display: 'flex',
                gap: '0.6rem',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={
                  data.settings.fonnte_token_set
                    ? `Tersimpan: ${data.settings.fonnte_token_masked} — isi untuk mengganti`
                    : 'Kosong — memakai token global'
                }
                style={{ ...inputStyle, maxWidth: '380px', flex: '1 1 260px' }}
                autoComplete="off"
              />
              {data.settings.fonnte_token_set && (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    color: '#64748B',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={clearToken}
                    onChange={(e) => setClearToken(e.target.checked)}
                  />
                  Hapus token
                </label>
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '6px 0 0 0' }}>
              {data.settings.fonnte_token_set
                ? 'Pesan notifikasi dari CS ini dikirim lewat device ini. Kalau device bermasalah, sistem otomatis ke token global.'
                : data.global_token_set
                  ? 'Belum ada token CS → memakai token gateway global.'
                  : 'Belum ada token sama sekali — notifikasi tidak terkirim sampai token diisi di Settings → WhatsApp Gateway.'}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              alignItems: 'center',
            }}
          >
            <button
              onClick={handleSave}
              disabled={isSaving || (isAdmin && !selectedRef)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.7rem 1.4rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: isSaving ? '#94A3B8' : '#6D28D9',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: isSaving ? 'wait' : 'pointer',
              }}
            >
              {isSaving ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {isSaving ? 'Menyimpan...' : 'Simpan Token'}
            </button>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                style={{ ...inputStyle, width: '170px' }}
              />
              <button
                onClick={handleTest}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.7rem 1.1rem',
                  borderRadius: '10px',
                  border: '1px solid #A7F3D0',
                  backgroundColor: '#ECFDF5',
                  color: '#047857',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                <Send size={15} /> Kirim Tes
              </button>
            </div>
          </div>

          {data.settings.updated_at && (
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>
              Terakhir disimpan: {new Date(data.settings.updated_at + 'Z').toLocaleString('id-ID')}
            </p>
          )}
        </div>
      ) : (
        <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '1rem' }}>
          {isAdmin ? 'Pilih CS untuk mengelola tokennya.' : 'Token belum tersedia.'}
        </p>
      )}
    </div>
  );
};

export default WaSettingsCard;
