import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { reportsApi } from '../api/reports.api';
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
  const load = () => { setLoading(true); reportsApi.getSummary().then((r) => setData(r.data)).catch(() => setError('Failed')).finally(() => setLoading(false)); };
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
        const d = r.data as unknown as { voters: Voter[]; total: number; totalPages: number };
        setVoters(d.voters ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 1);
      })
      .catch(() => {})
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
// BOOTHS / VOLUNTEERS / CLASSIFICATION REPORTS (simplified)
// ============================================================

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
      const d = r.data;
      setRows(Array.isArray(d) ? d as Record<string,unknown>[] : []);
    }).catch(()=>{}).finally(()=>setLoading(false));
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
                  {columns.map(c => <td key={c}>{String(r[c.toLowerCase().replace(/ /g,'_')] ?? r[c] ?? '—')}</td>)}
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
