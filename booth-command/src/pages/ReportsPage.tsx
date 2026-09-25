import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { reportsApi } from '../api/reports.api';
import { analyticsApi } from '../api/analytics.api';
import type { ReportSummary, Voter } from '../types';
import { SkeletonCard, EmptyState, ErrorState, Pagination, Input, Select, Button } from '../components/ui';
import { ClassificationBadge, VerificationBadge } from '../components/shared/Badges';
import { useDebounce } from '../hooks/useDebounce';
import { FileText, Search, Download, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const REPORT_NAV = [
  { to: '/reports', label: 'Summary', exact: true },
  { to: '/reports/voters', label: 'Voters' },
  { to: '/reports/booths', label: 'Booths' },
  { to: '/reports/volunteers', label: 'Volunteers' },
  { to: '/reports/classification', label: 'Classification' },
];

function ReportsNav() {
  const location = useLocation();
  return (
    <nav className="flex gap-1 border-b border-gray-200">
      {REPORT_NAV.map((n) => {
        const active = n.exact ? location.pathname === n.to : location.pathname === n.to;
        return (
          <Link key={n.to} to={n.to} className={clsx(
            'px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
            active ? 'text-indigo-600 border-indigo-600' : 'text-gray-500 border-transparent hover:text-gray-700'
          )}>{n.label}</Link>
        );
      })}
    </nav>
  );
}

// ============================================================
// SUMMARY REPORT
// ============================================================
export function SummaryReportPage() {
  const [data, setData] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.allSettled([
      reportsApi.getSummary(),
      analyticsApi.getOverview(),
    ])
      .then(([summaryRes, overviewRes]) => {
        const rawSum = (summaryRes.status === 'fulfilled' ? (summaryRes.value as unknown as { data?: unknown })?.data ?? summaryRes.value : {}) as Record<string, unknown>;
        const rawOv = (overviewRes.status === 'fulfilled' ? (overviewRes.value as unknown as { data?: unknown })?.data ?? overviewRes.value : {}) as Record<string, unknown>;
        const rawVoters = (rawOv.voters ?? {}) as Record<string, unknown>;
        const rawVer = (rawOv.verification ?? {}) as Record<string, unknown>;
        const rawBooths = (rawOv.booths ?? {}) as Record<string, unknown>;
        const rawCls = (rawOv.classification ?? {}) as Record<string, unknown>;
        const rawPercentages = (rawCls.percentages ?? {}) as Record<string, unknown>;

        const safeNum = (v: unknown): number => (typeof v === 'number' && !isNaN(v) ? v : 0);
        const totalVoters = safeNum(rawSum.total ?? rawSum.totalVoters ?? rawOv.totalVoters ?? rawVoters.total);

        const getCat = (key: string) => {
          const s = (rawSum[key] ?? {}) as Record<string, unknown>;
          const sCount = safeNum(s.count ?? rawSum[key]);
          if (sCount > 0) {
            return {
              count: sCount,
              percentage: safeNum(s.percentage) || (totalVoters > 0 ? (sCount / totalVoters) * 100 : 0),
            };
          }
          const ovVal = rawCls[key];
          const ovCount = typeof ovVal === 'number' ? ovVal : safeNum((ovVal as Record<string, unknown>)?.count);
          const ovPct = safeNum(rawPercentages[key] ?? (ovVal as Record<string, unknown>)?.percentage) || (totalVoters > 0 ? (ovCount / totalVoters) * 100 : 0);
          return { count: ovCount, percentage: ovPct };
        };

        const green = getCat('green');
        const yellow = getCat('yellow');
        const red = getCat('red');
        const black = getCat('black');
        const unclassifiedCount = safeNum(
          (rawSum.unclassified as Record<string, unknown>)?.count ?? rawSum.unclassified ?? rawSum.unclassifiedVoters ?? rawOv.unclassifiedVoters ?? rawVoters.unclassified
        );
        const unclassifiedPct = totalVoters > 0 ? (unclassifiedCount / totalVoters) * 100 : 0;
        const unclassified = { count: unclassifiedCount, percentage: unclassifiedPct };
        const classifiedVoters = safeNum(rawSum.classifiedVoters ?? rawOv.classifiedVoters ?? rawVoters.classified) || (green.count + yellow.count + red.count + black.count);

        const normalized: ReportSummary = {
          totalVoters,
          classifiedVoters,
          unclassifiedVoters: unclassifiedCount,
          verifiedVoters: safeNum(rawSum.verifiedVoters ?? rawOv.verifiedVoters ?? rawVer.verified),
          unverifiedVoters: safeNum(rawSum.unverifiedVoters ?? rawOv.unverifiedVoters ?? rawVer.unverified),
          green,
          yellow,
          red,
          black,
          totalBooths: safeNum(rawSum.totalBooths ?? rawOv.totalBooths ?? rawBooths.total),
          totalVolunteers: safeNum(rawSum.totalVolunteers ?? rawOv.totalVolunteers ?? rawBooths.assigned),
        };

        setData(normalized);
      })
      .catch((err) => {
        console.error('[ReportsPage] Summary load failed:', err);
        setError('Failed to load summary');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-5">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Reports</h1><p className="page-subtitle">Assembly data summaries and exports</p></div>
        <Button variant="secondary" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={load} loading={loading}>Refresh</Button>
      </div>
      <ReportsNav />
      {loading ? <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length: 6}).map((_,i)=><SkeletonCard key={i}/>)}</div>
        : error ? <ErrorState message={error} onRetry={load} />
        : !data ? <EmptyState icon={<FileText className="w-12 h-12" />} title="No summary data" />
        : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Voters', value: data.totalVoters },
              { label: 'Classified', value: data.classifiedVoters },
              { label: 'Unclassified', value: data.unclassifiedVoters },
              { label: 'Verified', value: data.verifiedVoters },
              { label: 'Unverified', value: data.unverifiedVoters },
              { label: 'Total Booths', value: data.totalBooths },
              { label: 'Volunteers', value: data.totalVolunteers },
              { label: 'Green Voters', value: data.green?.count },
            ].map((k) => (
              <div key={k.label} className="card p-5">
                <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">{k.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{k.value?.toLocaleString() ?? '—'}</p>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

// ============================================================
// VOTERS REPORT
// ============================================================
export function VotersReportPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [classification, setClassification] = useState('');
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const debouncedSearch = useDebounce(search);

  const load = () => {
    setLoading(true);
    reportsApi.getVoters({ page, limit: 20, search: debouncedSearch || undefined, classification: classification as never || undefined })
      .then((r) => {
        const raw = (r as unknown as { data?: unknown })?.data ?? r;
        const rawObj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
        const list = (rawObj.data ?? rawObj.voters ?? (Array.isArray(raw) ? raw : [])) as Voter[];
        const totalCount = typeof rawObj.total === 'number' ? rawObj.total : list.length;
        const totalP = typeof rawObj.totalPages === 'number' ? rawObj.totalPages : Math.max(1, Math.ceil(totalCount / 20));
        setVoters(list);
        setTotal(totalCount);
        setTotalPages(totalP);
      })
      .catch((err) => console.error('[ReportsPage] Voters load failed:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, debouncedSearch, classification]);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setExportLoading(true);
    toast.loading('Preparing export...', { id: 'export' });
    try {
      await reportsApi.exportVoters({ search: debouncedSearch || undefined, classification: classification as never || undefined, format });
      toast.success('Export downloaded', { id: 'export' });
    } catch {
      toast.error('Export failed', { id: 'export' });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header flex items-center justify-between">
        <div><h1 className="page-title">Reports</h1></div>
      </div>
      <ReportsNav />
      <div className="card">
        <div className="filter-bar rounded-t-xl gap-3">
          <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
          <Select options={[{value:'',label:'All Classifications'},{value:'GREEN',label:'Green'},{value:'YELLOW',label:'Yellow'},{value:'RED',label:'Red'},{value:'BLACK',label:'Black'}]} value={classification} onChange={(e) => setClassification(e.target.value)} className="text-sm"/>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4"/>} loading={exportLoading} onClick={() => handleExport('xlsx')}>Excel</Button>
            <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4"/>} loading={exportLoading} onClick={() => handleExport('csv')}>CSV</Button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>EPIC</th><th>Name</th><th>Gender</th><th>Age</th><th>Classification</th><th>Verification</th></tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:10}).map((_,i)=><tr key={i}>{Array.from({length:6}).map((__,j)=><td key={j} className="px-4 py-3"><div className="skeleton h-4"/></td>)}</tr>)
              : voters.length === 0 ? <tr><td colSpan={6}><EmptyState icon={<FileText className="w-10 h-10"/>} title="No voter data"/></td></tr>
              : voters.map((v) => (
                <tr key={v.id}>
                  <td className="font-mono text-xs">{v.epic}</td>
                  <td className="font-medium">{v.name}</td>
                  <td>{v.gender ?? '—'}</td>
                  <td>{v.age ?? '—'}</td>
                  <td><ClassificationBadge value={v.classification}/></td>
                  <td><VerificationBadge value={v.verification}/></td>
                </tr>
              ))}
          </tbody>
        </table>
        {!loading && totalPages > 1 && <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage}/>}
      </div>
    </div>
  );
}

// ============================================================
// BOOTHS / VOLUNTEERS / CLASSIFICATION REPORTS
// ============================================================

function getCellValue(r: Record<string, unknown>, col: string): string {
  const c = col.toLowerCase().replace(/ /g, '_');
  // Handle booth report fields
  if (c === 'booth_number') return r.boothNumber !== undefined ? `#${r.boothNumber}` : (r.number ? `#${r.number}` : '—');
  if (c === 'booth_name') return String(r.boothName ?? r.name ?? '—');
  if (c === 'voters') {
    const v = r.totalVoters ?? r.total ?? (r._count as Record<string, unknown>)?.voters;
    return typeof v === 'number' ? v.toLocaleString() : (v !== undefined ? String(v) : '—');
  }
  if (c === 'volunteer') return String(r.volunteerName ?? (r.volunteer as Record<string, unknown>)?.name ?? '—');

  // Handle volunteer report fields
  if (c === 'name') return String(r.name ?? '—');
  if (c === 'mobile') return String(r.mobile ?? '—');
  if (c === 'status') return String(r.status ?? '—');
  if (c === 'booth') {
    if (r.boothNumber || r.boothName) {
      return `#${r.boothNumber ?? ''} ${r.boothName ?? ''}`.trim() || '—';
    }
    if (r.booth) {
      const b = r.booth as Record<string, unknown>;
      return `#${b.boothNumber ?? ''} ${b.name ?? b.boothName ?? ''}`.trim() || '—';
    }
    return 'Unassigned';
  }

  // Handle classification report fields
  if (c === 'classification') return String(r.classification ?? '—');
  if (c === 'count') return typeof r.count === 'number' ? r.count.toLocaleString() : String(r.count ?? '—');
  if (c === 'percentage') return typeof r.percentage === 'number' ? `${r.percentage.toFixed(1)}%` : String(r.percentage ?? '—');

  // Generic fallback
  const val = r[c] ?? r[col] ?? r[col.toLowerCase()];
  return val !== undefined && val !== null ? String(val) : '—';
}

function SimpleReport({ navLabel, fetchFn, exportFn, columns }: {
  title: string; navLabel: string;
  fetchFn: () => Promise<{ data: unknown }>;
  exportFn: (format: 'xlsx' | 'csv') => Promise<void>;
  columns: string[];
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchFn().then((r) => {
      const resData = ((r as unknown as { data?: unknown })?.data ?? r) as Record<string, unknown>;
      let rowsList: Record<string, unknown>[] = [];
      if (Array.isArray(resData)) {
        rowsList = resData;
      } else if (resData && typeof resData === 'object') {
        if (Array.isArray(resData.data)) {
          rowsList = resData.data as Record<string, unknown>[];
        } else if (Array.isArray(resData.booths)) {
          rowsList = resData.booths as Record<string, unknown>[];
        } else if (Array.isArray(resData.volunteers)) {
          rowsList = resData.volunteers as Record<string, unknown>[];
        } else if (resData.green && resData.yellow) {
          // Classification report object shape: { green, yellow, red, black, unclassified }
          const g = resData.green as { count?: number; percentage?: number };
          const y = resData.yellow as { count?: number; percentage?: number };
          const red = resData.red as { count?: number; percentage?: number };
          const blk = resData.black as { count?: number; percentage?: number };
          const unc = resData.unclassified as { count?: number; percentage?: number };
          rowsList = [
            { classification: 'GREEN', count: g?.count ?? 0, percentage: g?.percentage ?? 0 },
            { classification: 'YELLOW', count: y?.count ?? 0, percentage: y?.percentage ?? 0 },
            { classification: 'RED', count: red?.count ?? 0, percentage: red?.percentage ?? 0 },
            { classification: 'BLACK', count: blk?.count ?? 0, percentage: blk?.percentage ?? 0 },
            { classification: 'UNCLASSIFIED', count: unc?.count ?? 0, percentage: unc?.percentage ?? 0 },
          ];
        }
      }
      setRows(rowsList);
    }).catch((err) => {
      console.error(`[ReportsPage] Failed to fetch ${navLabel}:`, err);
    }).finally(() => setLoading(false));
  }, []);

  const handleExport = async (format: 'xlsx' | 'csv') => {
    setExportLoading(true);
    toast.loading('Preparing export...', { id: 'exp' });
    try {
      await exportFn(format);
      toast.success('Export downloaded', { id: 'exp' });
    } catch {
      toast.error('Export failed', { id: 'exp' });
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header"><h1 className="page-title">Reports</h1></div>
      <ReportsNav />
      <div className="card">
        <div className="filter-bar rounded-t-xl justify-end">
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4"/>} loading={exportLoading} onClick={()=>handleExport('xlsx')}>Excel</Button>
          <Button variant="secondary" size="sm" icon={<Download className="w-4 h-4"/>} loading={exportLoading} onClick={()=>handleExport('csv')}>CSV</Button>
        </div>
        <table className="data-table">
          <thead>
            <tr>{columns.map(c=><th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? Array.from({length:6}).map((_,i)=><tr key={i}>{columns.map((_,j)=><td key={j} className="px-4 py-3"><div className="skeleton h-4"/></td>)}</tr>)
              : rows.length === 0 ? <tr><td colSpan={columns.length}><EmptyState title={`No ${navLabel.toLowerCase()} data`}/></td></tr>
              : rows.map((r,i) => (
                <tr key={i}>
                  {columns.map(c => <td key={c} className="px-4 py-3 text-sm text-gray-800">{getCellValue(r, c)}</td>)}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BoothsReportPage() {
  return <SimpleReport title="Booth Report" navLabel="Booths" fetchFn={reportsApi.getBooths.bind(reportsApi)} exportFn={reportsApi.exportBooths.bind(reportsApi)} columns={['Booth Number', 'Booth Name', 'Voters', 'Volunteer']} />;
}
export function VolunteersReportPage() {
  return <SimpleReport title="Volunteer Report" navLabel="Volunteers" fetchFn={reportsApi.getVolunteers.bind(reportsApi)} exportFn={reportsApi.exportVolunteers.bind(reportsApi)} columns={['Name', 'Mobile', 'Status', 'Booth']} />;
}
export function ClassificationReportPage() {
  return <SimpleReport title="Classification Report" navLabel="Classification" fetchFn={reportsApi.getClassification.bind(reportsApi)} exportFn={reportsApi.exportClassification.bind(reportsApi)} columns={['Classification', 'Count', 'Percentage']} />;
}
