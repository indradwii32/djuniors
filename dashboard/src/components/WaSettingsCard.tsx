// ============================================================
// Kartu "Notifikasi WhatsApp (Fonnte)" — dipakai di halaman Link CS.
// CS: selalu mengelola setelannya sendiri.
// Admin: memilih CS lewat dropdown → mengelola setelan CS tersebut.
// ============================================================

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  MessageCircle,
  RefreshCw,
  Save,
  Send,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import {
  csWaApi,
  adminAccountsApi,
  AdminAccountItem,
  CsWaSettingsResponse,
} from '../utils/api';

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

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: 800,
  color: '#475569',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '6px',
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
  const [tplReg, setTplReg] = useState('');
  const [tplPay, setTplPay] = useState('');
  const [autoReg, setAutoReg] = useState(true);
  const [autoPay, setAutoPay] = useState(true);

  const [testPhone, setTestPhone] = useState('');
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  // Variable diklik → disisipkan ke template yang sedang aktif (posisi kursor).
  const [activeField, setActiveField] = useState<'registration' | 'payment'>('registration');
  const [lastInserted, setLastInserted] = useState<string | null>(null);
  const tplRegRef = useRef<HTMLTextAreaElement | null>(null);
  const tplPayRef = useRef<HTMLTextAreaElement | null>(null);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setNotice({ text, type });
    setTimeout(() => setNotice(null), 4000);
  };

  /**
   * Sisipkan variable ke template aktif pada posisi kursor. CS cukup mengklik
   * variable — tidak perlu mengetik kurung kurawalnya sendiri.
   */
  const insertPlaceholder = (token: string) => {
    const el = activeField === 'registration' ? tplRegRef.current : tplPayRef.current;
    const setter = activeField === 'registration' ? setTplReg : setTplPay;
    const current = activeField === 'registration' ? tplReg : tplPay;

    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const next = current.slice(0, start) + token + current.slice(end);
    setter(next);
    setLastInserted(token);

    // Kembalikan fokus & letakkan kursor setelah variable yang disisipkan.
    if (el) {
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + token.length;
        el.setSelectionRange(pos, pos);
      });
    }
    setTimeout(() => setLastInserted(null), 1500);
  };

  const applyData = useCallback((res: CsWaSettingsResponse) => {
    setData(res);
    setTplReg(res.settings.tpl_registration);
    setTplPay(res.settings.tpl_payment);
    setAutoReg(res.settings.auto_registration);
    setAutoPay(res.settings.auto_payment);
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
        if (!cancelled) showNotice(err instanceof Error ? err.message : 'Gagal memuat setelan WA', 'error');
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
        tpl_registration: tplReg,
        tpl_payment: tplPay,
        auto_registration: autoReg,
        auto_payment: autoPay,
      });
      applyData({ ...(data as CsWaSettingsResponse), settings: res.settings });
      setTokenInput('');
      setClearToken(false);
      showNotice('Setelan WhatsApp tersimpan');
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
      if (res.success) showNotice(`Pesan tes terkirim (${res.source === 'cs_token' ? 'token CS' : 'token global'})`);
      else showNotice(res.message || 'Gagal mengirim pesan tes', 'error');
    } catch (err) {
      showNotice(err instanceof Error ? err.message : 'Gagal mengirim pesan tes', 'error');
    }
  };

  const placeholders = data?.placeholders || [];

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        padding: '1.5rem 1.75rem',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
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
            <MessageCircle size={14} /> Notifikasi WhatsApp · Fonnte
          </span>
          <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.2rem', color: '#1E293B', margin: '8px 0 4px 0' }}>
            Pesan WhatsApp per CS
          </h3>
          <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>
            Token Fonnte & template pesan dikustomisasi masing-masing CS. Kirim otomatis: pendaftaran lewat link CS
            dan pembayaran yang dikonfirmasi.
          </p>
        </div>
        {isAdmin && (
          <div style={{ minWidth: '230px' }}>
            <label style={labelStyle}>Kelola setelan CS</label>
            <select
              value={selectedRef}
              onChange={(e) => setSelectedRef(e.target.value)}
              style={{ ...inputStyle, cursor: 'pointer' }}
            >
              {accounts.length === 0 && <option value="">— Belum ada akun CS —</option>}
              {accounts.map((a) => (
                <option key={a.id} value={a.ref_code || ''}>
                  {a.name} ({a.ref_code || 'tanpa ref'})
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', marginTop: '1.25rem', fontWeight: 700, fontSize: '0.9rem' }}>
          <RefreshCw size={16} className="animate-spin" /> Memuat setelan WhatsApp...
        </div>
      ) : data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem', marginTop: '1.25rem' }}>
          {/* Token Fonnte */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '1rem 1.1rem',
            }}
          >
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <KeyRound size={13} /> Token Fonnte ({data.account.name})
            </label>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder={
                  data.settings.fonnte_token_set
                    ? `Tersimpan: ${data.settings.fonnte_token_masked} — isi untuk mengganti`
                    : 'Tempel token Fonnte (dashboard.fonnte.com)'
                }
                style={{ ...inputStyle, maxWidth: '380px', flex: '1 1 260px' }}
                autoComplete="off"
              />
              {data.settings.fonnte_token_set && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748B', fontWeight: 700, cursor: 'pointer' }}>
                  <input type="checkbox" checked={clearToken} onChange={(e) => setClearToken(e.target.checked)} />
                  Hapus token
                </label>
              )}
            </div>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', margin: '6px 0 0 0' }}>
              {data.settings.fonnte_token_set
                ? 'Token ini dipakai untuk semua pengiriman WA dari CS ini.'
                : data.global_token_set
                  ? 'Token CS kosong → memakai token gateway global (Settings → WhatsApp Gateway).'
                  : 'Belum ada token sama sekali — pengiriman akan dilewati sampai token diisi.'}
            </p>
          </div>

          {/* Template: pendaftaran */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem 1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Pesan: pendaftaran diterima (otomatis)</label>
              <Toggle checked={autoReg} onChange={setAutoReg} label={autoReg ? 'Kirim otomatis: ON' : 'Kirim otomatis: OFF'} />
            </div>
            <textarea
              ref={tplRegRef}
              value={tplReg}
              onChange={(e) => setTplReg(e.target.value)}
              onFocus={() => setActiveField('registration')}
              rows={7}
              maxLength={3000}
              style={{
                ...inputStyle,
                marginTop: '0.6rem',
                resize: 'vertical',
                lineHeight: 1.5,
                border: activeField === 'registration' ? '1px solid #6D28D9' : '1px solid #E2E8F0',
              }}
            />
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px', textAlign: 'right' }}>{tplReg.length}/3000</div>
          </div>

          {/* Template: pembayaran */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem 1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Pesan: pembayaran dikonfirmasi (otomatis)</label>
              <Toggle checked={autoPay} onChange={setAutoPay} label={autoPay ? 'Kirim otomatis: ON' : 'Kirim otomatis: OFF'} />
            </div>
            <textarea
              ref={tplPayRef}
              value={tplPay}
              onChange={(e) => setTplPay(e.target.value)}
              onFocus={() => setActiveField('payment')}
              rows={7}
              maxLength={3000}
              style={{
                ...inputStyle,
                marginTop: '0.6rem',
                resize: 'vertical',
                lineHeight: 1.5,
                border: activeField === 'payment' ? '1px solid #6D28D9' : '1px solid #E2E8F0',
              }}
            />
            <div style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '4px', textAlign: 'right' }}>{tplPay.length}/3000</div>
          </div>

          {/* Placeholder */}
          <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1rem 1.1rem', backgroundColor: '#F8FAFC' }}>
            <label style={labelStyle}>Variable yang tersedia — klik untuk menyisipkan</label>
            <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 0.7rem 0' }}>
              Klik salah satu variable untuk menambahkannya ke{' '}
              <strong>{activeField === 'registration' ? 'template pendaftaran' : 'template pembayaran'}</strong> pada posisi kursor.
              Klik kotak teks lain untuk memindahkan tujuan penyisipan.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {placeholders.map((p) => {
                const hint = data?.placeholder_hints?.[p];
                const isJustInserted = lastInserted === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => insertPlaceholder(p)}
                    title={hint ? `${hint.label} — contoh: ${hint.example}` : `Sisipkan ${p}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '2px',
                      padding: '6px 10px',
                      borderRadius: '9px',
                      border: `1px solid ${isJustInserted ? '#6BCB77' : '#DDD6FE'}`,
                      backgroundColor: isJustInserted ? '#ECFDF5' : '#FFFFFF',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <code style={{ fontSize: '0.78rem', fontWeight: 800, color: isJustInserted ? '#047857' : '#6D28D9' }}>
                      {p}
                    </code>
                    <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                      {hint ? hint.label : 'Variabel template'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aksi */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
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
              {isSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              {isSaving ? 'Menyimpan...' : 'Simpan Setelan'}
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
              {data.settings.is_default ? ' · (memakai template bawaan)' : ''}
            </p>
          )}
        </div>
      ) : (
        <p style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '1rem' }}>
          {isAdmin ? 'Pilih CS untuk mengelola setelannya.' : 'Setelan belum tersedia.'}
        </p>
      )}
    </div>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 700, color: checked ? '#047857' : '#94A3B8', cursor: 'pointer' }}>
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    {label}
  </label>
);

export default WaSettingsCard;
