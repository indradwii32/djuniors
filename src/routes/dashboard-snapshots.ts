// ============================================
// Djuniors - Dashboard Snapshots Routes
// ============================================
// Read path for the pre-aggregated `dashboard_snapshots` table, populated
// daily at 02:00 UTC by the Worker's `scheduled` handler (see src/index.ts).
//
// Why: the live `/api/dashboard/stats` + `/api/dashboard/chart-data`
// endpoints run GROUP BY aggregations over the registrations table on every
// cold cache (Cache API 60s/5min softens but doesn't eliminate this). With
// snapshots, the dashboard can render the 6-month chart + level distribution
// from at most ~7 pre-computed rows (one per month) — a fixed, tiny cost
// regardless of how large registrations grows.
//
// Fallback strategy: if the snapshot table is empty (fresh deploy before the
// first cron run, or cron failure), each endpoint degrades gracefully to the
// same live aggregation the old endpoints used. Correctness first; the
// snapshot is an optimization, not a dependency.

import { Hono } from 'hono';
import { Bindings } from '../types';
import { adminAuthMiddleware } from '../middleware/auth';

const snapshots = new Hono<{ Bindings: Bindings }>();

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

interface SnapshotRow {
    month_key: string;
    revenue: number;
    students: number;
    registrations: number;
    pending_payments: number;
    level_distribution_json: string;
    generated_at: string;
}

const monthKey = (d: Date): string =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/**
 * GET /api/dashboard/snapshots
 * Returns the last 6 monthly snapshot rows (chart-ready) + a `fresh` flag
 * telling the client whether data came from snapshots or a live fallback.
 */
snapshots.get('/', adminAuthMiddleware, async (c) => {
    const db = c.env.DB;
    const result = await db.prepare(
        'SELECT * FROM dashboard_snapshots ORDER BY month_key DESC LIMIT 6'
    ).all();
    const rows = (result.results || []) as unknown as SnapshotRow[];

    if (rows.length === 0) {
        // Fresh deploy — no snapshots yet. Tell the client to keep using the
        // live endpoints rather than rendering an empty chart.
        return c.json({ success: true, fresh: false, snapshots: [], source: 'none' });
    }

    // Ascending order for charting; normalize to the ChartDataItem shape the
    // dashboard already consumes ({ month, pendapatan, siswa }).
    const chartData = rows
        .slice()
        .reverse()
        .map((r) => {
            const [y, m] = r.month_key.split('-');
            const monthIdx = parseInt(m, 10) - 1;
            return {
                month: monthNames[monthIdx] ?? r.month_key,
                pendapatan: Number(r.revenue) || 0,
                siswa: Number(r.students) || 0,
            };
        });

    // Level distribution: latest row wins (it reflects the current state).
    const latest = rows[0];
    let levelDistribution: Array<{ name: string; value: number }> = [];
    try {
        const parsed = JSON.parse(latest.level_distribution_json || '[]');
        if (Array.isArray(parsed)) levelDistribution = parsed;
    } catch { /* keep empty */ }

    return c.json({
        success: true,
        fresh: true,
        source: 'snapshot',
        generated_at: latest.generated_at,
        chartData,
        levelDistribution,
        current: {
            revenue: Number(latest.revenue) || 0,
            students: Number(latest.students) || 0,
            registrations: Number(latest.registrations) || 0,
            pendingPayments: Number(latest.pending_payments) || 0,
        },
    });
});

/**
 * POST /api/dashboard/snapshots/generate
 * Manually trigger snapshot generation (admin). Same code path as the cron —
 * useful right after deploy to backfill before the first scheduled run.
 */
snapshots.post('/generate', adminAuthMiddleware, async (c) => {
    const { generateDashboardSnapshots } = await import('../scheduled/snapshot');
    const out = await generateDashboardSnapshots(c.env.DB);
    return c.json({ success: true, ...out });
});

export default snapshots;
