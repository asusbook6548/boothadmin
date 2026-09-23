import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsApi } from '../../api/analytics.api';
import type { BoothAnalyticsRow } from '../../types';
import { SkeletonRow, EmptyState, ErrorState, Pagination, Input } from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import { ChevronLeft, Search } from 'lucide-react';

type AnalysisType = 'strong' | 'weak' | 'opportunity' | 'confidence';

const CONFIG: Record<AnalysisType, { title: string; subtitle: string; fetch: typeof analyticsApi.getStrongBooths; accentClass: string }> = {
  strong: { title: 'Strong Booths', subtitle: 'Booths with high Green % based on configured thresholds', fetch: analyticsApi.getStrongBooths.bind(analyticsApi), accentClass: 'border-l-4 border-emerald-500' },
  weak: { title: 'Weak Booths', subtitle: 'Booths with low Green % based on configured thresholds', fetch: analyticsApi.getWeakBooths.bind(analyticsApi), accentClass: 'border-l-4 border-red-500' },
  opportunity: { title: 'Opportunity Booths', subtitle: 'Booths with high Yellow % — swing voter opportunities', fetch: analyticsApi.getOpportunityBooths.bind(analyticsApi), accentClass: 'border-l-4 border-amber-400' },
  confidence: { title: 'High Confidence Booths', subtitle: 'Booths with high verified voter data', fetch: analyticsApi.getConfidenceBooths.bind(analyticsApi), accentClass: 'border-l-4 border-indigo-500' },
};

export function BoothAnalysisPage({ type }: { type: AnalysisType }) {
  const { title, subtitle, fetch, accentClass } = CONFIG[type];
  const [booths, setBooths] = useState<BoothAnalyticsRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedSearch = useDebounce(search);

  const load = () => {
    setLoading(true);
    setError('');
    fetch({ page, limit: 20, search: debouncedSearch || undefined })
      .then((r) => {
        const d = r.data as unknown as { booths: BoothAnalyticsRow[]; total: number; totalPages: number };
        setBooths(d.booths ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.totalPages ?? 1);
      })
      .catch(() => setError(`Failed to load ${title.toLowerCase()}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, debouncedSearch, type]);

  return (
    <div className="space-y-5">
      <div>
        <Link to="/analytics" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline mb-3">
          <ChevronLeft className="w-4 h-4" /> Back to Analytics
        </Link>
        <h1 className="page-title">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>

      <div className={`card ${accentClass}`}>
        <div className="filter-bar rounded-tl-xl rounded-tr-none">
          <Input placeholder="Search booth name or number..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={<Search className="w-4 h-4" />} />
          {!loading && <span className="text-sm text-gray-500">{total} booths</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Booth #</th>
                <th>Booth Name</th>
                <th>Total Voters</th>
                <th>Green %</th>
                <th>Yellow %</th>
                <th>Red %</th>
                <th>Black %</th>
                <th>Unclassified %</th>
                <th>Verified %</th>
                <th>Strength</th>
                <th>Opportunity</th>
                <th>Confidence</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} cols={13} />)
              ) : error ? (
                <tr><td colSpan={13}><ErrorState message={error} onRetry={load} /></td></tr>
              ) : booths.length === 0 ? (
                <tr><td colSpan={13}><EmptyState title={`No ${title.toLowerCase()} found`} description="Adjust search or check system settings thresholds" /></td></tr>
              ) : booths.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium text-gray-900">#{b.boothNumber}</td>
                  <td>{b.boothName}</td>
                  <td>{b.totalVoters?.toLocaleString()}</td>
                  <td className="text-emerald-700 font-semibold">{b.greenPercent?.toFixed(1)}%</td>
                  <td className="text-amber-700 font-semibold">{b.yellowPercent?.toFixed(1)}%</td>
                  <td className="text-red-700 font-semibold">{b.redPercent?.toFixed(1)}%</td>
                  <td>{b.blackPercent?.toFixed(1)}%</td>
                  <td className="text-gray-500">{b.unclassifiedPercent?.toFixed(1)}%</td>
                  <td className="text-blue-700 font-semibold">{b.verifiedPercent?.toFixed(1)}%</td>
                  <td className="text-xs">{b.strength ?? '—'}</td>
                  <td className="text-xs">{b.opportunity ?? '—'}</td>
                  <td className="text-xs">{b.confidence ?? '—'}</td>
                  <td><Link to={`/booths/${b.id}`} className="btn btn-secondary btn-sm">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && !error && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
