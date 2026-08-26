// ============================================
// Djuniors Dashboard - Main Dashboard Page
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  BookOpen,
  CreditCard,
  Clock,
  RefreshCw,
  ArrowUpRight,
  Plus,
  MessageSquare,
  Tag,
  AlertCircle,
  TrendingUp,
  GraduationCap,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import StatsCard from '../components/StatsCard';
import UsageGauge from '../components/UsageGauge';
import { useAuth } from '../contexts/AuthContext';
import {
  dashboardApi,
  registrationsApi,
  classesApi,
  notificationsApi,
  snapshotsApi,
  DashboardStats,
  ChartDataItem,
  LevelDistributionItem,
  ClassItem,
  RegistrationItem,
  RegistrationChild,
} from '../utils/api';

// Colors for Pie Chart
const LEVEL_COLORS = ['#4A90D9', '#FFD93D', '#FF6B35', '#6BCB77', '#FF9CEE', '#A78BFA'];

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeClasses: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  });
  const [recentRegistrations, setRecentRegistrations] = useState<RegistrationItem[]>([]);
  const [waConnected, setWaConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Real analytics data for charts (computed from registrations)
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const [levelDistribution, setLevelDistribution] = useState<LevelDistributionItem[]>([]);

  // Helper to parse children
  const parseChildren = (children: any): RegistrationChild[] => {
    if (!children) return [];
    if (Array.isArray(children)) return children;
    if (typeof children === 'string') {
      try {
        const parsed = JSON.parse(children);
        if (Array.isArray(parsed)) return parsed;
        return [{ name: children }];
      } catch {
        return [{ name: children }];
      }
    }
    return [];
  };

  // Load all dashboard data using /api/registrations and /api/dashboard/stats
  const loadData = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true);
      else setIsLoading(true);
      setErrorMsg(null);

      // Fetch stats, registrations, classes, WA status, and snapshots concurrently.
      // Snapshots (daily cron) provide pre-aggregated chart data; when fresh
      // they replace the client-side aggregation over registration rows.
      const [statsRes, registrationsRes, classesRes, waRes, snapshotsRes] =
        await Promise.allSettled([
          dashboardApi.getStats(),
          // getAllFlat returns the bare array (getAll returns {data, pagination}).
          registrationsApi.getAllFlat({ limit: 100 }),
          classesApi.getAll(),
          notificationsApi.getWaStatus(),
          snapshotsApi.get(),
        ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value);
      }

      const registrations: RegistrationItem[] =
        registrationsRes.status === 'fulfilled' && Array.isArray(registrationsRes.value)
          ? registrationsRes.value
          : [];

      const classes: ClassItem[] =
        classesRes.status === 'fulfilled' && Array.isArray(classesRes.value)
          ? classesRes.value
          : [];

      // Set recent registrations (top 6)
      setRecentRegistrations(registrations.slice(0, 6));

      if (waRes.status === 'fulfilled') {
        setWaConnected(waRes.value.connected);
      } else {
        setWaConnected(false);
      }

      // If backend totalStudents isn't provided or 0, calculate total children from registrations
      let calculatedTotalStudents = 0;
      let calculatedRevenue = 0;
      let calculatedPending = 0;

      // Group registrations by month
      const monthlyData: Record<string, { month: string; pendapatan: number; siswa: number }> = {};
      const levelData: Record<string, { name: string; value: number }> = {};

      registrations.forEach((reg) => {
        const childList = parseChildren(reg.children);
        const childCount = Math.max(1, childList.length);
        calculatedTotalStudents += childCount;

        if (reg.payment_status === 'paid') {
          calculatedRevenue += reg.final_amount ?? reg.total_amount ?? 0;
        }

        if (reg.payment_status === 'pending' || reg.payment_status === 'unpaid' || reg.status === 'pending') {
          calculatedPending += 1;
        }

        // Monthly chart
        const month = reg.created_at
          ? new Date(reg.created_at).toLocaleString('id', { month: 'short' })
          : 'Bulan ini';
        if (!monthlyData[month]) {
          monthlyData[month] = { month, pendapatan: 0, siswa: 0 };
        }
        if (reg.payment_status === 'paid') {
          monthlyData[month].pendapatan += reg.final_amount ?? reg.total_amount ?? 0;
        }
        monthlyData[month].siswa += childCount;

        // Level distribution
        const cls = classes.find((c) => c.id === reg.class_id);
        const levelName = cls?.level_name || (cls as any)?.level_id || reg.class_name || 'Level Kelas';
        if (!levelData[levelName]) {
          levelData[levelName] = { name: levelName, value: 0 };
        }
        levelData[levelName].value += childCount;
      });

      // Update stats if we computed larger or more accurate values
      setStats((prev) => ({
        totalStudents: prev.totalStudents > 0 ? prev.totalStudents : calculatedTotalStudents,
        activeClasses: prev.activeClasses > 0 ? prev.activeClasses : classes.filter((c) => c.is_active).length,
        totalRevenue: prev.totalRevenue > 0 ? prev.totalRevenue : calculatedRevenue,
        pendingPayments: prev.pendingPayments > 0 ? prev.pendingPayments : calculatedPending,
      }));

      // Chart data: prefer pre-aggregated snapshots (daily cron) — 1 small
      // table read on the backend. Fall back to the legacy client-side
      // aggregation over registration rows when no snapshot exists yet.
      const snapshot =
        snapshotsRes.status === 'fulfilled' ? snapshotsRes.value : null;

      // Chart data fallback if empty
      const chartValues = Object.values(monthlyData);
      if (snapshot?.fresh && snapshot.chartData && snapshot.chartData.length > 0) {
        setChartData(snapshot.chartData);
      } else if (chartValues.length > 0) {
        setChartData(chartValues);
      } else {
        setChartData([
          { month: 'Jan', pendapatan: 0, siswa: 0 },
          { month: 'Feb', pendapatan: 0, siswa: 0 },
          { month: 'Mar', pendapatan: 0, siswa: 0 },
        ]);
      }

      if (snapshot?.fresh && snapshot.levelDistribution && snapshot.levelDistribution.length > 0) {
        setLevelDistribution(snapshot.levelDistribution);
      } else {
        setLevelDistribution(Object.values(levelData));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat data dashboard';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Format currency IDR
  const formatIDR = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format short date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Payment status badge color
  const getStatusBadge = (status: string, paymentStatus?: string) => {
    if (paymentStatus === 'paid' || status === 'confirmed') {
      return {
        bg: '#DCFCE7',
        color: '#15803D',
        border: '#BBF7D0',
        text: 'Lunas & Konfirmasi',
      };
    }
    if (paymentStatus === 'rejected' || status === 'rejected') {
      return {
        bg: '#FEE2E2',
        color: '#B91C1C',
        border: '#FECACA',
        text: 'Ditolak',
      };
    }
    return {
      bg: '#FEF3C7',
      color: '#B45309',
      border: '#FDE68A',
      text: 'Menunggu Bayar',
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          borderRadius: '20px',
          padding: '2rem',
          color: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.5rem',
          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Decorative Circle */}
        <div
          style={{
            position: 'absolute',
            right: '-40px',
            top: '-40px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            backgroundColor: 'rgba(74, 144, 217, 0.15)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ zIndex: 1, maxWidth: '650px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              backgroundColor: 'rgba(74, 144, 217, 0.25)',
              color: '#93C5FD',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '0.75rem',
            }}
          >
            <Sparkles size={14} color="#FFD93D" />
            <span>Panel Administrator Djuniors</span>
          </div>

          <h2
            style={{
              fontFamily: "'Baloo 2', cursive",
              fontSize: '1.85rem',
              fontWeight: 800,
              lineHeight: 1.2,
              margin: '0 0 0.5rem 0',
            }}
          >
            Halo, {user?.name || 'Administrator'}! 👋
          </h2>

          <p style={{ margin: 0, color: '#CBD5E1', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Pantau pendaftaran baru, verifikasi pembayaran kursus matematika siswa, dan kelola database peserta secara real-time.
          </p>
        </div>

        {/* Quick Actions & Refresh */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            zIndex: 1,
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.75rem 1.2rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#FFFFFF',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)')}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            <span>{isRefreshing ? 'Memperbarui...' : 'Segarkan Data'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            color: '#B91C1C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{errorMsg}</span>
          </div>
          <button
            onClick={() => loadData()}
            style={{
              background: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '4px 12px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* Top 4 Stats Cards Grid */}
      <div
        style={{
          display: 'grid',
          gap: '1.25rem',
        }}
        className="stats-grid"
      >
        <StatsCard
          title="Total Peserta"
          value={stats.totalStudents}
          icon={Users}
          color="#4A90D9"
          subtitle="Siswa terdaftar aktif"
          loading={isLoading}
          onClick={() => navigate('/participants')}
        />

        <StatsCard
          title="Kelas Aktif"
          value={stats.activeClasses}
          icon={BookOpen}
          color="#6BCB77"
          subtitle="Program matematika berjalan"
          loading={isLoading}
          onClick={() => navigate('/classes')}
        />

        <StatsCard
          title="Total Pendapatan"
          value={formatIDR(stats.totalRevenue)}
          icon={CreditCard}
          color="#FFD93D"
          badge="Terverifikasi"
          trend={{ value: 'Realtime D1', isPositive: true }}
          loading={isLoading}
          onClick={() => navigate('/registrations')}
        />

        <StatsCard
          title="Menunggu Pembayaran"
          value={stats.pendingPayments}
          icon={Clock}
          color="#FF6B35"
          badge={stats.pendingPayments > 0 ? 'Perlu Dicek' : 'Semua Beres'}
          trend={{
            value: stats.pendingPayments > 0 ? `${stats.pendingPayments} invoice` : 'Lancar',
            isPositive: stats.pendingPayments === 0,
          }}
          loading={isLoading}
          onClick={() => navigate('/registrations')}
        />
      </div>

      {/* Free-tier burn-rate monitor (aggregated usage counters) */}
      <UsageGauge />

      {/* Quick Action Buttons */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.1rem' }}>⚡</span>
          <span
            style={{
              fontFamily: "'Baloo 2', cursive",
              fontSize: '1.1rem',
              fontWeight: 700,
              color: '#1E293B',
            }}
          >
            Aksi Cepat
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/registrations')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: '#4A90D9',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(74, 144, 217, 0.25)',
              transition: 'all 0.2s ease',
            }}
          >
            <UserCheck size={16} />
            <span>Pendaftaran Baru</span>
          </button>

          <button
            onClick={() => navigate('/participants')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Users size={16} />
            <span>Data Peserta</span>
          </button>

          <button
            onClick={() => navigate('/classes')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Plus size={15} />
            <span>Tambah Kelas</span>
          </button>

          <button
            onClick={() => navigate('/promos')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Tag size={15} />
            <span>Buat Promo</span>
          </button>

          <button
            onClick={() => navigate('/notifications')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0.55rem 1rem',
              borderRadius: '10px',
              border: '1px solid #E2E8F0',
              backgroundColor: '#F8FAFC',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <MessageSquare size={15} color="#22C55E" />
            <span>Broadcast WA</span>
          </button>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))',
          gap: '1.5rem',
        }}
      >
        {/* Revenue & Growth Trend */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "'Baloo 2', cursive",
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: '#1E293B',
                  margin: 0,
                }}
              >
                Tren Pertumbuhan & Pendaftaran
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                Akumulasi pendapatan & penambahan siswa per bulan
              </p>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#EFF6FF',
                color: '#4A90D9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrendingUp size={18} />
            </div>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4A90D9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#4A90D9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis
                  stroke="#94A3B8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => (val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}K`)}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    name === 'pendapatan' ? formatIDR(Number(value)) : `${value} Siswa`,
                    name === 'pendapatan' ? 'Pendapatan' : 'Total Siswa',
                  ]}
                  contentStyle={{
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pendapatan"
                  stroke="#4A90D9"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student Level Distribution */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            padding: '1.5rem',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <h3
                style={{
                  fontFamily: "'Baloo 2', cursive",
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: '#1E293B',
                  margin: 0,
                }}
              >
                Distribusi Level Kelas
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                Proporsi siswa berdasarkan kelompok level kelas
              </p>
            </div>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#FFFBEB',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GraduationCap size={18} />
            </div>
          </div>

          {levelDistribution.length === 0 || levelDistribution.every((item) => item.value === 0) ? (
            <div
              style={{
                width: '100%',
                height: 260,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
                fontSize: '0.875rem',
                textAlign: 'center',
              }}
            >
              <GraduationCap size={44} strokeWidth={1.5} color="#CBD5E1" style={{ marginBottom: '8px' }} />
              <span>Belum ada data distribusi level kelas</span>
            </div>
          ) : (
            <div style={{ width: '100%', height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={levelDistribution.filter((item) => item.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {levelDistribution
                      .filter((item) => item.value > 0)
                      .map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={LEVEL_COLORS[index % LEVEL_COLORS.length]}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val} Siswa`, 'Jumlah']}
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #E2E8F0',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span style={{ color: '#475569', fontSize: '0.78rem', fontWeight: 600 }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Recent Registrations Table Section */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.5rem',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserCheck size={20} color="#4A90D9" />
            <h3
              style={{
                fontFamily: "'Baloo 2', cursive",
                fontSize: '1.2rem',
                fontWeight: 700,
                color: '#1E293B',
                margin: 0,
              }}
            >
              Pendaftaran & Pembayaran Terbaru
            </h3>
          </div>
          <button
            onClick={() => navigate('/registrations')}
            className="btn-touch-sm"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#4A90D9',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 8px',
              borderRadius: '8px',
            }}
          >
            <span>Lihat Semua</span>
            <ArrowUpRight size={15} />
          </button>
        </div>

        {recentRegistrations.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '2.5rem 1rem',
              color: '#94A3B8',
              fontSize: '0.875rem',
            }}
          >
            Belum ada pendaftaran baru tercatat.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '0.85rem' }}>
            {recentRegistrations.map((reg) => {
              const childrenList = parseChildren(reg.children);
              const childrenNames = childrenList.map((c) => c.name).join(', ') || 'Siswa';
              const statusBadge = getStatusBadge(reg.status, reg.payment_status);

              return (
                <div
                  key={reg.id}
                  onClick={() => navigate('/registrations')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.9rem 1.1rem',
                    borderRadius: '12px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #F1F5F9',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EFF6FF')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                >
                  <div style={{ overflow: 'hidden', paddingRight: '0.5rem' }}>
                    <div style={{ fontWeight: 800, color: '#1E293B', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {childrenNames}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '2px' }}>
                      {reg.class_name || 'Kelas Matematika'} • Wali: {reg.parent_name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', fontFamily: 'monospace', marginTop: '1px' }}>
                      {reg.registration_number}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: statusBadge.bg,
                        color: statusBadge.color,
                        border: `1px solid ${statusBadge.border}`,
                        marginBottom: '2px',
                      }}
                    >
                      {statusBadge.text}
                    </span>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E293B' }}>
                      {formatIDR(reg.final_amount ?? reg.total_amount)}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                      {formatDate(reg.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gateway & Infrastructure Status Banner */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          border: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: waConnected ? '#DCFCE7' : '#FEE2E2',
              color: waConnected ? '#16A34A' : '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageSquare size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1E293B' }}>
              WhatsApp Gateway (Fonnte API)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
              {waConnected
                ? 'Gateway aktif & siap mengirim notifikasi pendaftaran otomatis.'
                : 'Gateway belum aktif atau token Fonnte perlu dikonfigurasi di Cloudflare Worker.'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.75rem',
              fontWeight: 700,
              backgroundColor: '#F1F5F9',
              color: '#334155',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#22C55E',
              }}
            />
            <span>Cloudflare D1 & KV: Online</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
