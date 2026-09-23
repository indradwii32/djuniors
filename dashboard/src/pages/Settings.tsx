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
  Users,
  ArrowUp,
  ArrowDown,
  Shuffle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { paymentsApi, notificationsApi, authApi, adminAccountsApi, rotatorApi, BankAccount, AdminAccountItem } from '../utils/api';

const DEFAULT_BANKS: BankAccount[] = [
  {
    id: 'bank-001',
    bank_name: 'BCA Syariah',
    account_number: '8881016052',
    account_name: 'Wahyu Adi Syahputra',
    is_active: 1,
  },
  {
    id: 'bank-002',
    bank_name: 'Bank Mandiri',
    account_number: '1830000895994',
    account_name: 'Wahyu Adi Syahputra',
    is_active: 1,
  },
  {
    id: 'bank-003',
    bank_name: 'Bank BRI',
    account_number: '105501017176507',
    account_name: 'Wahyu Adi Syahputra',
    is_active: 1,
  },
  {
    id: 'bank-004',
    bank_name: 'DANA Wallet',
    account_number: '081252218206',
    account_name: 'Wahyu Adi Syahputra',
    is_active: 1,
  },
];

export const Settings: React.FC = () => {
  const { user } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'bank' | 'whatsapp' | 'profile' | 'security' | 'team'>('bank');

  // Banks State
  const [banks, setBanks] = useState<BankAccount[]>(DEFAULT_BANKS);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState<boolean>(false);
  const [newBankName, setNewBankName] = useState<string>('BCA Syariah');
  const [newAccountNumber, setNewAccountNumber] = useState<string>('');
  const [newAccountName, setNewAccountName] = useState<string>('Wahyu Adi Syahputra');
  const [newAccountType, setNewAccountType] = useState<'bank' | 'ewallet' | 'qris'>('bank');

  // WhatsApp State
  const [waConnected, setWaConnected] = useState<boolean | null>(null);
  const [waToken, setWaToken] = useState<string>('');
  const [isTestingWa, setIsTestingWa] = useState<boolean>(false);
  const [isSavingWaToken, setIsSavingWaToken] = useState<boolean>(false);
  const [waAutoNotifyEnroll, setWaAutoNotifyEnroll] = useState<boolean>(true);
  const [waAutoNotifyPayment, setWaAutoNotifyPayment] = useState<boolean>(true);
  const [waAutoNotifyReminder, setWaAutoNotifyReminder] = useState<boolean>(true);

  // Institution Profile State
  const [brandName, setBrandName] = useState<string>('D’Juniors Learning Center');
  const [brandTagline, setBrandTagline] = useState<string>('Lembaga pembelajaran online yang membantu anak belajar Matematika dengan cara menyenangkan, interaktif, dan sesuai kemampuan masing-masing anak');
  const [contactPhone, setContactPhone] = useState<string>('0877 1497 7001');
  const [contactEmail, setContactEmail] = useState<string>('admin@djuniorslc.com');
  const [contactAddress, setContactAddress] = useState<string>('Perum Bringin Indah Persada C 9 Tulungrejo, Pare, Kediri, Jawa Timur');

  // Security / Password State
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // Akun Tim (admin & CS) State
  const [accounts, setAccounts] = useState<AdminAccountItem[]>([]);
  // Rotator pendaftaran (delegasi otomatis pendaftaran tanpa ref → CS)
  const [rotatorEnabled, setRotatorEnabled] = useState<boolean>(false);
  const [rotatorRefs, setRotatorRefs] = useState<string[]>([]);
  const [isSavingRotator, setIsSavingRotator] = useState<boolean>(false);
  const isAdminRole = user?.role === 'admin' || user?.role === 'super_admin';
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);
  const [teamModalMode, setTeamModalMode] = useState<'create' | 'edit'>('create');
  const [teamEditId, setTeamEditId] = useState<string | null>(null);
  const [teamUsername, setTeamUsername] = useState<string>('');
  const [teamName, setTeamName] = useState<string>('');
  const [teamPassword, setTeamPassword] = useState<string>('');
  const [teamRole, setTeamRole] = useState<'cs' | 'admin'>('cs');
  const [isSavingTeam, setIsSavingTeam] = useState<boolean>(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadData = useCallback(async () => {
    try {
      const [banksRes, waRes, tokenRes] = await Promise.allSettled([
        paymentsApi.getBanks(),
        notificationsApi.getWaStatus(),
        notificationsApi.getFonnteToken(),
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

      if (tokenRes.status === 'fulfilled' && tokenRes.value.isSet) {
        setWaToken(tokenRes.value.token);
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

  // Muat daftar akun tim (admin/CS) — tab Akun Tim
  const loadAccounts = useCallback(async () => {
    try {
      const res = await adminAccountsApi.list();
      if (res?.accounts) setAccounts(res.accounts);
    } catch {
      // non-fatal: tab Akun Tim hanya menampilkan pesan kosong
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Muat konfigurasi rotator (admin saja — endpoint /api/admin/* menolak CS)
  const loadRotator = useCallback(async () => {
    if (!isAdminRole) return;
    try {
      const res = await rotatorApi.get();
      setRotatorEnabled(Boolean(res.rotator?.enabled));
      setRotatorRefs(Array.isArray(res.rotator?.refs) ? res.rotator.refs : []);
    } catch {
      // non-fatal: kartu hanya menampilkan keadaan kosong
    }
  }, [isAdminRole]);

  useEffect(() => {
    loadRotator();
  }, [loadRotator]);

  const toggleRotatorMember = (refCode: string, on: boolean) => {
    setRotatorRefs((prev) => (on ? [...prev, refCode] : prev.filter((r) => r !== refCode)));
  };

  const moveRotatorRef = (index: number, dir: -1 | 1) => {
    setRotatorRefs((prev) => {
      const arr = [...prev];
      const j = index + dir;
      if (j < 0 || j >= arr.length) return prev;
      [arr[index], arr[j]] = [arr[j], arr[index]];
      return arr;
    });
  };

  const handleSaveRotator = async () => {
    if (rotatorEnabled && rotatorRefs.length === 0) {
      showToast('Centang minimal 1 CS untuk rotator aktif', 'error');
      return;
    }
    try {
      setIsSavingRotator(true);
      const res = await rotatorApi.save({ enabled: rotatorEnabled, refs: rotatorRefs });
      setRotatorEnabled(Boolean(res.rotator?.enabled));
      setRotatorRefs(res.rotator?.refs || []);
      showToast('Rotator pendaftaran disimpan!');
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan rotator', 'error');
    } finally {
      setIsSavingRotator(false);
    }
  };

  // Persistensi rekening ke server (sebelumnya hanya state lokal / tidak tersimpan)
  const handleToggleBank = async (id: string) => {
    const target = banks.find((b) => b.id === id);
    if (!target) return;
    const nextActive = target.is_active ? 0 : 1;
    try {
      await paymentsApi.updateBank(id, { is_active: nextActive });
      setBanks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_active: nextActive } : b))
      );
      showToast('Status rekening berhasil disimpan!');
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan status rekening', 'error');
    }
  };

  // Ubah jenis akun pembayaran (bank / e-wallet / QRIS) — menentukan metode
  // mana yang memakai rekening ini saat detail pembayaran ditampilkan.
  const handleChangeBankType = async (id: string, type: 'bank' | 'ewallet' | 'qris') => {
    try {
      await paymentsApi.updateBank(id, { type });
      setBanks((prev) => prev.map((b) => (b.id === id ? { ...b, type } : b)));
      showToast('Jenis akun pembayaran berhasil disimpan!');
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan jenis akun', 'error');
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountNumber.trim()) {
      showToast('Nomor rekening harus diisi', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const res = await paymentsApi.addBank({
        bank_name: newBankName.trim(),
        account_number: newAccountNumber.trim(),
        account_name: newAccountName.trim() || 'Wahyu Adi Syahputra',
        type: newAccountType,
      });
      if (res?.bank) {
        setBanks((prev) => [...prev, res.bank]);
      }
      showToast('Rekening pembayaran baru berhasil ditambahkan!');
      setIsAddBankModalOpen(false);
      setNewAccountNumber('');
    } catch (err: any) {
      showToast(err?.message || 'Gagal menambahkan rekening', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Akun Tim: buat / edit / aktif-nonaktif ---
  const openCreateTeam = () => {
    setTeamModalMode('create');
    setTeamEditId(null);
    setTeamUsername('');
    setTeamName('');
    setTeamPassword('');
    setTeamRole('cs');
    setIsTeamModalOpen(true);
  };

  const openEditTeam = (acc: AdminAccountItem) => {
    setTeamModalMode('edit');
    setTeamEditId(acc.id);
    setTeamUsername(acc.username);
    setTeamName(acc.name);
    setTeamPassword('');
    setTeamRole(acc.role === 'admin' || acc.role === 'super_admin' ? 'admin' : 'cs');
    setIsTeamModalOpen(true);
  };

  const handleSubmitTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSavingTeam(true);
      if (teamModalMode === 'create') {
        const res = await adminAccountsApi.create({
          username: teamUsername.trim(),
          name: teamName.trim(),
          password: teamPassword,
          role: teamRole,
        });
        showToast(res?.message || 'Akun berhasil dibuat');
      } else {
        const payload: { name: string; role: string; password?: string } = {
          name: teamName.trim(),
          role: teamRole,
        };
        if (teamPassword) payload.password = teamPassword;
        await adminAccountsApi.update(teamEditId!, payload);
        showToast('Akun berhasil diperbarui');
      }
      setIsTeamModalOpen(false);
      await loadAccounts();
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan akun', 'error');
    } finally {
      setIsSavingTeam(false);
    }
  };

  const handleToggleAccount = async (acc: AdminAccountItem) => {
    try {
      await adminAccountsApi.update(acc.id, { is_active: !acc.is_active });
      showToast('Status akun diperbarui');
      await loadAccounts();
    } catch (err: any) {
      showToast(err?.message || 'Gagal mengubah status akun', 'error');
    }
  };

  const handleSaveWaToken = async () => {
    if (!waToken || waToken.trim() === '' || waToken.includes('•')) {
      showToast('Masukkan token Fonnte yang valid', 'error');
      return;
    }
    try {
      setIsSavingWaToken(true);
      const res = await notificationsApi.saveFonnteToken(waToken.trim());
      if (res.success) {
        showToast('Token Fonnte berhasil disimpan!');
        const [waRes, tokenRes] = await Promise.allSettled([
          notificationsApi.getWaStatus(),
          notificationsApi.getFonnteToken(),
        ]);
        if (waRes.status === 'fulfilled') {
          setWaConnected(waRes.value.connected);
        }
        if (tokenRes.status === 'fulfilled' && tokenRes.value.isSet) {
          setWaToken(tokenRes.value.token);
        }
      } else {
        showToast(res.message || 'Gagal menyimpan token Fonnte', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Gagal menyimpan token Fonnte', 'error');
    } finally {
      setIsSavingWaToken(false);
    }
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

        <button
          onClick={() => setActiveTab('team')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.75rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            backgroundColor: activeTab === 'team' ? '#4A90D9' : '#FFFFFF',
            color: activeTab === 'team' ? '#FFFFFF' : '#475569',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: activeTab === 'team' ? '0 4px 12px rgba(74, 144, 217, 0.3)' : 'none',
            transition: 'all 0.2s',
          }}
        >
          <Users size={18} />
          <span>Akun Tim (CS)</span>
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
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>JENIS / METODE</th>
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
                          <select
                            value={bank.type || 'bank'}
                            onChange={(e) => handleChangeBankType(bank.id, e.target.value as 'bank' | 'ewallet' | 'qris')}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#334155',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              fontFamily: 'inherit',
                              cursor: 'pointer',
                            }}
                            aria-label={`Jenis akun pembayaran ${bank.bank_name}`}
                          >
                            <option value="bank">🏦 Transfer Bank</option>
                            <option value="ewallet">💳 E-Wallet</option>
                            <option value="qris">📱 QRIS</option>
                          </select>
                        </td>
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
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="password"
                    value={waToken}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (waToken.includes('•')) {
                        setWaToken(val.replace(/•/g, ''));
                      } else {
                        setWaToken(val);
                      }
                    }}
                    onFocus={() => {
                      if (waToken.includes('•')) {
                        setWaToken('');
                      }
                    }}
                    placeholder="Masukkan token Fonnte"
                    style={{ flex: 1, minWidth: '200px', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                  />
                  <button
                    onClick={handleSaveWaToken}
                    disabled={isSavingWaToken || !waToken.trim() || waToken.includes('•')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0.65rem 1.25rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#10B981',
                      color: '#FFFFFF',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: (isSavingWaToken || !waToken.trim() || waToken.includes('•')) ? 'not-allowed' : 'pointer',
                      opacity: (isSavingWaToken || !waToken.trim() || waToken.includes('•')) ? 0.6 : 1,
                    }}
                  >
                    <Save size={14} />
                    <span>{isSavingWaToken ? 'Menyimpan...' : 'Simpan Token'}</span>
                  </button>
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
                      cursor: isTestingWa ? 'not-allowed' : 'pointer',
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

      {/* Tab 5: Akun Tim (admin & CS) */}
      {activeTab === 'team' && (
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
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.25rem', margin: '0 0 4px 0', color: '#1E293B' }}>
                Akun Tim Dashboard
              </h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B' }}>
                Buat akun <strong>CS</strong> (hanya bisa mengelola pendaftaran dari link miliknya) atau akun <strong>Admin</strong> baru.
                Setiap CS otomatis mendapat kode link pendaftaran sendiri.
              </p>
            </div>
            <button
              onClick={openCreateTeam}
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
              <span>Tambah Akun</span>
            </button>
          </div>

          {/* Rotator Pendaftaran (delegasi otomatis ke CS) — admin saja */}
          {isAdminRole && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '1.5rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.15rem', margin: '0 0 4px 0', color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shuffle size={18} color="#6D28D9" /> Rotator Pendaftaran
                </h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748B', maxWidth: '640px' }}>
                  Pendaftaran yang masuk <strong>langsung tanpa link CS</strong> (tanpa <code>?ref=</code> atau kode
                  tidak dikenal) akan didelegasikan otomatis ke CS berikutnya secara bergantian (round-robin) sesuai
                  urutan di bawah. Pendaftaran lewat link CS tetap milik CS tersebut. Delegasi juga membuat notifikasi
                  WhatsApp CS bersangkutan ikut terkirim (sesuai setelannya).
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: rotatorEnabled ? '#047857' : '#94A3B8',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rotatorEnabled}
                    onChange={(e) => setRotatorEnabled(e.target.checked)}
                  />
                  {rotatorEnabled ? 'AKTIF' : 'NONAKTIF'}
                </label>
                <button
                  onClick={handleSaveRotator}
                  disabled={isSavingRotator}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: isSavingRotator ? '#94A3B8' : '#6D28D9',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: isSavingRotator ? 'wait' : 'pointer',
                  }}
                >
                  {isSavingRotator ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
                  {isSavingRotator ? 'Menyimpan...' : 'Simpan Rotator'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '1.1rem' }}>
              {/* Urutan rotasi */}
              <div style={{ flex: '1 1 300px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '0.9rem 1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                  Urutan rotasi ({rotatorRefs.length} CS)
                </div>
                {rotatorRefs.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0 }}>
                    Belum ada CS dipilih — pilih dari daftar di samping.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {rotatorRefs.map((refCode, idx) => {
                      const acc = accounts.find((a) => a.ref_code === refCode);
                      return (
                        <div
                          key={refCode}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: '9px',
                            padding: '0.45rem 0.6rem',
                          }}
                        >
                          <span
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '6px',
                              backgroundColor: '#6D28D9',
                              color: '#FFFFFF',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {acc ? acc.name : refCode}
                            <span style={{ fontWeight: 500, color: '#94A3B8', fontSize: '0.75rem' }}> · {refCode}</span>
                          </span>
                          <button
                            onClick={() => moveRotatorRef(idx, -1)}
                            disabled={idx === 0}
                            title="Naik"
                            style={{ border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', borderRadius: '6px', padding: '3px 6px', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1, display: 'flex', color: '#475569' }}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            onClick={() => moveRotatorRef(idx, 1)}
                            disabled={idx === rotatorRefs.length - 1}
                            title="Turun"
                            style={{ border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', borderRadius: '6px', padding: '3px 6px', cursor: idx === rotatorRefs.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === rotatorRefs.length - 1 ? 0.4 : 1, display: 'flex', color: '#475569' }}
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            onClick={() => toggleRotatorMember(refCode, false)}
                            title="Keluarkan dari rotator"
                            style={{ border: '1px solid #FECACA', backgroundColor: '#FEF2F2', borderRadius: '6px', padding: '3px 6px', cursor: 'pointer', display: 'flex', color: '#DC2626' }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CS lainnya */}
              <div style={{ flex: '1 1 300px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '0.9rem 1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.6rem' }}>
                  Semua CS — klik untuk ikut rotator
                </div>
                {accounts.filter((a) => a.role === 'cs').length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: '#94A3B8', margin: 0 }}>
                    Belum ada akun CS. Buat lewat tombol <strong>Tambah Akun</strong>.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                    {accounts
                      .filter((a) => a.role === 'cs')
                      .map((a) => {
                        const inRotator = !!a.ref_code && rotatorRefs.includes(a.ref_code);
                        return (
                          <div
                            key={a.id}
                            onClick={() => a.ref_code && toggleRotatorMember(a.ref_code, !inRotator)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              backgroundColor: inRotator ? '#F5F3FF' : '#FFFFFF',
                              border: `1px solid ${inRotator ? '#C4B5FD' : '#E2E8F0'}`,
                              borderRadius: '9px',
                              padding: '0.45rem 0.6rem',
                              cursor: a.ref_code ? 'pointer' : 'not-allowed',
                              opacity: a.ref_code ? 1 : 0.55,
                            }}
                          >
                            <input
                              type="checkbox"
                              readOnly
                              checked={inRotator}
                              disabled={!a.ref_code || !a.is_active}
                              style={{ cursor: 'pointer', accentColor: '#6D28D9' }}
                            />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', flex: 1 }}>
                              {a.name}
                              <span style={{ fontWeight: 500, color: '#94A3B8', fontSize: '0.75rem' }}>
                                {' '}· {a.ref_code || 'tanpa ref'}
                                {!a.is_active ? ' · nonaktif' : ''}
                              </span>
                            </span>
                            {inRotator && (
                              <span style={{ fontSize: '0.68rem', fontWeight: 800, backgroundColor: '#6D28D9', color: '#FFFFFF', padding: '2px 7px', borderRadius: '6px' }}>
                                IKUT
                              </span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

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
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>USERNAME</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>NAMA</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>ROLE</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>KODE LINK</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>PENDAFTARAN</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>STATUS</th>
                    <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textAlign: 'right' }}>AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                        Belum ada data akun. Klik "Tambah Akun" untuk membuat akun CS.
                      </td>
                    </tr>
                  ) : (
                    accounts.map((acc) => {
                      const isActive = Boolean(acc.is_active);
                      const roleLabel = acc.role === 'super_admin' ? 'Super Admin' : acc.role === 'admin' ? 'Admin' : 'CS';
                      const isSelf = acc.id === user?.id;
                      return (
                        <tr key={acc.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 700, color: '#1E293B', fontSize: '0.875rem' }}>
                            @{acc.username}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#1E293B' }}>{acc.name}</td>
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                backgroundColor: acc.role === 'cs' ? '#F5F3FF' : acc.role === 'super_admin' ? '#FEF3C7' : '#EFF6FF',
                                color: acc.role === 'cs' ? '#6D28D9' : acc.role === 'super_admin' ? '#B45309' : '#1D4ED8',
                              }}
                            >
                              {roleLabel}
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 700, color: '#6D28D9', fontSize: '0.85rem' }}>
                            {acc.ref_code || '-'}
                          </td>
                          <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#475569' }}>
                            {acc.ref_code ? (
                              <>
                                <strong style={{ color: '#1E293B' }}>{Number(acc.reg_total) || 0}</strong> masuk ·{' '}
                                <strong style={{ color: '#059669' }}>{Number(acc.reg_paid) || 0}</strong> lunas
                              </>
                            ) : (
                              '-'
                            )}
                          </td>
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
                              <span>{isActive ? 'Aktif' : 'Nonaktif'}</span>
                            </span>
                          </td>
                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                              <button
                                className="btn-touch-sm"
                                onClick={() => openEditTeam(acc)}
                                style={{
                                  padding: '7px 12px',
                                  borderRadius: '8px',
                                  border: '1px solid #CBD5E1',
                                  backgroundColor: '#FFFFFF',
                                  color: '#334155',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                Edit / Reset PW
                              </button>
                              {!isSelf && (
                                <button
                                  className="btn-touch-sm"
                                  onClick={() => handleToggleAccount(acc)}
                                  style={{
                                    padding: '7px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #FECACA',
                                    backgroundColor: isActive ? '#FEF2F2' : '#F0FDF4',
                                    color: isActive ? '#DC2626' : '#15803D',
                                    fontSize: '0.78rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  {isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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
                  placeholder="Contoh: 8881016052"
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
                  placeholder="Contoh: Wahyu Adi Syahputra"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Jenis / Metode Pembayaran *
                </label>
                <select
                  value={newAccountType}
                  onChange={(e) => setNewAccountType(e.target.value as 'bank' | 'ewallet' | 'qris')}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none', fontFamily: 'inherit', backgroundColor: '#FFFFFF' }}
                >
                  <option value="bank">🏦 Transfer Bank</option>
                  <option value="ewallet">💳 E-Wallet</option>
                  <option value="qris">📱 QRIS</option>
                </select>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                  Detail pembayaran yang tampil ke pendaftar mengikuti metode yang mereka pilih.
                </p>
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

      {/* Modal: Tambah / Edit Akun Tim */}
      {isTeamModalOpen && (
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
                <Users size={20} color="#4A90D9" />
                <h3 style={{ fontFamily: "'Baloo 2', cursive", fontSize: '1.3rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>
                  {teamModalMode === 'create' ? 'Tambah Akun Tim' : 'Edit Akun Tim'}
                </h3>
              </div>
              <button
                onClick={() => setIsTeamModalOpen(false)}
                style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Role *
                </label>
                <select
                  value={teamRole}
                  onChange={(e) => setTeamRole(e.target.value as 'cs' | 'admin')}
                  disabled={teamModalMode === 'edit' && user?.role !== 'super_admin'}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    outline: 'none',
                    backgroundColor: '#FFFFFF',
                    fontWeight: 600,
                  }}
                >
                  <option value="cs">CS — hanya kelola pendaftaran dari link-nya</option>
                  <option value="admin">Admin — akses penuh</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Username *
                </label>
                <input
                  type="text"
                  required
                  disabled={teamModalMode === 'edit'}
                  value={teamUsername}
                  onChange={(e) => setTeamUsername(e.target.value.toLowerCase())}
                  placeholder="Contoh: cs01"
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    outline: 'none',
                    opacity: teamModalMode === 'edit' ? 0.6 : 1,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Contoh: Rina (CS)"
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: '#475569', marginBottom: '0.35rem' }}>
                  Password {teamModalMode === 'create' ? '*' : '(kosongkan jika tidak diganti)'}
                </label>
                <input
                  type="text"
                  required={teamModalMode === 'create'}
                  value={teamPassword}
                  onChange={(e) => setTeamPassword(e.target.value)}
                  placeholder={teamModalMode === 'create' ? 'Minimal 6 karakter' : 'Isi hanya untuk ganti password'}
                  style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', cursor: 'pointer', fontWeight: 600 }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingTeam}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#4A90D9',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    cursor: isSavingTeam ? 'not-allowed' : 'pointer',
                    opacity: isSavingTeam ? 0.7 : 1,
                  }}
                >
                  {isSavingTeam ? 'Menyimpan...' : teamModalMode === 'create' ? 'Buat Akun' : 'Simpan Perubahan'}
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
