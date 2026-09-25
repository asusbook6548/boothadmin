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

const safeNum = (v: unknown): number => (typeof v === 'number' && !isNaN(v) ? v : 0);

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

  function mapBoothRow(raw: unknown): BoothAnalyticsRow {
    const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const b = (r.booth && typeof r.booth === 'object' ? r.booth : r) as Record<string, unknown>;
    const v = (r.voters && typeof r.voters === 'object' ? r.voters : r) as Record<string, unknown>;
    const p = (r.percentages && typeof r.percentages === 'object' ? r.percentages : r) as Record<string, unknown>;
    const a = (r.analysis && typeof r.analysis === 'object' ? r.analysis : r) as Record<string, unknown>;

    return {
      id: String(b.id ?? r.id ?? ''),
      boothNumber: (b.boothNumber ?? r.boothNumber ?? '') as number,
      boothName: String(b.name ?? b.boothName ?? r.boothName ?? r.name ?? '—'),
      totalVoters: safeNum(v.total ?? r.totalVoters ?? r.total),
      greenPercent: safeNum(p.green ?? r.greenPercent),
      yellowPercent: safeNum(p.yellow ?? r.yellowPercent),
      redPercent: safeNum(p.red ?? r.redPercent),
      blackPercent: safeNum(p.black ?? r.blackPercent),
      unclassifiedPercent: safeNum(p.unclassified ?? r.unclassifiedPercent),
      verifiedPercent: safeNum(p.verified ?? r.verifiedPercent),
      strength: String(a.greenStrength ?? r.strength ?? '—'),
      opportunity: String(a.yellowOpportunity ?? r.opportunity ?? '—'),
      confidence: String(a.dataConfidence ?? r.confidence ?? '—'),
    };
  }

  useEffect(() => {
    setLoading(true);

    Promise.allSettled([
      analyticsApi.getOverview(),
      analyticsApi.getBooths({ limit: 500 }),
      analyticsApi.getClassification(),
      analyticsApi.getVerification(),
      analyticsApi.getStrongBooths({ limit: 1 }),
      analyticsApi.getWeakBooths({ limit: 1 }),
      analyticsApi.getOpportunityBooths({ limit: 1 }),
      analyticsApi.getConfidenceBooths({ limit: 1 }),
    ]).then(([ovRes, allBoothsRes, clRes, vrRes, strongRes, weakRes, oppRes, confRes]) => {
      // 1. Normalize overview
      const ovVal = ovRes.status === 'fulfilled' ? ovRes.value : null;
      const ovObj = ovVal as unknown as Record<string, unknown>;
      const rawOv = (ovObj && typeof ovObj === 'object' && ovObj.data && typeof ovObj.data === 'object')
        ? ovObj.data as Record<string, unknown>
        : ovObj ?? {};
      const rawVoters = (rawOv.voters ?? {}) as Record<string, unknown>;
      const rawVer = (rawOv.verification ?? {}) as Record<string, unknown>;
      const rawCls = (rawOv.classification ?? {}) as Record<string, unknown>;
      const rawPercentages = (rawCls.percentages ?? {}) as Record<string, unknown>;
      const rawBooths = (rawOv.booths ?? {}) as Record<string, unknown>;

      const totalVoters = safeNum(rawOv.totalVoters ?? rawVoters.total ?? rawOv.total);

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
          count = safeNum(rawOv.unclassifiedVoters ?? rawVoters.unclassified);
        }

        if (pct === 0 && totalVoters > 0 && count > 0) {
          pct = Number(((count / totalVoters) * 100).toFixed(1));
        }

        return { count, percentage: pct };
      };

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
          count = safeNum(rawOv.verifiedVoters);
        } else {
          count = safeNum(rawOv.unverifiedVoters);
        }

        if (pct === 0 && totalVoters > 0 && count > 0) {
          pct = Number(((count / totalVoters) * 100).toFixed(1));
        }

        return { count, percentage: pct };
      };

      // Direct computation from getBooths list (most reliable across all active booths)
      let strongFromList: number | null = null;
      let weakFromList: number | null = null;
      let oppFromList: number | null = null;
      let confFromList: number | null = null;

      if (allBoothsRes.status === 'fulfilled') {
        const bVal = allBoothsRes.value as Record<string, unknown> | null;
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

      const extractBoothCount = (res: PromiseSettledResult<unknown>) => {
        if (res.status !== 'fulfilled') return 0;
        const val = res.value as Record<string, unknown> | null;
        const innerData = (val?.data ?? val) as Record<string, unknown> | null;
        const pag = (innerData?.pagination ?? val?.pagination) as Record<string, unknown> | null;
        return safeNum(pag?.total ?? innerData?.total ?? val?.total);
      };

      const strongTotal = strongFromList ?? (typeof rawBooths.strong === 'number' ? rawBooths.strong : extractBoothCount(strongRes));
      const weakTotal = weakFromList ?? (typeof rawBooths.weak === 'number' ? rawBooths.weak : extractBoothCount(weakRes));
      const oppTotal = oppFromList ?? (typeof rawBooths.opportunity === 'number' ? rawBooths.opportunity : extractBoothCount(oppRes));
      const confTotal = confFromList ?? (typeof rawBooths.highConfidence === 'number' ? rawBooths.highConfidence : extractBoothCount(confRes));

      const normalizedOverview: OverviewAnalytics = {
        totalVoters,
        verifiedVoters: safeNum(rawOv.verifiedVoters ?? rawVer.verified),
        unverifiedVoters: safeNum(rawOv.unverifiedVoters ?? rawVer.unverified),
        classifiedVoters: safeNum(rawOv.classifiedVoters ?? rawVoters.classified),
        unclassifiedVoters: safeNum(rawOv.unclassifiedVoters ?? rawVoters.unclassified),
        totalBooths: safeNum(rawOv.totalBooths ?? rawBooths.total),
        totalVolunteers: safeNum(rawOv.totalVolunteers ?? rawBooths.assigned),
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
          total: safeNum(rawBooths.total ?? rawOv.totalBooths),
          strong: strongTotal,
          weak: weakTotal,
          opportunity: oppTotal,
          highConfidence: confTotal,
        },
      };
      setOverview(normalizedOverview);

      // 2. Normalize classification
      const clVal = clRes.status === 'fulfilled' ? clRes.value : null;
      const clObj = clVal as unknown as Record<string, unknown>;
      const rawCl = (clObj && typeof clObj === 'object' && clObj.data && typeof clObj.data === 'object' && !Array.isArray(clObj.data))
        ? clObj.data as Record<string, unknown>
        : clObj ?? {};
      const clTotal = safeNum(rawCl.total ?? rawCl.totalVoters ?? totalVoters);
      const items = Array.isArray(rawCl.data) ? (rawCl.data as Array<{ classification?: string; count?: number; percentage?: number }>) : [];
      const mapFromData: Record<string, { count: number; percentage: number }> = {};
      for (const it of items) {
        if (it.classification) {
          mapFromData[it.classification.toLowerCase()] = {
            count: safeNum(it.count),
            percentage: safeNum(it.percentage),
          };
        }
      }
      const getClCat = (key: string) => {
        if (mapFromData[key]) return mapFromData[key];
        const val = rawCl[key];
        if (typeof val === 'number') {
          return { count: val, percentage: clTotal > 0 ? (val / clTotal) * 100 : 0 };
        }
        if (val && typeof val === 'object') {
          const o = val as Record<string, unknown>;
          return { count: safeNum(o.count), percentage: safeNum(o.percentage) };
        }
        return { count: 0, percentage: 0 };
      };
      const greenCat = getClCat('green');
      const yellowCat = getClCat('yellow');
      const redCat = getClCat('red');
      const blackCat = getClCat('black');
      const unclassifiedCount = safeNum(rawCl.unclassifiedVoters ?? rawCl.unclassified ?? mapFromData['unclassified']?.count);
      const classifiedCount = safeNum(rawCl.classifiedVoters) || (greenCat.count + yellowCat.count + redCat.count + blackCat.count);

      const normalizedClassification: ClassificationAnalytics = {
        totalVoters: clTotal,
        classifiedVoters: classifiedCount,
        unclassifiedVoters: unclassifiedCount,
        green: greenCat,
        yellow: yellowCat,
        red: redCat,
        black: blackCat,
      };
      setClassification(normalizedClassification);

      // 3. Normalize verification
      const vrVal = vrRes.status === 'fulfilled' ? vrRes.value : null;
      const vrObj = vrVal as unknown as Record<string, unknown>;
      const rawVr = (vrObj && typeof vrObj === 'object' && vrObj.data && typeof vrObj.data === 'object')
        ? vrObj.data as Record<string, unknown>
        : vrObj ?? {};
      const vrTotal = safeNum(rawVr.total ?? rawVr.totalVoters ?? totalVoters);
      const getVrCat = (key: 'verified' | 'unverified') => {
        const val = rawVr[key];
        if (typeof val === 'number') {
          const pct = key === 'verified' && rawVr.verifiedPercentage !== undefined
            ? safeNum(rawVr.verifiedPercentage)
            : (vrTotal > 0 ? Number(((val / vrTotal) * 100).toFixed(1)) : 0);
          return { count: val, percentage: pct };
        }
        if (val && typeof val === 'object') {
          const o = val as Record<string, unknown>;
          return { count: safeNum(o.count), percentage: safeNum(o.percentage) };
        }
        return { count: 0, percentage: 0 };
      };
      const normalizedVerification: VerificationAnalytics = {
        totalVoters: vrTotal,
        verified: getVrCat('verified'),
        unverified: getVrCat('unverified'),
      };
      setVerification(normalizedVerification);
    }).catch(() => setError('Failed to load analytics')).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    analyticsApi.getBooths({ page: boothsPage, limit: 20, search: debouncedBoothSearch || undefined })
      .then((r) => {
        const raw = ((r as unknown as { data?: unknown })?.data ?? r) as Record<string, unknown>;
        const rawList = (Array.isArray(raw) ? raw : (raw.booths ?? raw.data ?? [])) as unknown[];
        const list = rawList.map(mapBoothRow);
        const total = typeof raw.total === 'number' ? raw.total : (safeNum((raw.pagination as Record<string, unknown>)?.total) || list.length);
        const totalPages = typeof raw.totalPages === 'number' ? raw.totalPages : (safeNum((raw.pagination as Record<string, unknown>)?.totalPages) || Math.max(1, Math.ceil(total / 20)));
        setBooths(list);
        setBoothsTotal(total);
        setBoothsTotalPages(totalPages);
      }).catch((err) => {
        console.error('[AnalyticsPage] Failed to load booth table:', err);
      });
  }, [boothsPage, debouncedBoothSearch]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  if (error) return <ErrorState message={error} />;

  const pieData = overview ? [
    { name: 'GREEN', value: overview.classification?.green?.count ?? 0 },
    { name: 'YELLOW', value: overview.classification?.yellow?.count ?? 0 },
    { name: 'RED', value: overview.classification?.red?.count ?? 0 },
    { name: 'BLACK', value: overview.classification?.black?.count ?? 0 },
    { name: 'Unclassified', value: overview.classification?.unclassified?.count ?? 0 },
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
                    { label: 'Verified', pct: verification.verified?.percentage ?? 0, count: verification.verified?.count ?? 0, color: '#10b981' },
                    { label: 'Unverified', pct: verification.unverified?.percentage ?? 0, count: verification.unverified?.count ?? 0, color: '#f59e0b' },
                  ].map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{r.label}</span>
                        <span className="text-gray-500">{(r.count ?? 0).toLocaleString()} ({(r.pct ?? 0).toFixed(1)}%)</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full">
                        <div className="h-3 rounded-full" style={{ width: `${r.pct ?? 0}%`, backgroundColor: r.color }} />
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
              <p className="text-2xl font-bold text-gray-900 mt-1">{(c.data?.count ?? 0).toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">{(c.data?.percentage ?? 0).toFixed(1)}%</p>
              <div className="h-1.5 bg-gray-100 rounded-full mt-2">
                <div className="h-1.5 rounded-full" style={{ width: `${c.data?.percentage ?? 0}%`, backgroundColor: c.color }} />
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
              <p className="text-3xl font-bold text-gray-900 mt-2">{(v.data?.count ?? 0).toLocaleString()}</p>
              <p className="text-sm text-gray-500 mt-1">{(v.data?.percentage ?? 0).toFixed(2)}% of total voters</p>
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
