// ============================================
// Djuniors Dashboard - Usage / Budget Gauge Widget
// ============================================
// Displays today's Cloudflare free-tier burn rate (D1 rows read, KV ops,
// Workers requests, cache hit-rate) fed by GET /api/admin/usage.
// Data is accumulated per-isolate by the usage middleware and flushed to
// KV every ~3 minutes, so numbers may lag a few minutes behind reality.

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../utils/api';

export interface UsageData {
  success: boolean;
  today: string;
  usage: {
    requests: number;
    d1Reads: number;
    d1Writes: number;
    d1RowsRead: number;
    kvReads: number;
    kvWrites: number;
    kvDeletes: number;
    cacheHits: number;
    cacheMisses: number;
    cacheStores: number;
    r2Reads: number;
  };
  cacheHitRate: number | null;
  budgetPercent: {
    requests: number;
    d1RowsRead: number;
    d1Writes: number;
    kvReads: number;
    kvWrites: number;
    r2Reads: number;
  };
  limits: {
    requests: number;
    d1RowsRead: number;
    d1Writes: number;
    kvReads: number;
    kvWrites: number;
    r2Reads: number;
  };
}

const fmt = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

const barColor = (pct: number): string => {
  if (pct >= 80) return '#EF4444'; // red — danger
  if (pct >= 50) return '#F59E0B'; // amber — caution
  return '#10B981';                // green — healthy
};

interface BudgetRowProps {
  label: string;
  used: number;
  limit: number;
  pct: number;
}

const BudgetRow: React.FC<BudgetRowProps> = ({ label, used, limit, pct }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        fontSize: '0.8rem',
      }}
    >
      <span style={{ fontWeight: 600, color: '#334155' }}>{label}</span>
      <span style={{ color: '#64748B', fontVariantNumeric: 'tabular-nums' }}>
        {fmt(used)} / {fmt(limit)} <strong style={{ color: barColor(pct) }}>({pct}%)</strong>
      </span>
    </div>
    <div
      style={{
        height: '8px',
        borderRadius: '999px',
        backgroundColor: '#E2E8F0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.min(100, pct)}%`,
          height: '100%',
          borderRadius: '999px',
          backgroundColor: barColor(pct),
          transition: 'width 0.4s ease, background-color 0.4s ease',
        }}
      />
    </div>
  </div>
);

export const UsageGauge: React.FC = () => {
  const [data, setData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) setIsRefreshing(true);
      setErrorMsg(null);
      const json = await apiRequest<UsageData>('/admin/usage');
      setData(json);
    } catch (e) {
      setErrorMsg((e as Error).message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Refresh every 5 minutes — matches the KV flush cadence (3 min) plus slack.
    const t = setInterval(() => load(true), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  const anyWarning =
    data && Object.values(data.budgetPercent).some((p) => p >= 80);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#ECFDF5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Activity size={18} color="#10B981" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0F172A' }}>
              Konsumsi Free Tier Hari Ini
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
              Burn rate API vs limit harian Cloudflare
            </div>
          </div>
        </div>
        <button
          className="btn-touch-sm"
          onClick={() => load(true)}
          disabled={isRefreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            color: '#334155',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? '...' : 'Segarkan'}</span>
        </button>
      </div>

      {/* Warning banner */}
      {anyWarning && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '0.6rem 0.9rem',
            borderRadius: '10px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#B91C1C',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          <AlertTriangle size={15} />
          Konsumsi melewati 80% limit harian — pertimbangkan penambahan caching.
        </div>
      )}

      {/* Body */}
      {isLoading ? (
        <div style={{ color: '#64748B', fontSize: '0.85rem' }}>Memuat data usage…</div>
      ) : errorMsg ? (
        <div style={{ color: '#B91C1C', fontSize: '0.85rem' }}>
          Gagal memuat data usage: {errorMsg}
        </div>
      ) : data ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem',
            }}
          >
            <BudgetRow
              label="Workers Requests"
              used={data.usage.requests}
              limit={data.limits.requests}
              pct={data.budgetPercent.requests}
            />
            <BudgetRow
              label="D1 Rows Read"
              used={data.usage.d1RowsRead}
              limit={data.limits.d1RowsRead}
              pct={data.budgetPercent.d1RowsRead}
            />
            <BudgetRow
              label="KV Writes"
              used={data.usage.kvWrites + data.usage.kvDeletes}
              limit={data.limits.kvWrites}
              pct={data.budgetPercent.kvWrites}
            />
            <BudgetRow
              label="KV Reads"
              used={data.usage.kvReads}
              limit={data.limits.kvReads}
              pct={data.budgetPercent.kvReads}
            />
          </div>

          {/* Footer stats: hit-rate + raw counters */}
          <div
            style={{
              display: 'flex',
              gap: '1.25rem',
              flexWrap: 'wrap',
              fontSize: '0.78rem',
              color: '#64748B',
              borderTop: '1px solid #F1F5F9',
              paddingTop: '0.85rem',
            }}
          >
            <span>
              Cache hit-rate:{' '}
              <strong style={{ color: '#0F172A' }}>
                {data.cacheHitRate === null ? '—' : `${data.cacheHitRate}%`}
              </strong>
            </span>
            <span>
              D1 queries: <strong style={{ color: '#0F172A' }}>{fmt(data.usage.d1Reads)}</strong>
            </span>
            <span>
              D1 writes: <strong style={{ color: '#0F172A' }}>{fmt(data.usage.d1Writes)}</strong>
            </span>
            <span>
              R2 reads: <strong style={{ color: '#0F172A' }}>{fmt(data.usage.r2Reads)}</strong>
            </span>
            <span style={{ marginLeft: 'auto', fontStyle: 'italic' }}>
              Data agregat ±3 menit (flush KV berkala)
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default UsageGauge;
