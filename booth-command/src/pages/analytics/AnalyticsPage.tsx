import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { analyticsApi } from '../../api/analytics.api';
import type { OverviewAnalytics, ClassificationAnalytics, VerificationAnalytics, BoothAnalyticsRow } from '../../types';
import { Spinner, ErrorState, EmptyState, Pagination, Input } from '../../components/ui';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useDebounce } from '../../hooks/useDebounce';
import { Search, BarChart3 } from 'lucide-react';
import clsx from 'clsx';

const TABS = [
  { label: 'Overview', to: '/analytics' },
  { label: 'Classification', to: '/analytics/classification' },
  { label: 'Verification', to: '/analytics/verification' },
  { label: 'All Booths', to: '/analytics/booths-table' },
];

const PIE_COLORS: Record<string, string> = {
  GREEN: '#10b981', YELLOW: '#f59e0b', RED: '#ef4444', BLACK: '#1e293b', Unclassified: '#d1d5db',
};

export function AnalyticsPage() {
  const location = useLocation();
  const [overview, setOverview] = useState<OverviewAnalytics | null>(null);
  const [classification, setClassification] = useState<ClassificationAnalytics | null>(null);
  const [verification, setVerification] = useState<VerificationAnalytics | null>(null);
  const [booths, setBooths] = useState<BoothAnalyticsRow[]>([]);
  const [boothsTotal, setBoothsTotal] = useState(0);
  const [boothsTotalPages, setBoothsTotalPages] = useState(1);
  const [boothsPage, setBoothsPage] = useState(1);
  const [boothSearch, setBoothSearch] = useState('');
  const debouncedBoothSearch = useDebounce(boothSearch);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const tab = location.pathname;

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsApi.getOverview(),
      analyticsApi.getClassification(),
      analyticsApi.getVerification(),
    ]).then(([ov, cl, vr]) => {
      setOverview(ov.data);
      setClassification(cl.data);
      setVerification(vr.data);
    }).catch(() => setError('Failed to load analytics')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    analyticsApi.getBooths({ page: boothsPage, limit: 20, search: debouncedBoothSearch || undefined })
      .then((r) => {
        const d = r.data as unknown as { booths: BoothAnalyticsRow[]; total: number; totalPages: number };
        setBooths(d.booths ?? []);
        setBoothsTotal(d.total ?? 0);
        setBoothsTotalPages(d.totalPages ?? 1);
      }).catch(() => {});
  }, [boothsPage, debouncedBoothSearch]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} />;

  const pieData = overview ? [
    { name: 'GREEN', value: overview.classification.green.count },
    { name: 'YELLOW', value: overview.classification.yellow.count },
    { name: 'RED', value: overview.classification.red.count },
    { name: 'BLACK', value: overview.classification.black.count },
    { name: 'Unclassified', value: overview.classification.unclassified.count },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">Assembly-wide data analysis</p>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-1 border-b border-gray-200 pb-0">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
              tab === t.to ? 'text-indigo-600 border-indigo-600 bg-white' : 'text-gray-500 border-transparent hover:text-gray-700'
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Overview Tab */}
      {(tab === '/analytics' || tab === '/analytics/') && overview && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Voters', value: overview.totalVoters },
              { label: 'Total Booths', value: overview.totalBooths },
              { label: 'Volunteers', value: overview.totalVolunteers },
              { label: 'Classified', value: overview.classifiedVoters },
            ].map((k) => (
              <div key={k.label} className="card p-4">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{k.label}</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{k.value.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="card p-5">
              <h3 className="section-title">Classification Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={((p: { name?: string; percent?: number }) => `${p.name ?? ''} ${((p.percent ?? 0) * 100).toFixed(0)}%`) as unknown as boolean}>
                    {pieData.map((e) => <Cell key={e.name} fill={PIE_COLORS[e.name]} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => typeof v === 'number' ? v.toLocaleString() : String(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {verification && (
              <div className="card p-5">
                <h3 className="section-title">Verification Status</h3>
                <div className="space-y-4 mt-4">
                  {[
                    { label: 'Verified', pct: verification.verified.percentage, count: verification.verified.count, color: '#10b981' },
                    { label: 'Unverified', pct: verification.unverified.percentage, count: verification.unverified.count, color: '#f59e0b' },
                  ].map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{r.label}</span>
                        <span className="text-gray-500">{r.count.toLocaleString()} ({r.pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full">
                        <div className="h-3 rounded-full" style={{ width: `${r.pct}%`, backgroundColor: r.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Classification Tab */}
      {tab === '/analytics/classification' && classification && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'GREEN', data: classification.green, color: '#10b981' },
            { label: 'YELLOW', data: classification.yellow, color: '#f59e0b' },
            { label: 'RED', data: classification.red, color: '#ef4444' },
            { label: 'BLACK', data: classification.black, color: '#1e293b' },
          ].map((c) => (
            <div key={c.label} className="card p-5" style={{ borderLeft: `4px solid ${c.color}` }}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{c.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{c.data.count.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">{c.data.percentage.toFixed(1)}%</p>
              <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                <div className="h-1.5 rounded-full" style={{ width: `${c.data.percentage}%`, backgroundColor: c.color }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Tab */}
      {tab === '/analytics/verification' && verification && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { label: 'Verified', data: verification.verified, color: '#10b981' },
            { label: 'Unverified', data: verification.unverified, color: '#f59e0b' },
          ].map((v) => (
            <div key={v.label} className="card p-6" style={{ borderLeft: `4px solid ${v.color}` }}>
              <p className="text-sm font-semibold text-gray-500">{v.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{v.data.count.toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">{v.data.percentage.toFixed(2)}% of total voters</p>
            </div>
          ))}
        </div>
      )}

      {/* Booths Table Tab */}
      {tab === '/analytics/booths-table' && (
        <div className="card">
          <div className="filter-bar rounded-t-xl">
            <Input placeholder="Search booth..." value={boothSearch} onChange={(e) => { setBoothSearch(e.target.value); setBoothsPage(1); }} icon={<Search className="w-4 h-4" />} />
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Booth</th><th>Name</th><th>Total</th>
                  <th>Green %</th><th>Yellow %</th><th>Red %</th><th>Black %</th>
                  <th>Unclassified %</th><th>Verified %</th><th>Strength</th><th>Opportunity</th>
                </tr>
              </thead>
              <tbody>
                {booths.length === 0 ? (
                  <tr><td colSpan={11}><EmptyState icon={<BarChart3 className="w-12 h-12" />} title="No booth data" /></td></tr>
                ) : booths.map((b) => (
                  <tr key={b.id}>
                    <td className="font-medium">#{b.boothNumber}</td>
                    <td>{b.boothName}</td>
                    <td>{b.totalVoters?.toLocaleString()}</td>
                    <td className="text-emerald-700 font-medium">{b.greenPercent?.toFixed(1)}%</td>
                    <td className="text-amber-700 font-medium">{b.yellowPercent?.toFixed(1)}%</td>
                    <td className="text-red-700 font-medium">{b.redPercent?.toFixed(1)}%</td>
                    <td>{b.blackPercent?.toFixed(1)}%</td>
                    <td className="text-gray-500">{b.unclassifiedPercent?.toFixed(1)}%</td>
                    <td className="text-blue-700 font-medium">{b.verifiedPercent?.toFixed(1)}%</td>
                    <td>{b.strength}</td>
                    <td>{b.opportunity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {boothsTotalPages > 1 && (
            <Pagination page={boothsPage} totalPages={boothsTotalPages} total={boothsTotal} limit={20} onPageChange={setBoothsPage} />
          )}
        </div>
      )}

      {/* Booth Analysis Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Strong Booths', to: '/analytics/booths/strong', color: 'bg-emerald-600' },
          { label: 'Weak Booths', to: '/analytics/booths/weak', color: 'bg-red-600' },
          { label: 'Opportunity', to: '/analytics/booths/opportunity', color: 'bg-amber-500' },
          { label: 'High Confidence', to: '/analytics/booths/confidence', color: 'bg-indigo-600' },
        ].map((l) => (
          <Link key={l.to} to={l.to} className={`${l.color} text-white text-sm font-medium px-4 py-3 rounded-xl text-center hover:opacity-90 transition-opacity`}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
