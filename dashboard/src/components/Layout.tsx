// ============================================
// Djuniors Dashboard - Layout Component
// ============================================

import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const Layout: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Auto close mobile sidebar when navigating
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Get current page title based on path
  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
      case '/dashboard':
        return 'Overview Dashboard';
      case '/levels':
        return 'Level Kelas';
      case '/classes':
        return 'Kelola Kelas & Modul';
      case '/registrations':
      case '/enrollments':
      case '/payments':
        return 'Data Pendaftaran & Pembayaran';
      case '/participants':
      case '/students':
        return 'Data Peserta & Orang Tua';
      case '/promos':
        return 'Manajemen Promo & Diskon';
      case '/forms':
        return 'Formulir Pendaftaran Custom';
      case '/notifications':
        return 'Notifikasi WhatsApp';
      case '/cms':
        return 'CMS Landing Page';
      case '/settings':
        return 'Pengaturan Sistem';
      default:
        return 'Dashboard Admin';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#FFF8E7',
          fontFamily: "'Nunito', sans-serif",
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: '#4A90D9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            boxShadow: '0 8px 24px rgba(74, 144, 217, 0.3)',
            animation: 'bounce 1.5s infinite',
          }}
        >
          <img
            src="/images/djuniors-icon-64.png"
            alt="Djuniors Learning Center"
            width={48}
            height={48}
            style={{ width: 48, height: 48, display: 'block', borderRadius: 10 }}
            decoding="async"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#475569' }}>
          <Loader2 size={18} className="animate-spin" color="#4A90D9" />
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>Memuat Djuniors Learning Center…</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          transition: 'padding 0.3s ease',
        }}
        className="main-content-wrapper"
      >
        {/* Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          title={getPageTitle(location.pathname)}
        />

        {/* Page Content */}
        <main
          style={{
            flex: 1,
            padding: '2rem',
            maxWidth: '1400px',
            width: '100%',
            margin: '0 auto',
          }}
          className="dashboard-main-content"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
