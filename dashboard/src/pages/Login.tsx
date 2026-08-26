// ============================================
// Djuniors Dashboard - Admin Login Page
// ============================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Loader2,
  Key,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect to dashboard or previous route
  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim()) {
      setErrorMsg('Silakan masukkan username admin');
      return;
    }
    if (!password) {
      setErrorMsg('Silakan masukkan password');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await login(username.trim(), password);
      if (res.success) {
        navigate('/');
      } else {
        setErrorMsg(res.error || 'Username atau password salah.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick fill demo account
  const handleUseDemo = () => {
    setUsername('admin');
    setPassword('admin123');
    setErrorMsg(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#FFF8E7',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {/* Decorative Background Circles */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-5%',
          width: '450px',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(74, 144, 217, 0.15) 0%, rgba(255, 248, 231, 0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-5%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 217, 61, 0.2) 0%, rgba(255, 248, 231, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Login Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Top Accent Strip */}
        <div
          style={{
            height: '6px',
            background: 'linear-gradient(90deg, #4A90D9 0%, #FFD93D 50%, #FF6B35 100%)',
          }}
        />

        <div style={{ padding: '2.5rem 2rem 2rem' }}>
          {/* Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <picture style={{
                            width: 64,
                            height: 64,
                            borderRadius: 14,
                            overflow: 'hidden',
                            boxShadow: '0 8px 20px rgba(74, 144, 217, 0.35)',
                            marginBottom: '1rem',
                            backgroundColor: '#FFFFFF',
                          }}>
                          <source srcSet="/images/djuniors-icon-512.png" type="image/png" />
                          <img
                            src="/images/djuniors-icon-512.png"
                            alt="Djuniors Learning Center"
                            width={64}
                            height={64}
                            style={{ width: 64, height: 64, display: 'block' }}
                            decoding="async"
                          />
                        </picture>

                        <h1
                          style={{
                            fontFamily: "'Baloo 2', cursive",
                            fontSize: '1.9rem',
                            fontWeight: 800,
                            color: '#1E293B',
                            lineHeight: 1.1,
                            marginBottom: '0.35rem',
                          }}
                        >
                          Djuniors Learning Center
                        </h1>
                        <p style={{ fontSize: '0.9rem', color: '#64748B' }}>
                          Admin Dashboard — Masuk untuk mengelola kelas dan siswa matematika
                        </p>
          </div>

          {/* Error Message Banner */}
          {errorMsg && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                border: '1px solid #FCA5A5',
                color: '#B91C1C',
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                marginBottom: '1.5rem',
                animation: 'shake 0.3s ease-in-out',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Username Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '0.45rem',
                }}
              >
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username admin"
                  autoComplete="username"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem 1rem 0.8rem 2.6rem',
                    borderRadius: '12px',
                    border: '1.5px solid #E2E8F0',
                    fontSize: '0.95rem',
                    color: '#1E293B',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    backgroundColor: '#F8FAFC',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4A90D9';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(74, 144, 217, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '0.45rem',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                  style={{
                    width: '100%',
                    padding: '0.8rem 2.8rem 0.8rem 2.6rem',
                    borderRadius: '12px',
                    border: '1.5px solid #E2E8F0',
                    fontSize: '0.95rem',
                    color: '#1E293B',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    backgroundColor: '#F8FAFC',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#4A90D9';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(74, 144, 217, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.backgroundColor = '#F8FAFC';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '4px',
                  }}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.875rem',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#4A90D9',
                color: '#FFFFFF',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 6px 18px rgba(74, 144, 217, 0.35)',
                transition: 'all 0.2s ease',
                marginTop: '0.5rem',
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = '#3B82F6';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) {
                  e.currentTarget.style.backgroundColor = '#4A90D9';
                  e.currentTarget.style.transform = 'none';
                }
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk Dashboard</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Helper Box */}
          <div
            style={{
              marginTop: '1.75rem',
              padding: '1rem',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px dashed #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Key size={16} color="#64748B" />
              <div style={{ fontSize: '0.78rem', color: '#475569' }}>
                Akun Demo: <strong style={{ color: '#1E293B' }}>admin</strong> /{' '}
                <strong style={{ color: '#1E293B' }}>admin123</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUseDemo}
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#4A90D9',
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: '6px',
                padding: '4px 8px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              Gunakan
            </button>
          </div>

          {/* Back to Public Web */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <a
              href="/"
              style={{
                fontSize: '0.85rem',
                color: '#64748B',
                textDecoration: 'none',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#4A90D9')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#64748B')}
            >
              ← Kembali ke Beranda Djuniors Learning Center
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
