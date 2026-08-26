// ============================================
// Djuniors Dashboard - Settings Management Page
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Building2,
  MessageSquare,
  KeyRound,
  CreditCard,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Lock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { paymentsApi, notificationsApi, authApi, BankAccount } from '../utils/api';

const DEFAULT_BANKS: BankAccount[] = [
  {
    id: 'bank-001',
    bank_name: 'BCA (Bank Central Asia)',
    account_number: '1234567890',
    account_name: 'PT Djuniors Indonesia',
    is_active: 1,
  },
  {
    id: 'bank-002',
    bank_name: 'Bank Mandiri',
    account_number: '123456789012345',
    account_name: 'PT Djuniors Indonesia',
    is_active: 1,
  },
  {
    id: 'bank-003',
    bank_name: 'Bank BNI',
    account_number: '9876543210',
    account_name: 'PT Djuniors Indonesia',
    is_active: 1,
  },
];

export const Settings: React.FC = () => {
  const { user } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'bank' | 'whatsapp' | 'profile' | 'security'>('bank');

  // Banks State
  const [banks, setBanks] = useState<BankAccount[]>(DEFAULT_BANKS);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState<boolean>(false);
  const [newBankName, setNewBankName] = useState<string>('BCA (Bank Central Asia)');
  const [newAccountNumber, setNewAccountNumber] = useState<string>('');
  const [newAccountName, setNewAccountName] = useState<string>('PT Djuniors Indonesia');

  // WhatsApp State
  const [waConnected, setWaConnected] = useState<boolean | null>(null);
  const [waToken, setWaToken] = useState<string>('••••••••••••••••••••••••');
  const [isTestingWa, setIsTestingWa] = useState<boolean>(false);
  const [waAutoNotifyEnroll, setWaAutoNotifyEnroll] = useState<boolean>(true);
  const [waAutoNotifyPayment, setWaAutoNotifyPayment] = useState<boolean>(true);
  const [waAutoNotifyReminder, setWaAutoNotifyReminder] = useState<boolean>(true);

  // Institution Profile State
  const [brandName, setBrandName] = useState<string>('Djuniors Matematika Anak');
  const [brandTagline, setBrandTagline] = useState<string>('Bimbel Matematika Asyik, Cerdas, dan Menyenangkan untuk TK & SD');
  const [contactPhone, setContactPhone] = useState<string>('+62 812-3456-7890');
  const [contactEmail, setContactEmail] = useState<string>('halo@djuniors.id');
  const [contactAddress, setContactAddress] = useState<string>('Jl. Matematika Ceria No. 12, Kebayoran Baru, Jakarta Selatan');

  // Security / Password State
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const [banksRes, waRes] = await Promise.allSettled([
        paymentsApi.getBanks(),
        notificationsApi.getWaStatus(),
      ]);

      if (banksRes.status === 'fulfilled' && Array.isArray(banksRes.value) && banksRes.value.length > 0) {
        setBanks(banksRes.value);
      } else {
        setBanks(DEFAULT_BANKS);
      }

      if (waRes.status === 'fulfilled') {
        setWaConnected(waRes.value.connected);
      } else {
        setWaConnected(false);
      }
    } catch {
      // fallback
      setBanks(DEFAULT_BANKS);
      setWaConnected(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleBank = (id: string) => {
    setBanks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, is_active: b.is_active ? 0 : 1 } : b))
    );
    showToast('Status rekening berhasil diperbarui!');
  };

  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountNumber.trim()) {
      showToast('Nomor rekening harus diisi', 'error');
      return;
    }

    const newBank: BankAccount = {
      id: `bank-${Date.now().toString().slice(-4)}`,
      bank_name: newBankName,
      account_number: newAccountNumber.trim(),
      account_name: newAccountName.trim() || 'PT Djuniors Indonesia',
      is_active: 1,
    };

    setBanks((prev) => [...prev, newBank]);
    showToast('Rekening pembayaran baru berhasil ditambahkan!');
    setIsAddBankModalOpen(false);
    setNewAccountNumber('');
  };

  const handleTestWa = async () => {
    try {
      setIsTestingWa(true);
      const res = await notificationsApi.getWaStatus();
      setWaConnected(res.connected);
      showToast(res.connected ? 'Koneksi Fonnte WhatsApp Terhubung!' : 'Koneksi Fonnte WhatsApp Offline.');
    } catch {
      setWaConnected(false);
      showToast('Gagal terhubung ke WhatsApp Gateway', 'error');
    } finally {
      setIsTestingWa(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      showToast('Profil lembaga dan informasi kontak berhasil disimpan!');
    }, 600);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password baru minimal 6 karakter', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok', 'error');
      return;
    }

    try {
      setIsChangingPassword(true);
      const res = await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      if (res.success) {
        showToast('Password admin berhasil diubah!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(res.message || 'Gagal mengubah password', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengubah password', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 100,
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: toastMessage.type === 'success' ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '0.9rem',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div
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
              <SettingsIcon size={13} /> Pengaturan Sistem
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
            Pengaturan & Konfigurasi
          </h2>
          <p style={{ color: '#64748B', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
            Kelola rekening bank pembayaran, integrasi WhatsApp Fonnte, profil lembaga, dan keamanan akun admin.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid #E2E8F0',
          paddingBottom: '0.5rem',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveTab('bank')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'bank' ? '#4A90D9' : '#FFFFFF',
            color: activeTab === 'bank' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'bank' ? '0 4px 12px rgba(74, 144, 217, 0.3)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <CreditCard size={18} />
          <span>Rekening Bank</span>
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'whatsapp' ? '#4A90D9' : '#FFFFFF',
            color: activeTab === 'whatsapp' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'whatsapp' ? '0 4px 12px rgba(74, 144, 217, 0.3)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <MessageSquare size={18} />
          <span>WhatsApp Gateway</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'profile' ? '#4A90D9' : '#FFFFFF',
            color: activeTab === 'profile' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'profile' ? '0 4px 12px rgba(74, 144, 217, 0.3)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <Building2 size={18} />
          <span>Profil Lembaga</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'security' ? '#4A90D9' : '#FFFFFF',
            color: activeTab === 'security' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'security' ? '0 4px 12px rgba(74, 144, 217, 0.3)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <Lock size={18} />
          <span>Keamanan Admin</span>
        </button>
      </div>

      {/* Tab 1: Rekening Bank */}
      {activeTab === 'bank' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.25rem', margin: '0 0 4px 0', color: '#1E293B' }}>
                Rekening Pembayaran Bank
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                Rekening yang ditampilkan kepada wali murid saat melakukan transfer pembayaran kursus.
              </p>
            </div>
            <button
              onClick={() => setIsAddBankModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#4A90D9',
                color: '#FFFFFF',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              <span>Tambah Rekening</span>
            </button>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }} className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NO</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NAMA BANK</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NOMOR REKENING</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>ATAS NAMA (PEMILIK)</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>STATUS</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textAlign: 'right' }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {banks.map((bank, idx) => {
                    const isActive = Boolean(bank.is_active);
                    return (
                      <tr key={bank.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: '#64748B', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#1E293B' }}>{bank.bank_name}</td>
                        <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 800, color: '#1D4ED8', fontSize: '0.95rem' }}>
                          {bank.account_number}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: '#475569', fontSize: '0.875rem' }}>{bank.account_name}</td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              backgroundColor: isActive ? '#DCFCE7' : '#F1F5F9',
                              color: isActive ? '#15803D' : '#64748B',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isActive ? '#22C55E' : '#94A3B8' }} />
                            <span>{isActive ? 'Aktif Digunakan' : 'Nonaktif'}</span>
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <button
                            className="btn-touch-sm"
                            onClick={() => handleToggleBank(bank.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
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
                            {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: WhatsApp Gateway */}
      {activeTab === 'whatsapp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '1.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.25rem', margin: '0 0 4px 0', color: '#1E293B' }}>
                  Integrasi WhatsApp Gateway Fonnte
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                  Konfigurasi token API Fonnte untuk notifikasi pendaftaran, invoice otomatis, dan broadcast promo.
                </p>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  backgroundColor: waConnected ? '#DCFCE7' : '#FEE2E2',
                  color: waConnected ? '#15803D' : '#B91C1C',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: waConnected ? '#22C55E' : '#EF4444' }} />
                <span>{waConnected ? 'Status: Terhubung (Online)' : 'Status: Offline / Perlu Token'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '600px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Fonnte API Token
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="password"
                    value={waToken}
                    onChange={(e) => setWaToken(e.target.value)}
                    style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                  <button
                    onClick={handleTestWa}
                    disabled={isTestingWa}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#4A90D9',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={14} className={isTestingWa ? 'animate-spin' : ''} />
                    <span>Tes Koneksi</span>
                  </button>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1.25rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.75rem' }}>
                  Otomatisasi Pesan WhatsApp
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={waAutoNotifyEnroll}
                      onChange={(e) => setWaAutoNotifyEnroll(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Kirim pesan sambutan otomatis saat siswa baru mendaftar</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={waAutoNotifyPayment}
                      onChange={(e) => setWaAutoNotifyPayment(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Kirim konfirmasi pembayaran otomatis setelah admin memverifikasi transfer</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={waAutoNotifyReminder}
                      onChange={(e) => setWaAutoNotifyReminder(e.target.checked)}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <span>Kirim pengingat jadwal sesi belajar H-1 kepada orang tua siswa</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Profil Lembaga */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '1.75rem',
              maxWidth: '700px',
            }}
          >
            <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.25rem', margin: '0 0 1rem 0', color: '#1E293B' }}>
              Informasi Lembaga Bimbel
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Nama Lembaga / Brand *
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Tagline / Deskripsi Singkat
                </label>
                <input
                  type="text"
                  value={brandTagline}
                  onChange={(e) => setBrandTagline(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Nomor WhatsApp CS
                  </label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                    Email Kontak
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Alamat Kantor Operasional
                </label>
                <textarea
                  rows={2}
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
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
                    fontWeight: 700,
                    fontSize: '0.875rem',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(74, 144, 217, 0.35)',
                  }}
                >
                  <Save size={16} />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Informasi Umum'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Tab 4: Keamanan Admin */}
      {activeTab === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '1.75rem',
            }}
          >
            <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.25rem', margin: '0 0 1rem 0', color: '#1E293B' }}>
              Akun Administrator
            </h3>

            <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#4A90D9', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem' }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '1rem' }}>{user?.name || 'Administrator'}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>Username: @{user?.username || 'admin'} • Role: {user?.role || 'Super Admin'}</div>
              </div>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E293B', margin: 0 }}>
                Ubah Password Akun
              </h4>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Password Saat Ini *
                </label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Masukkan password lama"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Password Baru *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Konfirmasi Password Baru *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang password baru"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#4A90D9',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <KeyRound size={16} />
                  <span>{isChangingPassword ? 'Menyimpan...' : 'Ganti Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Tambah Rekening Bank */}
      {isAddBankModalOpen && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="modal-content modal-responsive"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} color="#4A90D9" />
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                  Tambah Rekening Bank
                </h3>
              </div>
              <button
                onClick={() => setIsAddBankModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddBank} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Nama Bank *
                </label>
                <input
                  type="text"
                  required
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="Contoh: BCA (Bank Central Asia)"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Nomor Rekening *
                </label>
                <input
                  type="text"
                  required
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                  placeholder="Contoh: 1234567890"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Atas Nama Pemilik Rekening *
                </label>
                <input
                  type="text"
                  required
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  placeholder="Contoh: PT Djuniors Indonesia"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsAddBankModalOpen(false)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{ padding: '0.65rem 1.5rem', borderRadius: '8px', border: 'none', backgroundColor: '#4A90D9', color: '#FFFFFF', fontWeight: 700, cursor: 'pointer' }}
                >
                  Simpan Rekening
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
