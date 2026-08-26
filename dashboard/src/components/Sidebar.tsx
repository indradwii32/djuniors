// ============================================
// Djuniors Dashboard - Sidebar Component
// ============================================

import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  BookOpen,
  UserCheck,
  Users,
  Tag,
  FileText,
  MessageSquare,
  LogOut,
  X,
  ShieldCheck,
  LayoutTemplate,
  Settings,
  ChevronDown,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SubMenuItem {
  path: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface MenuItem {
  label: string;
  icon: React.ElementType;
  path?: string;
  badge?: string;
  children?: SubMenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Akademik & Kelas',
    icon: GraduationCap,
    children: [
      { path: '/levels', label: 'Level Kelas', icon: Layers },
      { path: '/classes', label: 'Kelola Kelas', icon: BookOpen },
    ],
  },
  {
    label: 'Pendaftaran & Peserta',
    icon: UserCheck,
    children: [
      { path: '/registrations', label: 'Pendaftaran Baru', icon: UserCheck },
      { path: '/participants', label: 'Data Peserta', icon: Users },
    ],
  },
  {
    label: 'Promo & Diskon',
    path: '/promos',
    icon: Tag,
  },
  {
    label: 'Formulir Custom',
    path: '/forms',
    icon: FileText,
  },
  {
    label: 'Notifikasi WA',
    path: '/notifications',
    icon: MessageSquare,
  },
  {
    label: 'Website & Pengaturan',
    icon: Settings,
    children: [
      { path: '/cms', label: 'CMS Landing Page', icon: LayoutTemplate },
      { path: '/settings', label: 'Pengaturan Sistem', icon: Settings },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Track expanded state for menu sections
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Auto-expand sub-menu if current route is within it
  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some(
          (child) =>
            location.pathname === child.path ||
            (child.path !== '/' && location.pathname.startsWith(child.path))
        );
        if (isChildActive) {
          setExpandedMenus((prev) => ({ ...prev, [item.label]: true }));
        }
      }
    });
  }, [location.pathname]);

  const toggleSubmenu = (label: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleLogout = async () => {
    if (window.confirm('Apakah Anda yakin ingin keluar dari dashboard admin?')) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="sidebar-overlay lg-hidden"
          aria-label="Tutup menu samping"
        />
      )}

      {/* Sidebar Container */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#1E293B',
          color: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 24px rgba(0, 0, 0, 0.25)',
          fontFamily: "'Nunito', sans-serif",
          overflow: 'hidden',
        }}
        className={`sidebar-container ${isOpen ? 'sidebar-open' : ''}`}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '1.15rem 1.25rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '70px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden', minWidth: 0, flex: 1 }}>
            <picture style={{ flexShrink: 0, display: 'block', borderRadius: 10, overflow: 'hidden' }}>
              <source srcSet="/images/djuniors-icon-64.png" type="image/png" />
              <img
                src="/images/djuniors-icon-64.png"
                alt="Djuniors Learning Center"
                width={40}
                height={40}
                style={{ width: 40, height: 40, borderRadius: 10, display: 'block' }}
                decoding="async"
              />
            </picture>
            <div style={{ overflow: 'hidden', minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Baloo 2', cursive",
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  lineHeight: 1.1,
                  color: '#FFFFFF',
                  letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Djuniors
              </div>
              <div
                style={{
                  fontSize: '0.62rem',
                  color: '#94A3B8',
                  fontWeight: 600,
                  letterSpacing: '1.4px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Learning Center
              </div>
            </div>
          </div>

          {/* Close button on mobile (touch target min 44px) */}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              color: '#CBD5E1',
              cursor: 'pointer',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            className="lg-hidden"
            aria-label="Tutup sidebar"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav
          style={{
            flex: 1,
            padding: '1rem 0.75rem',
            overflowY: 'auto',
            overflowX: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              padding: '0.25rem 0.75rem',
              marginBottom: '0.25rem',
              flexShrink: 0,
            }}
          >
            Menu Navigasi
          </div>

          {menuItems.map((item) => {
            const Icon = item.icon;
            const hasChildren = Boolean(item.children && item.children.length > 0);
            const isExpanded = Boolean(expandedMenus[item.label]);

            // If item has children (Collapsible Sub-menu)
            if (hasChildren && item.children) {
              const isAnyChildActive = item.children.some(
                (child) =>
                  location.pathname === child.path ||
                  (child.path !== '/' && location.pathname.startsWith(child.path))
              );

              return (
                <div key={item.label} style={{ display: 'flex', flexDirection: 'column' }}>
                  {/* Parent Toggle Button (Touch target >= 44px) */}
                  <button
                    type="button"
                    onClick={() => toggleSubmenu(item.label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      minHeight: '44px',
                      padding: '0.65rem 0.875rem',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: isAnyChildActive ? 'rgba(74, 144, 217, 0.12)' : 'transparent',
                      color: isAnyChildActive ? '#93C5FD' : '#CBD5E1',
                      fontSize: '0.9rem',
                      fontWeight: isAnyChildActive ? 700 : 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                    }}
                    className="nav-link-item"
                    aria-expanded={isExpanded}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        minWidth: 0,
                        overflow: 'hidden',
                        flex: 1,
                      }}
                    >
                      <Icon size={19} strokeWidth={2} style={{ flexShrink: 0 }} />
                      <span
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'block',
                        }}
                      >
                        {item.label}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '10px',
                            backgroundColor: '#FF6B35',
                            color: '#FFFFFF',
                            flexShrink: 0,
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronDown
                        size={16}
                        style={{
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          opacity: 0.7,
                          flexShrink: 0,
                        }}
                      />
                    </div>
                  </button>

                  {/* Submenu List with Smooth Animation */}
                  <div
                    className={`sidebar-submenu ${isExpanded ? 'open' : 'closed'}`}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      paddingLeft: '1.25rem',
                      marginTop: isExpanded ? '0.25rem' : '0',
                      marginBottom: isExpanded ? '0.25rem' : '0',
                      borderLeft: '2px solid rgba(74, 144, 217, 0.25)',
                      marginLeft: '1rem',
                    }}
                  >
                    {item.children.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={onClose}
                          style={({ isActive }) => ({
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            minHeight: '44px',
                            padding: '0.6rem 0.75rem',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontSize: '0.86rem',
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? '#FFFFFF' : '#94A3B8',
                            backgroundColor: isActive ? '#4A90D9' : 'transparent',
                            transition: 'all 0.18s ease',
                            boxShadow: isActive ? '0 4px 12px rgba(74, 144, 217, 0.35)' : 'none',
                          })}
                          className="nav-link-item"
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.65rem',
                              minWidth: 0,
                              overflow: 'hidden',
                              flex: 1,
                            }}
                          >
                            <ChildIcon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'block',
                              }}
                            >
                              {child.label}
                            </span>
                          </div>
                          {child.badge && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '8px',
                                backgroundColor: '#FF6B35',
                                color: '#FFFFFF',
                                flexShrink: 0,
                              }}
                            >
                              {child.badge}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Direct NavLink Item (Touch target >= 44px)
            return (
              <NavLink
                key={item.path}
                to={item.path || '/'}
                onClick={onClose}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: '44px',
                  padding: '0.65rem 0.875rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#FFFFFF' : '#CBD5E1',
                  backgroundColor: isActive ? '#4A90D9' : 'transparent',
                  transition: 'all 0.2s ease',
                  boxShadow: isActive ? '0 4px 14px rgba(74, 144, 217, 0.35)' : 'none',
                })}
                className="nav-link-item"
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    minWidth: 0,
                    overflow: 'hidden',
                    flex: 1,
                  }}
                >
                  <Icon size={19} strokeWidth={2} style={{ flexShrink: 0 }} />
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '10px',
                      backgroundColor: '#FF6B35',
                      color: '#FFFFFF',
                      flexShrink: 0,
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile & Logout Bottom Bar (Touch target min 44px) */}
        <div
          style={{
            padding: '0.875rem 1rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden', flex: 1, minWidth: 0 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: '#334155',
                  border: '2px solid #4A90D9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  flexShrink: 0,
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
              <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={user?.name || 'Administrator'}
                >
                  {user?.name || 'Administrator'}
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: '#94A3B8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <ShieldCheck size={12} color="#6BCB77" style={{ flexShrink: 0 }} />
                  <span style={{ textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.role?.replace('_', ' ') || 'Admin'}
                  </span>
                </div>
              </div>
            </div>

            {/* Logout Button with 44px min touch target */}
            <button
              onClick={handleLogout}
              title="Keluar"
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#F87171',
                minWidth: '44px',
                minHeight: '44px',
                padding: '8px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#EF4444';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
                e.currentTarget.style.color = '#F87171';
              }}
              aria-label="Keluar dari Dashboard"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
