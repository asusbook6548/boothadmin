import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { boothsApi } from '../api/booths.api';
import type { Booth } from '../types';
import { SkeletonRow, EmptyState, ErrorState, Pagination, Input } from '../components/ui';
import { BoothStatusBadge } from '../components/shared/Badges';
import { useDebounce } from '../hooks/useDebounce';
import { Landmark, Search } from 'lucide-react';

export function BoothsPage() {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedSearch = useDebounce(search);

  const load = () => {
    setLoading(true);
    setError('');
    boothsApi.getAll({ page, limit, search: debouncedSearch || undefined })
      .then((res) => {
        const d = res.data as unknown as { booths?: Booth[]; total?: number; totalPages?: number } | Booth[];
        if (Array.isArray(d)) {
          setBooths(d);
          setTotal(d.length);
          setTotalPages(1);
        } else {
          setBooths(d.booths ?? []);
          setTotal(d.total ?? 0);
          setTotalPages(d.totalPages ?? 1);
        }
      })
      .catch(() => setError('Failed to load booths'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, debouncedSearch]);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <h1 className="page-title">Booths</h1>
        <p className="page-subtitle">All polling booths in the active assembly</p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="filter-bar rounded-t-xl">
          <div className="flex-1 min-w-48 max-w-sm">
            <Input
              placeholder="Search booth name or number..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Booth #</th>
              <th>Booth Name</th>
              <th>Village</th>
              <th>Volunteer</th>
              <th>Voter Count</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
            ) : error ? (
              <tr><td colSpan={7}><ErrorState message={error} onRetry={load} /></td></tr>
            ) : booths.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon={<Landmark className="w-12 h-12" />} title="No booths found" description={search ? 'Try adjusting your search' : 'No booths in this assembly'} /></td></tr>
            ) : (
              booths.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium text-gray-900">#{b.boothNumber}</td>
                  <td className="font-medium text-gray-900">{b.boothName}</td>
                  <td className="text-gray-600">{b.village ?? '—'}</td>
                  <td className="text-gray-600">{b.volunteer?.name ?? <span className="text-gray-400 italic text-xs">Unassigned</span>}</td>
                  <td className="text-gray-600">{b._count?.voters?.toLocaleString() ?? '—'}</td>
                  <td><BoothStatusBadge value={b.status} /></td>
                  <td>
                    <Link to={`/booths/${b.id}`} className="btn btn-secondary btn-sm">View</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && !error && totalPages > 1 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
}
