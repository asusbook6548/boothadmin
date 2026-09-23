import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { votersApi } from '../api/voters.api';
import { boothsApi } from '../api/booths.api';
import type { Voter, Booth, VoterFilters } from '../types';
import { SkeletonRow, EmptyState, ErrorState, Pagination, Input, Select } from '../components/ui';
import { ClassificationBadge, VerificationBadge, VoteStatusBadge } from '../components/shared/Badges';
import { useDebounce } from '../hooks/useDebounce';
import { Users, Search, Filter } from 'lucide-react';

const CLASSIFICATION_OPTS = [
  { value: '', label: 'All Classifications' },
  { value: 'GREEN', label: 'Green' },
  { value: 'YELLOW', label: 'Yellow' },
  { value: 'RED', label: 'Red' },
  { value: 'BLACK', label: 'Black' },
];
const VERIFICATION_OPTS = [
  { value: '', label: 'All Verification' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'UNVERIFIED', label: 'Unverified' },
];
const VOTE_STATUS_OPTS = [
  { value: '', label: 'All Vote Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DONE', label: 'Done' },
];
const GENDER_OPTS = [
  { value: '', label: 'All Genders' },
  { value: 'MALE', label: 'Male' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' },
];

export function VotersPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState<VoterFilters>({
    page: 1, limit: 20, search: '', classification: '', verification: '', voteStatus: '', gender: '',
  });
  const debouncedSearch = useDebounce(filters.search as string);

  useEffect(() => {
    boothsApi.getAll({ limit: 200 })
      .then((res) => {
        const d = res.data as unknown as { booths?: Booth[] } | Booth[];
        setBooths(Array.isArray(d) ? d : d.booths ?? []);
      })
      .catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    setError('');
    votersApi.getAll({ ...filters, search: debouncedSearch })
      .then((res) => {
        const d = res.data as unknown as {
          voters?: Voter[];
          data?: Voter[];
          total?: number;
          totalPages?: number;
          pagination?: { total: number; totalPages: number };
        };
        const list = d.voters ?? d.data ?? (Array.isArray(d) ? d : []);
        const totalCount = d.total ?? d.pagination?.total ?? list.length;
        const pages = d.totalPages ?? d.pagination?.totalPages ?? Math.max(1, Math.ceil(totalCount / (filters.limit || 20)));
        setVoters(list);
        setTotal(totalCount);
        setTotalPages(pages);
      })
      .catch(() => setError('Failed to load voters'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filters.page, filters.limit, debouncedSearch, filters.classification, filters.verification, filters.voteStatus, filters.gender, filters.boothId]);

  const set = (key: keyof VoterFilters, value: unknown) =>
    setFilters((f) => ({ ...f, [key]: value, page: key === 'page' ? value as number : 1 }));

  const boothOpts = [{ value: '', label: 'All Booths' }, ...booths.map((b) => ({ value: b.id, label: `#${b.boothNumber} ${b.boothName}` }))];

  return (
    <div className="space-y-5">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Voters</h1>
          <p className="page-subtitle">
            {total > 0 ? `${total.toLocaleString()} total voters` : 'Voter database'}
          </p>
        </div>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="filter-bar rounded-t-xl flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Filter className="w-3.5 h-3.5" /> Filters
          </div>
          <div className="flex-1 min-w-48 max-w-xs">
            <Input
              placeholder="Search EPIC, name, mobile..."
              value={filters.search as string}
              onChange={(e) => set('search', e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select options={boothOpts} value={filters.boothId ?? ''} onChange={(e) => set('boothId', e.target.value)} className="text-sm" />
          <Select options={CLASSIFICATION_OPTS} value={filters.classification ?? ''} onChange={(e) => set('classification', e.target.value)} className="text-sm" />
          <Select options={VERIFICATION_OPTS} value={filters.verification ?? ''} onChange={(e) => set('verification', e.target.value)} className="text-sm" />
          <Select options={VOTE_STATUS_OPTS} value={filters.voteStatus ?? ''} onChange={(e) => set('voteStatus', e.target.value)} className="text-sm" />
          <Select options={GENDER_OPTS} value={filters.gender ?? ''} onChange={(e) => set('gender', e.target.value)} className="text-sm" />
          <div className="flex items-center gap-2">
            <input type="number" placeholder="Age from" className="form-input w-20 text-sm" min={0} max={120}
              onChange={(e) => set('ageFrom', e.target.value ? Number(e.target.value) : '')} />
            <span className="text-gray-400 text-xs">–</span>
            <input type="number" placeholder="To" className="form-input w-20 text-sm" min={0} max={120}
              onChange={(e) => set('ageTo', e.target.value ? Number(e.target.value) : '')} />
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>EPIC</th>
              <th>Name</th>
              <th>Name (Hindi)</th>
              <th>Father Name</th>
              <th>Gender</th>
              <th>Age</th>
              <th>Mobile</th>
              <th>Booth</th>
              <th>Classification</th>
              <th>Verification</th>
              <th>Vote Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 12 }).map((_, i) => <SkeletonRow key={i} cols={12} />)
            ) : error ? (
              <tr><td colSpan={12}><ErrorState message={error} onRetry={load} /></td></tr>
            ) : voters.length === 0 ? (
              <tr><td colSpan={12}><EmptyState icon={<Users className="w-12 h-12" />} title="No voters found" description="Adjust filters or import voter data" /></td></tr>
            ) : (
              voters.map((v) => (
                <tr key={v.id}>
                  <td className="font-mono text-xs text-gray-700 whitespace-nowrap">{v.epic}</td>
                  <td className="font-medium text-gray-900 whitespace-nowrap">{v.name}</td>
                  <td className="text-gray-600 text-xs">{v.nameHindi ?? '—'}</td>
                  <td className="text-gray-600 whitespace-nowrap">{v.fatherName ?? '—'}</td>
                  <td className="text-gray-600">{v.gender ?? '—'}</td>
                  <td className="text-gray-600">{v.age ?? '—'}</td>
                  <td className="font-mono text-xs text-gray-700">{v.mobile ?? '—'}</td>
                  <td className="text-gray-600 text-xs whitespace-nowrap">{v.booth ? `#${v.booth.boothNumber}` : '—'}</td>
                  <td><ClassificationBadge value={v.classification} /></td>
                  <td><VerificationBadge value={v.verification} /></td>
                  <td><VoteStatusBadge value={v.voteStatus} /></td>
                  <td><Link to={`/voters/${v.id}`} className="btn btn-secondary btn-sm whitespace-nowrap">View</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!loading && !error && total > 0 && (
          <Pagination
            page={filters.page as number}
            totalPages={totalPages}
            total={total}
            limit={filters.limit as number}
            onPageChange={(p) => set('page', p)}
            onLimitChange={(l) => set('limit', l)}
          />
        )}
      </div>
    </div>
  );
}
