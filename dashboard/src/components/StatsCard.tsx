// ============================================
// Djuniors Dashboard - Stats Card Component
// ============================================

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  bgColor?: string;
  trend?: {
    value: number | string;
    isPositive?: boolean;
    label?: string;
  };
  subtitle?: string;
  badge?: string;
  loading?: boolean;
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color = '#4A90D9',
  bgColor,
  trend,
  subtitle,
  badge,
  loading = false,
  onClick,
}) => {
  const iconBg = bgColor || `${color}18`; // 10% opacity hex

  return (
    <div
      onClick={onClick}
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        fontFamily: "'Nunito', sans-serif",
      }}
      className="stats-card hover-lift"
    >
      {/* Top Accent Line */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: color,
        }}
      />

      {/* Top row: Title and Icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '0.25rem',
            }}
          >
            {title}
          </div>
          {badge && (
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: `${color}20`,
                color: color,
              }}
            >
              {badge}
            </span>
          )}
        </div>

        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
            flexShrink: 0,
          }}
        >
          <Icon size={24} strokeWidth={2.2} />
        </div>
      </div>

      {/* Value */}
      <div style={{ marginBottom: '0.75rem' }}>
        {loading ? (
          <div
            style={{
              height: '36px',
              width: '60%',
              backgroundColor: '#F1F5F9',
              borderRadius: '8px',
              animation: 'pulse 1.5s infinite',
            }}
          />
        ) : (
          <div
            style={{
              fontFamily: "'Baloo 2', cursive",
              fontSize: '2rem',
              fontWeight: 800,
              lineHeight: 1.1,
              color: '#1E293B',
            }}
          >
            {value}
          </div>
        )}
      </div>

      {/* Footer / Trend / Subtitle */}
      {(trend || subtitle) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.825rem',
            color: '#64748B',
            borderTop: '1px solid #F1F5F9',
            paddingTop: '0.75rem',
            marginTop: 'auto',
          }}
        >
          {trend && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 700,
                color: trend.isPositive ? '#16A34A' : '#DC2626',
              }}
            >
              {trend.isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{trend.value}</span>
              {trend.label && (
                <span style={{ fontWeight: 500, color: '#94A3B8', marginLeft: '4px' }}>
                  {trend.label}
                </span>
              )}
            </div>
          )}

          {subtitle && !trend && (
            <div style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{subtitle}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard;
