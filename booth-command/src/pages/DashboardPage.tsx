import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, type PieLabelRenderProps
} from 'recharts';
import { analyticsApi } from '../api/analytics.api';
import { boothsApi } from '../api/booths.api';
import { votersApi } from '../api/voters.api';
import type { OverviewAnalytics, Booth } from '../types';
import { SkeletonCard, ErrorState } from '../components/ui';
import {
  Users, CheckCircle, XCircle, Tags, Landmark, UserCheck, TrendingUp,
  X, ShieldCheck, Zap, Activity
} from 'lucide-react';

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
  const [searchParams, setSearchParams] = useSearchParams();
  const urlBoothId = searchParams.get('boothId') || '';

  const [booths, setBooths] = useState<Booth[]>([]);
  const [selectedBoothId, setSelectedBoothId] = useState<string>(urlBoothId);
  const [data, setData] = useState<OverviewAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const safeNum = (v: unknown): number => (typeof v === 'number' && !isNaN(v) ? v : 0);

  // Fetch all booths for the dropdown filter once on mount
  useEffect(() => {
    boothsApi.getAll({ limit: 500 })
      .then((res) => {
        const d = res.data as unknown as { booths?: Booth[] } | Booth[];
        const list = (Array.isArray(d) ? d : d.booths ?? []) as Booth[];
        setBooths(list);
      })
      .catch((err) => {
        console.error('[DashboardPage] Failed to fetch booths:', err);
      });
  }, []);

  // Sync state if URL changes externally
  useEffect(() => {
    if (urlBoothId !== selectedBoothId) {
      setSelectedBoothId(urlBoothId);
    }
  }, [urlBoothId]);

  const load = (boothIdToLoad: string = selectedBoothId) => {
    setLoading(true);
    setError('');

    if (boothIdToLoad) {
      // Load specific booth data from booth analytics & voter queries
      Promise.allSettled([
        analyticsApi.getBoothById(boothIdToLoad),
        boothsApi.getOne(boothIdToLoad),
        votersApi.getAll({ boothId: boothIdToLoad, limit: 1 }),
        analyticsApi.getBooths({ limit: 500 }),
      ])
        .then(([boothAnResult, boothInfoResult, voterListResult, allBoothsResult]) => {
          // 1. Extract from getBoothById
          const anVal = boothAnResult.status === 'fulfilled' ? ((boothAnResult.value as any)?.data ?? boothAnResult.value) : null;
          const anBooth = (anVal?.booth && typeof anVal.booth === 'object' ? anVal.booth : anVal) as Record<string, unknown> | null;
          const anVoters = ((anVal?.voters as Record<string, unknown>) ?? (anBooth?.voters as Record<string, unknown>) ?? {}) as Record<string, unknown>;
          const anPercentages = ((anVal?.percentages as Record<string, unknown>) ?? (anBooth?.percentages as Record<string, unknown>) ?? {}) as Record<string, unknown>;
          const anAnalysis = ((anVal?.analysis as Record<string, unknown>) ?? (anBooth?.analysis as Record<string, unknown>) ?? {}) as Record<string, unknown>;

          // 2. Extract from getBooths list (merge/fallback)
          let rowItem: Record<string, unknown> | null = null;
          if (allBoothsResult.status === 'fulfilled') {
            const bVal = allBoothsResult.value as unknown as Record<string, unknown> | null;
            const bData = (bVal?.data ?? bVal) as Record<string, unknown> | null;
            const bList = (Array.isArray(bData?.booths) ? bData.booths : Array.isArray(bVal?.booths) ? bVal.booths : []) as Array<Record<string, unknown>>;
            rowItem = bList.find((b) => {
              const bObj = (b.booth && typeof b.booth === 'object' ? b.booth : b) as Record<string, unknown>;
              return String(bObj.id ?? b.id) === String(boothIdToLoad);
            }) ?? null;
          }

          const rowBooth = (rowItem?.booth && typeof rowItem.booth === 'object' ? rowItem.booth : rowItem) as Record<string, unknown> | null;
          const rowVoters = (rowItem?.voters && typeof rowItem.voters === 'object' ? rowItem.voters : {}) as Record<string, unknown>;
          const rowPercentages = (rowItem?.percentages && typeof rowItem.percentages === 'object' ? rowItem.percentages : {}) as Record<string, unknown>;
          const rowAnalysis = (rowItem?.analysis && typeof rowItem.analysis === 'object' ? rowItem.analysis : {}) as Record<string, unknown>;

          // 3. Extract from voters API total count
          const vlData = voterListResult.status === 'fulfilled' ? ((voterListResult.value as any)?.data ?? voterListResult.value) : null;
          const voterCountFromApi = safeNum(vlData?.total ?? vlData?.pagination?.total);

          // 4. Extract booth info
          const infoData = boothInfoResult.status === 'fulfilled' ? ((boothInfoResult.value as any)?.data?.booth ?? (boothInfoResult.value as any)?.data ?? boothInfoResult.value) : null;
          const fallbackBoothFromState = booths.find((b) => b.id === boothIdToLoad);

          const boothId = String(infoData?.id ?? anBooth?.id ?? rowBooth?.id ?? boothIdToLoad);
          const boothNumber = infoData?.boothNumber ?? anBooth?.boothNumber ?? rowBooth?.boothNumber ?? fallbackBoothFromState?.boothNumber ?? '';
          const boothName = infoData?.name ?? infoData?.boothName ?? anBooth?.name ?? anBooth?.boothName ?? rowBooth?.name ?? fallbackBoothFromState?.name ?? '';
          const village = infoData?.village ?? anBooth?.village ?? rowBooth?.village ?? fallbackBoothFromState?.village ?? '';
          const volunteer = infoData?.volunteer ?? anBooth?.volunteer ?? rowBooth?.volunteer ?? fallbackBoothFromState?.volunteer ?? null;

          // 5. Compute Voter Counts for this booth
          const totalVoters = safeNum(
            anVoters.total ?? anVal?.totalVoters ?? rowVoters.total ?? rowItem?.totalVoters ?? voterCountFromApi
          );

          const green = safeNum(anVoters.green ?? anVal?.greenCount ?? rowVoters.green ?? rowItem?.greenCount);
          const yellow = safeNum(anVoters.yellow ?? anVal?.yellowCount ?? rowVoters.yellow ?? rowItem?.yellowCount);
          const red = safeNum(anVoters.red ?? anVal?.redCount ?? rowVoters.red ?? rowItem?.redCount);
          const black = safeNum(anVoters.black ?? anVal?.blackCount ?? rowVoters.black ?? rowItem?.blackCount);
          const classified = green + yellow + red + black;

          let unclassified = safeNum(anVoters.unclassified ?? anVal?.unclassifiedCount ?? rowVoters.unclassified ?? rowItem?.unclassifiedCount);
          if (unclassified === 0 && totalVoters > classified) {
            unclassified = totalVoters - classified;
          }

          const calcPct = (cnt: number) => totalVoters > 0 ? Number(((cnt / totalVoters) * 100).toFixed(1)) : 0;

          const greenPct = safeNum(anPercentages.green ?? anVal?.greenPercent ?? rowPercentages.green ?? rowItem?.greenPercent) || calcPct(green);
          const yellowPct = safeNum(anPercentages.yellow ?? anVal?.yellowPercent ?? rowPercentages.yellow ?? rowItem?.yellowPercent) || calcPct(yellow);
          const redPct = safeNum(anPercentages.red ?? anVal?.redPercent ?? rowPercentages.red ?? rowItem?.redPercent) || calcPct(red);
          const blackPct = safeNum(anPercentages.black ?? anVal?.blackPercent ?? rowPercentages.black ?? rowItem?.blackPercent) || calcPct(black);
          const unclassifiedPct = safeNum(anPercentages.unclassified ?? anVal?.unclassifiedPercent ?? rowPercentages.unclassified ?? rowItem?.unclassifiedPercent) || calcPct(unclassified);

          const verified = safeNum(anVoters.verified ?? anVal?.verifiedCount ?? rowVoters.verified ?? rowItem?.verifiedCount);
          const unverified = safeNum(anVoters.unverified ?? anVal?.unverifiedCount ?? rowVoters.unverified ?? rowItem?.unverifiedCount) || (totalVoters >= verified ? totalVoters - verified : 0);
          const verifiedPct = safeNum(anPercentages.verified ?? anVal?.verifiedPercent ?? rowPercentages.verified ?? rowItem?.verifiedPercent) || calcPct(verified);
          const unverifiedPct = safeNum(anPercentages.unverified ?? anVal?.unverifiedPercent ?? rowPercentages.unverified ?? rowItem?.unverifiedPercent) || calcPct(unverified);

          const greenStrength = String(anAnalysis.greenStrength ?? anVal?.strength ?? rowAnalysis.greenStrength ?? rowItem?.strength ?? (greenPct >= 55 ? 'STRONG' : greenPct >= 40 ? 'MODERATE' : 'WEAK'));
          const yellowOpportunity = String(anAnalysis.yellowOpportunity ?? anVal?.opportunity ?? rowAnalysis.yellowOpportunity ?? rowItem?.opportunity ?? (yellowPct >= 15 ? 'HIGH' : yellowPct >= 8 ? 'MEDIUM' : 'LOW'));
          const dataConfidence = String(anAnalysis.dataConfidence ?? anVal?.confidence ?? rowAnalysis.dataConfidence ?? rowItem?.confidence ?? (verifiedPct >= 80 ? 'HIGH' : verifiedPct >= 50 ? 'MEDIUM' : 'LOW'));

          const normalized: OverviewAnalytics = {
            selectedBooth: {
              id: boothId,
              boothNumber,
              name: boothName,
              village,
              volunteer,
            },
            totalVoters,
            verifiedVoters: verified,
            unverifiedVoters: unverified,
            classifiedVoters: classified,
            unclassifiedVoters: unclassified,
            totalBooths: 1,
            totalVolunteers: volunteer ? 1 : 0,
            classification: {
              green: { count: green, percentage: greenPct },
              yellow: { count: yellow, percentage: yellowPct },
              red: { count: red, percentage: redPct },
              black: { count: black, percentage: blackPct },
              unclassified: { count: unclassified, percentage: unclassifiedPct },
            },
            verification: {
              verified: { count: verified, percentage: verifiedPct },
              unverified: { count: unverified, percentage: unverifiedPct },
            },
            booths: {
              total: 1,
              strong: greenStrength === 'STRONG' ? 1 : 0,
              weak: greenStrength === 'WEAK' ? 1 : 0,
              opportunity: yellowOpportunity === 'HIGH' ? 1 : 0,
              highConfidence: dataConfidence === 'HIGH' ? 1 : 0,
            },
            analysis: {
              greenStrength,
              yellowOpportunity,
              dataConfidence,
            },
          };

          setData(normalized);
        })
        .catch((err) => {
          console.error('[DashboardPage] Error loading booth data:', err);
          setError('Failed to load booth data');
        })
        .finally(() => setLoading(false));
    } else {
      // Load overall assembly data
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
            setError('Failed to load dashboard data');
            return;
          }

          const res = overviewResult.value;
          const raw = (res?.data ?? {}) as unknown as Record<string, unknown>;
          const rawVoters = (raw.voters ?? {}) as Record<string, unknown>;
          const rawVer = (raw.verification ?? {}) as Record<string, unknown>;
          const rawCls = (raw.classification ?? {}) as Record<string, unknown>;
          const rawPercentages = (rawCls.percentages ?? {}) as Record<string, unknown>;
          const rawBooths = (raw.booths ?? {}) as Record<string, unknown>;

          const totalVoters = safeNum(raw.totalVoters ?? rawVoters.total ?? raw.total);

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

          const extractBoothCount = (res?: PromiseSettledResult<unknown>) => {
            if (!res || res.status !== 'fulfilled') return 0;
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

          setData(normalized);
        })
        .catch((err) => {
          console.error('[DashboardPage] Unexpected error in load():', err);
          setError('Failed to load dashboard data');
        })
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    load(selectedBoothId);
  }, [selectedBoothId]);

  const handleBoothChange = (newBoothId: string) => {
    setSelectedBoothId(newBoothId);
    if (newBoothId) {
      setSearchParams({ boothId: newBoothId });
    } else {
      setSearchParams({});
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="page-header flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="skeleton h-7 w-48 rounded" />
            <div className="skeleton h-4 w-64 rounded mt-2" />
          </div>
          <div className="skeleton h-10 w-60 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState message={error} onRetry={() => load(selectedBoothId)} />;
  }

  const selectedBoothObj = booths.find((b) => b.id === selectedBoothId) || data.selectedBooth || null;

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
      {/* Header and Booth Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="page-title">Dashboard</h1>
            {selectedBoothObj && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                Booth #{selectedBoothObj.boothNumber}
              </span>
            )}
          </div>
          <p className="page-subtitle mt-0.5">
            {selectedBoothObj
              ? `Filtered view for Booth #${selectedBoothObj.boothNumber}: ${selectedBoothObj.name || selectedBoothObj.village || 'Booth'} — operational status`
              : 'Assembly overview — current operational status'}
          </p>
        </div>

        {/* Booth Filter Dropdown */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-200 transition-colors">
          <div className="flex items-center gap-1.5 pl-2 text-gray-500">
            <Landmark className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-medium text-gray-600 hidden sm:inline">Booth:</span>
          </div>
          <select
            id="dashboard-booth-filter"
            value={selectedBoothId}
            onChange={(e) => handleBoothChange(e.target.value)}
            className="text-xs sm:text-sm font-medium border-0 bg-transparent py-1.5 pl-2 pr-7 text-gray-900 focus:ring-0 cursor-pointer"
          >
            <option value="">All Booths (Assembly Overview)</option>
            {booths.map((b) => (
              <option key={b.id} value={b.id}>
                #{b.boothNumber} — {b.name || b.village || `Booth ${b.boothNumber}`}
              </option>
            ))}
          </select>
          {selectedBoothId && (
            <button
              onClick={() => handleBoothChange('')}
              title="Reset to all booths"
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Active Booth Banner */}
      {selectedBoothObj && (
        <div className="bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/60 border border-indigo-100 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              #{selectedBoothObj.boothNumber}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-sm sm:text-base">
                {selectedBoothObj.name || `Booth #${selectedBoothObj.boothNumber}`}
                {selectedBoothObj.village && (
                  <span className="text-gray-500 font-normal text-xs sm:text-sm"> ({selectedBoothObj.village})</span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Assigned Volunteer:{' '}
                <span className="font-medium text-gray-800">
                  {selectedBoothObj.volunteer?.name || 'Not assigned'}
                </span>
                {selectedBoothObj.volunteer?.mobile && (
                  <span className="text-gray-400"> • Mob: {selectedBoothObj.volunteer.mobile}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/voters?boothId=${selectedBoothObj.id}`}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              View Booth Voters ({data.totalVoters.toLocaleString()})
            </Link>
            <Link
              to={`/booths/${selectedBoothObj.id}`}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              Booth Details
            </Link>
            <button
              onClick={() => handleBoothChange('')}
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* KPI Row 1 — Voters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="section-title">
            Voter Summary {selectedBoothObj ? `(Booth #${selectedBoothObj.boothNumber})` : ''}
          </h2>
          {selectedBoothObj && (
            <span className="text-xs text-indigo-600 font-medium">Booth-wise metrics</span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Total Voters"
            value={data.totalVoters}
            icon={<Users className="w-5 h-5" />}
            color="indigo"
          />
          <KpiCard
            label="Verified"
            value={data.verifiedVoters}
            icon={<CheckCircle className="w-5 h-5" />}
            sublabel={`${(data.verification?.verified?.percentage ?? 0).toFixed(1)}% of total`}
            color="green"
          />
          <KpiCard
            label="Unverified"
            value={data.unverifiedVoters}
            icon={<XCircle className="w-5 h-5" />}
            sublabel={`${(data.verification?.unverified?.percentage ?? 0).toFixed(1)}% of total`}
            color="amber"
          />
          <KpiCard
            label="Classified"
            value={data.classifiedVoters}
            icon={<Tags className="w-5 h-5" />}
            sublabel={data.totalVoters > 0 ? `${((data.classifiedVoters / data.totalVoters) * 100).toFixed(1)}% of total` : undefined}
            color="slate"
          />
        </div>
      </div>

      {/* KPI Row 2 — Infrastructure / Booth Overview */}
      <div>
        <h2 className="section-title">
          {selectedBoothObj ? 'Booth Operational Status' : 'Infrastructure'}
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {selectedBoothObj ? (
            <>
              <KpiCard
                label="Booth Number & Name"
                value={`#${selectedBoothObj.boothNumber}`}
                sublabel={selectedBoothObj.name || selectedBoothObj.village || 'Booth'}
                icon={<Landmark className="w-5 h-5" />}
                color="indigo"
              />
              <KpiCard
                label="Assigned Volunteer"
                value={selectedBoothObj.volunteer?.name || 'Unassigned'}
                sublabel={selectedBoothObj.volunteer?.mobile ? `Mob: ${selectedBoothObj.volunteer.mobile}` : 'No volunteer assigned'}
                icon={<UserCheck className="w-5 h-5" />}
                color={selectedBoothObj.volunteer ? 'green' : 'slate'}
              />
              <KpiCard
                label="Unclassified Voters"
                value={data.unclassifiedVoters}
                sublabel={data.totalVoters > 0 ? `${((data.unclassifiedVoters / data.totalVoters) * 100).toFixed(1)}% of booth voters` : undefined}
                icon={<TrendingUp className="w-5 h-5" />}
                color="red"
              />
            </>
          ) : (
            <>
              <KpiCard
                label="Total Booths"
                value={data.totalBooths}
                icon={<Landmark className="w-5 h-5" />}
                color="indigo"
              />
              <KpiCard
                label="Volunteers"
                value={data.totalVolunteers}
                icon={<UserCheck className="w-5 h-5" />}
                color="green"
              />
              <KpiCard
                label="Unclassified Voters"
                value={data.unclassifiedVoters}
                icon={<TrendingUp className="w-5 h-5" />}
                color="red"
              />
            </>
          )}
        </div>
      </div>

      {/* Charts + Classification */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classification breakdown */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">
              Voter Classification {selectedBoothObj ? `(Booth #${selectedBoothObj.boothNumber})` : ''}
            </h3>
            {selectedBoothObj && (
              <Link
                to={`/classification?boothId=${selectedBoothObj.id}`}
                className="text-xs text-indigo-600 hover:underline"
              >
                Classify Voters →
              </Link>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <ClassificationProgressBar
              label="GREEN"
              count={data.classification?.green?.count ?? 0}
              percentage={data.classification?.green?.percentage ?? 0}
            />
            <ClassificationProgressBar
              label="YELLOW"
              count={data.classification?.yellow?.count ?? 0}
              percentage={data.classification?.yellow?.percentage ?? 0}
            />
            <ClassificationProgressBar
              label="RED"
              count={data.classification?.red?.count ?? 0}
              percentage={data.classification?.red?.percentage ?? 0}
            />
            <ClassificationProgressBar
              label="BLACK"
              count={data.classification?.black?.count ?? 0}
              percentage={data.classification?.black?.percentage ?? 0}
            />
            <ClassificationProgressBar
              label="Unclassified"
              count={data.classification?.unclassified?.count ?? 0}
              percentage={data.classification?.unclassified?.percentage ?? 0}
            />
          </div>
        </div>

        {/* Pie chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">
            Classification Distribution {selectedBoothObj ? `(Booth #${selectedBoothObj.boothNumber})` : ''}
          </h3>
          {classificationPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={classificationPieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={((p: PieLabelRenderProps) => `${p.name ?? ''} ${((p.percent ?? 0) * 100).toFixed(0)}%`) as unknown as boolean}
                >
                  {classificationPieData.map((entry) => (
                    <Cell key={entry.name} fill={CLASSIFICATION_COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => (typeof v === 'number' ? v.toLocaleString() : String(v))} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              No classification data for this booth
            </div>
          )}
        </div>
      </div>

      {/* Booth Analysis Overview / Assessment */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-800">
            {selectedBoothObj
              ? `Booth #${selectedBoothObj.boothNumber} Strategic Assessment`
              : 'Booth Analysis Overview'}
          </h3>
          <Link
            to={selectedBoothObj ? `/booths/${selectedBoothObj.id}` : '/analytics/booths/strong'}
            className="text-xs text-indigo-600 hover:underline"
          >
            {selectedBoothObj ? 'Full Booth Report →' : 'View details →'}
          </Link>
        </div>

        {selectedBoothObj ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Green Strength */}
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                <div className="flex items-center gap-2 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Green Strength</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-lg font-bold ${
                    data.analysis?.greenStrength === 'STRONG'
                      ? 'text-emerald-700'
                      : data.analysis?.greenStrength === 'MODERATE'
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}>
                    {data.analysis?.greenStrength ?? (data.booths.strong > 0 ? 'STRONG' : 'WEAK')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(data.classification?.green?.percentage ?? 0).toFixed(1)}% Green voters
                </p>
              </div>

              {/* Yellow Opportunity */}
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                <div className="flex items-center gap-2 mb-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Opportunity</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-lg font-bold ${
                    data.analysis?.yellowOpportunity === 'HIGH'
                      ? 'text-amber-600'
                      : 'text-slate-700'
                  }`}>
                    {data.analysis?.yellowOpportunity ?? (data.booths.opportunity > 0 ? 'HIGH' : 'LOW')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(data.classification?.yellow?.percentage ?? 0).toFixed(1)}% Yellow opportunity
                </p>
              </div>

              {/* Data Confidence */}
              <div className="p-4 rounded-xl border border-gray-100 bg-gray-50/60">
                <div className="flex items-center gap-2 mb-1.5">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Data Confidence</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-lg font-bold ${
                    data.analysis?.dataConfidence === 'HIGH'
                      ? 'text-indigo-600'
                      : 'text-slate-700'
                  }`}>
                    {data.analysis?.dataConfidence ?? (data.booths.highConfidence > 0 ? 'HIGH' : 'LOW')}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(data.verification?.verified?.percentage ?? 0).toFixed(1)}% Verification level
                </p>
              </div>
            </div>

            {/* Voter Status Bar */}
            <div className="p-3.5 bg-white border border-gray-100 rounded-xl">
              <div className="flex justify-between items-center text-xs text-gray-600 mb-1.5">
                <span className="font-medium">Booth Composition</span>
                <span>{data.totalVoters.toLocaleString()} Total Voters</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden flex bg-gray-100">
                {data.classification?.green?.count > 0 && (
                  <div
                    style={{ width: `${data.classification.green.percentage}%` }}
                    className="bg-emerald-500 transition-all"
                    title={`Green: ${data.classification.green.count} (${data.classification.green.percentage}%)`}
                  />
                )}
                {data.classification?.yellow?.count > 0 && (
                  <div
                    style={{ width: `${data.classification.yellow.percentage}%` }}
                    className="bg-amber-400 transition-all"
                    title={`Yellow: ${data.classification.yellow.count} (${data.classification.yellow.percentage}%)`}
                  />
                )}
                {data.classification?.red?.count > 0 && (
                  <div
                    style={{ width: `${data.classification.red.percentage}%` }}
                    className="bg-rose-500 transition-all"
                    title={`Red: ${data.classification.red.count} (${data.classification.red.percentage}%)`}
                  />
                )}
                {data.classification?.black?.count > 0 && (
                  <div
                    style={{ width: `${data.classification.black.percentage}%` }}
                    className="bg-slate-800 transition-all"
                    title={`Black: ${data.classification.black.count} (${data.classification.black.percentage}%)`}
                  />
                )}
                {data.classification?.unclassified?.count > 0 && (
                  <div
                    style={{ width: `${data.classification.unclassified.percentage}%` }}
                    className="bg-gray-300 transition-all"
                    title={`Unclassified: ${data.classification.unclassified.count} (${data.classification.unclassified.percentage}%)`}
                  />
                )}
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={boothBarData} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: selectedBoothObj ? `Manage Booth Voters` : 'Manage Voters',
            to: selectedBoothObj ? `/voters?boothId=${selectedBoothObj.id}` : '/voters',
            color: 'bg-indigo-600',
          },
          {
            label: selectedBoothObj ? `Classify Booth Voters` : 'Classification',
            to: selectedBoothObj ? `/classification?boothId=${selectedBoothObj.id}` : '/classification',
            color: 'bg-emerald-600',
          },
          { label: 'Import Voters', to: '/import', color: 'bg-amber-500' },
          { label: 'Analytics', to: '/analytics', color: 'bg-slate-700' },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`${item.color} text-white text-sm font-medium px-4 py-3 rounded-xl text-center hover:opacity-90 transition-opacity shadow-sm`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
