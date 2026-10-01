import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, type PieLabelRenderProps
} from 'recharts';
import { analyticsApi } from '../api/analytics.api';
import type { OverviewAnalytics } from '../types';
import { SkeletonCard, ErrorState } from '../components/ui';
import { Users, CheckCircle, XCircle, Tags, Landmark, UserCheck, TrendingUp } from 'lucide-react';

const CLASSIFICATION_COLORS: Record<string, string> = {
  GREEN: '#10b981',
  YELLOW: '#f59e0b',
  RED: '#ef4444',
  BLACK: '#1e293b',
  Unclassified: '#d1d5db',
};

function KpiCard({ label, value, icon, sublabel, color = 'indigo' }: {
  label: string; value: number | string; icon: React.ReactNode; sublabel?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    slate: 'bg-slate-50 text-slate-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {sublabel && <p className="mt-1 text-xs text-gray-500">{sublabel}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colors[color] ?? colors.indigo}`}>{icon}</div>
      </div>
    </div>
  );
}

function ClassificationProgressBar({ label, count, percentage }: {
  label: string; count: number; percentage: number; color?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm text-gray-500">{count.toLocaleString()} <span className="text-xs text-gray-400">({percentage.toFixed(1)}%)</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: CLASSIFICATION_COLORS[label] ?? '#6366f1' }}
        />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<OverviewAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');

    // Fetch overview, all booths, and booth analysis counts in parallel
    Promise.allSettled([
      analyticsApi.getOverview(),
      analyticsApi.getBooths({ limit: 500 }),
      analyticsApi.getStrongBooths({ limit: 1 }),
      analyticsApi.getWeakBooths({ limit: 1 }),
      analyticsApi.getOpportunityBooths({ limit: 1 }),
      analyticsApi.getConfidenceBooths({ limit: 1 }),
    ])
      .then(([overviewResult, allBoothsResult, strongResult, weakResult, oppResult, confResult]) => {

        if (overviewResult.status === 'rejected') {
          console.error('[DashboardPage] getOverview failed:', overviewResult.reason);
          console.groupEnd();
          setError('Failed to load dashboard data');
          return;
        }

        const res = overviewResult.value;
           // Normalize: backend may use nested objects (raw.voters, raw.booths, raw.classification)
        const raw = (res?.data ?? {}) as unknown as Record<string, unknown>;
        const rawVoters = (raw.voters ?? {}) as Record<string, unknown>;
        const rawVer = (raw.verification ?? {}) as Record<string, unknown>;
        const rawCls = (raw.classification ?? {}) as Record<string, unknown>;
        const rawPercentages = (rawCls.percentages ?? {}) as Record<string, unknown>;
        const rawBooths = (raw.booths ?? {}) as Record<string, unknown>;

        const safeNum = (v: unknown): number => (typeof v === 'number' && !isNaN(v) ? v : 0);

        const totalVoters = safeNum(raw.totalVoters ?? rawVoters.total ?? raw.total);

        // Helper to extract category count and percentage whether it's a number or object
        const extractCategory = (key: string, unclassifiedKey?: boolean) => {
          const val = rawCls[key];
          let count = 0;
          let pct = 0;

          if (typeof val === 'number') {
            count = val;
            pct = safeNum(rawPercentages[key]);
          } else if (val && typeof val === 'object') {
            const o = val as Record<string, unknown>;
            count = safeNum(o.count);
            pct = safeNum(o.percentage);
          } else if (unclassifiedKey) {
            count = safeNum(raw.unclassifiedVoters ?? rawVoters.unclassified);
          }

          if (pct === 0 && totalVoters > 0 && count > 0) {
            pct = Number(((count / totalVoters) * 100).toFixed(1));
          }

          return { count, percentage: pct };
        };

        // Extract verification
        const extractVer = (key: 'verified' | 'unverified') => {
          const val = rawVer[key];
          let count = 0;
          let pct = 0;

          if (typeof val === 'number') {
            count = val;
            pct = key === 'verified' && typeof rawVer.verifiedPercentage === 'number'
              ? rawVer.verifiedPercentage
              : 0;
          } else if (val && typeof val === 'object') {
            const o = val as Record<string, unknown>;
            count = safeNum(o.count);
            pct = safeNum(o.percentage);
          } else if (key === 'verified') {
            count = safeNum(raw.verifiedVoters);
          } else {
            count = safeNum(raw.unverifiedVoters);
          }

          if (pct === 0 && totalVoters > 0 && count > 0) {
            pct = Number(((count / totalVoters) * 100).toFixed(1));
          }

          return { count, percentage: pct };
        };

        // 1. Direct computation from getBooths list (most reliable across all active booths)
        let strongFromList: number | null = null;
        let weakFromList: number | null = null;
        let oppFromList: number | null = null;
        let confFromList: number | null = null;

        if (allBoothsResult.status === 'fulfilled') {
          const bVal = allBoothsResult.value as unknown as Record<string, unknown> | null;
          const bData = (bVal?.data ?? bVal) as Record<string, unknown> | null;
          const bList = (Array.isArray(bData?.booths) ? bData.booths : Array.isArray(bVal?.booths) ? bVal.booths : []) as Array<Record<string, unknown>>;

          if (bList.length > 0) {
            strongFromList = bList.filter((b) => {
              const a = (b.analysis ?? {}) as Record<string, unknown>;
              return (a.greenStrength ?? b.strength) === 'STRONG';
            }).length;

            weakFromList = bList.filter((b) => {
              const a = (b.analysis ?? {}) as Record<string, unknown>;
              return (a.greenStrength ?? b.strength) === 'WEAK';
            }).length;

            oppFromList = bList.filter((b) => {
              const a = (b.analysis ?? {}) as Record<string, unknown>;
              return (a.yellowOpportunity ?? b.opportunity) === 'HIGH';
            }).length;

            confFromList = bList.filter((b) => {
              const a = (b.analysis ?? {}) as Record<string, unknown>;
              return (a.dataConfidence ?? b.confidence) === 'HIGH';
            }).length;
          }
        }

        // 2. Fallback helper for category endpoints
        const extractBoothCount = (res: PromiseSettledResult<unknown>) => {
          if (res.status !== 'fulfilled') return 0;
          const val = res.value as Record<string, unknown> | null;
          const innerData = (val?.data ?? val) as Record<string, unknown> | null;
          const pag = (innerData?.pagination ?? val?.pagination) as Record<string, unknown> | null;
          return safeNum(pag?.total ?? innerData?.total ?? val?.total);
        };

        const strongTotal = strongFromList ?? (typeof rawBooths.strong === 'number' ? rawBooths.strong : extractBoothCount(strongResult));
        const weakTotal = weakFromList ?? (typeof rawBooths.weak === 'number' ? rawBooths.weak : extractBoothCount(weakResult));
        const oppTotal = oppFromList ?? (typeof rawBooths.opportunity === 'number' ? rawBooths.opportunity : extractBoothCount(oppResult));
        const confTotal = confFromList ?? (typeof rawBooths.highConfidence === 'number' ? rawBooths.highConfidence : extractBoothCount(confResult));

        const normalized: OverviewAnalytics = {
          totalVoters,
          verifiedVoters: safeNum(raw.verifiedVoters ?? rawVer.verified),
          unverifiedVoters: safeNum(raw.unverifiedVoters ?? rawVer.unverified),
          classifiedVoters: safeNum(raw.classifiedVoters ?? rawVoters.classified),
          unclassifiedVoters: safeNum(raw.unclassifiedVoters ?? rawVoters.unclassified),
          totalBooths: safeNum(raw.totalBooths ?? rawBooths.total),
          totalVolunteers: safeNum(raw.totalVolunteers ?? rawBooths.assigned),
          classification: {
            green: extractCategory('green'),
            yellow: extractCategory('yellow'),
            red: extractCategory('red'),
            black: extractCategory('black'),
            unclassified: extractCategory('unclassified', true),
          },
          verification: {
            verified: extractVer('verified'),
            unverified: extractVer('unverified'),
          },
          booths: {
            total: safeNum(rawBooths.total ?? raw.totalBooths),
            strong: strongTotal,
            weak: weakTotal,
            opportunity: oppTotal,
            highConfidence: confTotal,
          },
        };

        console.log('[DashboardPage] Normalized Data for Rendering:', normalized);
        console.groupEnd();

        setData(normalized);
      })
      .catch((err) => {
        console.error('[DashboardPage] Unexpected error in load():', err);
        setError('Failed to load dashboard data');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="skeleton h-7 w-48 rounded" />
          <div className="skeleton h-4 w-64 rounded mt-2" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error} onRetry={load} />;
  }

  const classificationPieData = [
    { name: 'GREEN', value: data.classification?.green?.count ?? 0 },
    { name: 'YELLOW', value: data.classification?.yellow?.count ?? 0 },
    { name: 'RED', value: data.classification?.red?.count ?? 0 },
    { name: 'BLACK', value: data.classification?.black?.count ?? 0 },
    { name: 'Unclassified', value: data.classification?.unclassified?.count ?? 0 },
  ].filter((d) => d.value > 0);

  const boothBarData = [
    { name: 'Total', value: data.booths.total },
    { name: 'Strong', value: data.booths.strong },
    { name: 'Weak', value: data.booths.weak },
    { name: 'Opportunity', value: data.booths.opportunity },
    { name: 'High Conf.', value: data.booths.highConfidence },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Assembly overview — current operational status</p>
      </div>

      {/* KPI Row 1 — Voters */}
      <div>
        <h2 className="section-title">Voter Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <KpiCard label="Total Voters" value={data.totalVoters} icon={<Users className="w-5 h-5" />} color="indigo" />
          <KpiCard label="Verified" value={data.verifiedVoters} icon={<CheckCircle className="w-5 h-5" />}
            sublabel={`${(data.verification?.verified?.percentage ?? 0).toFixed(1)}% of total`} color="green" />
          <KpiCard label="Unverified" value={data.unverifiedVoters} icon={<XCircle className="w-5 h-5" />}
            sublabel={`${(data.verification?.unverified?.percentage ?? 0).toFixed(1)}% of total`} color="amber" />
          <KpiCard label="Classified" value={data.classifiedVoters} icon={<Tags className="w-5 h-5" />} color="slate" />
        </div>
      </div>

      {/* KPI Row 2 — Infrastructure */}
      <div>
        <h2 className="section-title">Infrastructure</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KpiCard label="Total Booths" value={data.totalBooths} icon={<Landmark className="w-5 h-5" />} color="indigo" />
          <KpiCard label="Volunteers" value={data.totalVolunteers} icon={<UserCheck className="w-5 h-5" />} color="green" />
          <KpiCard label="Unclassified Voters" value={data.unclassifiedVoters} icon={<TrendingUp className="w-5 h-5" />} color="red" />
        </div>
      </div>

      {/* Charts + Classification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classification breakdown */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Voter Classification</h3>
          <div className="flex flex-col gap-3">
            <ClassificationProgressBar label="GREEN" count={data.classification?.green?.count ?? 0} percentage={data.classification?.green?.percentage ?? 0} />
            <ClassificationProgressBar label="YELLOW" count={data.classification?.yellow?.count ?? 0} percentage={data.classification?.yellow?.percentage ?? 0} />
            <ClassificationProgressBar label="RED" count={data.classification?.red?.count ?? 0} percentage={data.classification?.red?.percentage ?? 0} />
            <ClassificationProgressBar label="BLACK" count={data.classification?.black?.count ?? 0} percentage={data.classification?.black?.percentage ?? 0} />
            <ClassificationProgressBar label="Unclassified" count={data.classification?.unclassified?.count ?? 0} percentage={data.classification?.unclassified?.percentage ?? 0} />
          </div>
        </div>

        {/* Pie chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Classification Distribution</h3>
          {classificationPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={classificationPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                  label={((p: PieLabelRenderProps) => `${p.name ?? ''} ${((p.percent ?? 0) * 100).toFixed(0)}%`) as unknown as boolean}>
                  {classificationPieData.map((entry) => (
                    <Cell key={entry.name} fill={CLASSIFICATION_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => typeof v === 'number' ? v.toLocaleString() : String(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">No classification data</div>
          )}
        </div>
      </div>

      {/* Booth Analysis Overview */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Booth Analysis Overview</h3>
          <Link to="/analytics/booths/strong" className="text-xs text-indigo-600 hover:underline">View details →</Link>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={boothBarData} barSize={32}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Manage Voters', to: '/voters', color: 'bg-indigo-600' },
          { label: 'Classification', to: '/classification', color: 'bg-emerald-600' },
          { label: 'Import Voters', to: '/import', color: 'bg-amber-500' },
          { label: 'Analytics', to: '/analytics', color: 'bg-slate-700' },
        ].map((item) => (
          <Link key={item.to} to={item.to}
            className={`${item.color} text-white text-sm font-medium px-4 py-3 rounded-xl text-center hover:opacity-90 transition-opacity`}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
