// ============================================
// Djuniors - Dashboard Snapshot Generator
// ============================================
// Aggregates dashboard stats into the `dashboard_snapshots` table. Called
// (a) daily at 02:00 UTC by the Worker's `scheduled` handler and
// (b) on demand via POST /api/dashboard/snapshots/generate.
//
// Cost profile (per run): 4 aggregate SELECTs + 6 upserts ≈ 10 D1 queries
// once per day — negligible against the 5M rows/day free-tier budget, and
// it replaces the per-dashboard-load GROUP BY aggregations entirely.

// Minimal D1 surface we need (avoids importing worker types here).
export interface D1Like {
    prepare(sql: string): {
        bind(...args: unknown[]): {
            all(): Promise<{ results?: unknown[] }>;
            first<T = unknown>(): Promise<T | null>;
            run(): Promise<{ meta?: { changes?: number } }>;
        };
        all(): Promise<{ results?: unknown[] }>;
        first<T = unknown>(): Promise<T | null>;
        run(): Promise<{ meta?: { changes?: number } }>;
    };
    batch(stmts: unknown[]): Promise<unknown[]>;
}

const monthKey = (d: Date): string =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

/** The last N months as 'YYYY-MM' strings, ascending (oldest first). */
const lastNMonthKeys = (n: number, now = new Date()): string[] => {
    const keys: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
        keys.push(monthKey(d));
    }
    return keys;
};

// Same children-count heuristic as the live chart-data endpoint — count
// approximate children per registration from the JSON string length.
const CHILDREN_SQL = `
    CASE WHEN children IS NULL OR children = '' OR children = '[]' THEN 1
         ELSE MAX(1, LENGTH(children) - LENGTH(REPLACE(children, ',{}', '')) + 1)
    END
`;

export interface GenerateResult {
    months_written: number;
    months: string[];
}

/**
 * Recompute + upsert the last 6 monthly snapshot rows (including the
 * current, partial month). Idempotent — safe to re-run any time.
 */
export async function generateDashboardSnapshots(db: D1Like): Promise<GenerateResult> {
    const months = lastNMonthKeys(6);

    // 1. Monthly revenue + per-month student approximation (2 aggregate
    //    queries, mirroring the live chart-data endpoint's logic).
    const monthlyRevenue = await db.prepare(`
        SELECT strftime('%Y-%m', r.created_at) AS month_key,
               SUM(CASE WHEN r.payment_status = 'paid' THEN r.final_amount ELSE 0 END) AS revenue
        FROM registrations r
        WHERE r.created_at >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', r.created_at)
    `).all();

    const monthlyStudents = await db.prepare(`
        SELECT strftime('%Y-%m', created_at) AS month_key,
               SUM(${CHILDREN_SQL}) AS approx_students
        FROM registrations
        WHERE created_at >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', created_at)
    `).all();

    const revenueMap = new Map<string, number>();
    for (const r of (monthlyRevenue.results || []) as Array<{ month_key: string; revenue: number }>) {
        revenueMap.set(r.month_key, Number(r.revenue) || 0);
    }
    const studentsMap = new Map<string, number>();
    for (const r of (monthlyStudents.results || []) as Array<{ month_key: string; approx_students: number }>) {
        studentsMap.set(r.month_key, Number(r.approx_students) || 0);
    }

    // 2. Per-month registration counts + pending payments.
    const monthlyRegs = await db.prepare(`
        SELECT strftime('%Y-%m', created_at) AS month_key, COUNT(*) AS cnt,
               SUM(CASE WHEN payment_status != 'paid' THEN 1 ELSE 0 END) AS pending
        FROM registrations
        WHERE created_at >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', created_at)
    `).all();
    const regsMap = new Map<string, { cnt: number; pending: number }>();
    for (const r of (monthlyRegs.results || []) as Array<{ month_key: string; cnt: number; pending: number }>) {
        regsMap.set(r.month_key, { cnt: Number(r.cnt) || 0, pending: Number(r.pending) || 0 });
    }

    // 3. Level distribution (current state, same join as live endpoint but
    //    computed once per day instead of per dashboard load).
    const levelResult = await db.prepare(`
        SELECT l.name AS name,
               COUNT(r.id) AS cnt,
               COALESCE(SUM(${CHILDREN_SQL.replace(/children/g, 'r.children')}), 0) AS approx_students
        FROM levels l
        LEFT JOIN classes c ON c.level_id = l.id AND c.is_active = 1
        LEFT JOIN registrations r ON r.class_id = c.id
            AND r.created_at >= date('now', '-12 months')
        WHERE l.is_active = 1
        GROUP BY l.id, l.name
        ORDER BY l.sort_order ASC, l.name ASC
    `).all();
    const levelDistribution = ((levelResult.results || []) as Array<{ name: string; approx_students: number }>)
        .map((r) => ({ name: r.name, value: Number(r.approx_students) || 0 }));
    const levelJson = JSON.stringify(levelDistribution);

    // 4. Upsert one row per month.
    const stmts = months.map((mk) =>
        db.prepare(`
            INSERT INTO dashboard_snapshots (
                month_key, revenue, students, registrations, pending_payments,
                level_distribution_json, generated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(month_key) DO UPDATE SET
                revenue = excluded.revenue,
                students = excluded.students,
                registrations = excluded.registrations,
                pending_payments = excluded.pending_payments,
                level_distribution_json = excluded.level_distribution_json,
                generated_at = CURRENT_TIMESTAMP
        `).bind(
            mk,
            revenueMap.get(mk) ?? 0,
            studentsMap.get(mk) ?? 0,
            regsMap.get(mk)?.cnt ?? 0,
            regsMap.get(mk)?.pending ?? 0,
            levelJson
        )
    );
    await db.batch(stmts);

    return { months_written: months.length, months };
}
