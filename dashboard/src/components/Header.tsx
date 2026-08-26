// ============================================
// Djuniors Dashboard - Header Component
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  ExternalLink,
  ChevronDown,
  KeyRound,
  LogOut,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi, authApi } from '../utils/api';

interface HeaderProps {
  onToggleSidebar: () => void;
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  title = 'Dashboard Admin',
  subtitle,
}) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [waConnected, setWaConnected] = useState<boolean | null>(null);

  // Change password form state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check WA status on mount
  useEffect(() => {
    let isMounted = true;
    notificationsApi
      .getWaStatus()
      .then((res) => {
        if (isMounted) setWaConnected(res.connected);
      })
      .catch(() => {
        if (isMounted) setWaConnected(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password baru minimal 6 karakter!' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi password tidak cocok!' });
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      if (res.success) {
        setPasswordMsg({ type: 'success', text: 'Password berhasil diubah!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          setPasswordModalOpen(false);
          setPasswordMsg(null);
        }, 1500);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Gagal mengubah password';
      setPasswordMsg({ type: 'error', text: errMsg });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Format today's date in Indonesian
  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <>
      <header
        style={{
          minHeight: '70px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '0 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 30,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          fontFamily: "'Nunito', sans-serif",
        }}
        className="dashboard-header"
      >
        {/* Left Side: Mobile Hamburger & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
          <button
            onClick={onToggleSidebar}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '10px',
              minWidth: '44px',
              minHeight: '44px',
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
              flexShrink: 0,
            }}
            className="lg-hidden"
            aria-label="Buka menu navigasi"
          >
            <Menu size={22} />
          </button>

          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <h1
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#1E293B',
                lineHeight: 1.2,
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {title}
            </h1>
            <div
              style={{
                fontSize: '0.75rem',
                color: '#64748B',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {subtitle || todayFormatted}
            </div>
          </div>
        </div>

        {/* Right Side: WA Status, Public Link, User Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* WhatsApp Status Pill */}
          <div
            title={`Status Gateway WhatsApp Fonnte: ${
              waConnected ? 'Terhubung' : 'Terputus/Perlu Konfigurasi'
            }`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: waConnected ? '#DCFCE7' : '#FEE2E2',
              color: waConnected ? '#15803D' : '#B91C1C',
            }}
            className="hidden-mobile"
          >
            <MessageSquare size={14} />
            <span>WA: {waConnected ? 'Terhubung' : 'Offline'}</span>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: waConnected ? '#22C55E' : '#EF4444',
              }}
            />
          </div>

          {/* External link to main website */}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            title="Kunjungi Website Utama"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: '#EFF6FF',
              color: '#4A90D9',
              textDecoration: 'none',
              transition: 'background 0.2s',
            }}
            className="hidden-mobile"
          >
            <span>Web Utama</span>
            <ExternalLink size={14} />
          </a>

          {/* User Profile Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{
                background: 'transparent',
                border: '1px solid #E2E8F0',
                borderRadius: '10px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#4A90D9';
                e.currentTarget.style.backgroundColor = '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#4A90D9',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div style={{ textAlign: 'left' }} className="hidden-mobile">
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#1E293B',
                    lineHeight: 1.2,
                  }}
                >
                  {user?.name || 'Admin'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                  {user?.role?.replace('_', ' ') || 'Super Admin'}
                </div>
              </div>
              <ChevronDown size={15} color="#64748B" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  width: '220px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #E2E8F0',
                  padding: '0.5rem',
                  zIndex: 50,
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                <div
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid #F1F5F9',
                    marginBottom: '0.25rem',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>
                    Masuk sebagai
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1E293B' }}>
                    @{user?.username || 'admin'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    setPasswordModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                    e.currentTarget.style.color = '#4A90D9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#334155';
                  }}
                >
                  <KeyRound size={16} />
                  <span>Ubah Password</span>
                </button>

                <div
                  style={{
                    height: '1px',
                    backgroundColor: '#F1F5F9',
                    margin: '0.25rem 0',
                  }}
                />

                <button
                  onClick={async () => {
                    setDropdownOpen(false);
                    if (window.confirm('Yakin ingin keluar?')) {
                      await logout();
                    }
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: '#EF4444',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEF2F2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <LogOut size={16} />
                  <span>Keluar</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal Ubah Password */}
      {passwordModalOpen && (
        <div
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
          className="modal-overlay"
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '420px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              fontFamily: "'Nunito', sans-serif",
            }}
            className="modal-content modal-responsive"
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="#4A90D9" />
                <h3
                  style={{
                    fontFamily: "'Baloo 2', cursive",
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    margin: 0,
                    color: '#1E293B',
                  }}
                >
                  Ubah Password Admin
                </h3>
              </div>
              <button
                onClick={() => {
                  setPasswordModalOpen(false);
                  setPasswordMsg(null);
                }}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {passwordMsg && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  marginBottom: '1rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: passwordMsg.type === 'success' ? '#DCFCE7' : '#FEE2E2',
                  color: passwordMsg.type === 'success' ? '#15803D' : '#B91C1C',
                }}
              >
                {passwordMsg.type === 'success' ? (
                  <CheckCircle2 size={16} />
                ) : (
                  <AlertCircle size={16} />
                )}
                <span>{passwordMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '0.35rem',
                  }}
                >
                  Password Lama
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                  placeholder="Masukkan password lama"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '0.35rem',
                  }}
                >
                  Password Baru
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Minimal 6 karakter"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: '#475569',
                    marginBottom: '0.35rem',
                  }}
                >
                  Ulangi Password Baru
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Ketik ulang password baru"
                  style={{
                    width: '100%',
                    padding: '0.7rem 0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPasswordModalOpen(false);
                    setPasswordMsg(null);
                  }}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#475569',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  style={{
                    padding: '0.65rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#4A90D9',
                    color: '#FFFFFF',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: passwordLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <span>Simpan Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
