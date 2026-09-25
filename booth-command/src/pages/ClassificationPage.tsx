import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/error';
import { classificationApi } from '../api/classification.api';
import { boothsApi } from '../api/booths.api';
import type { ClassificationSummary, Voter, Booth, Classification } from '../types';
import { SkeletonRow, EmptyState, ErrorState, Pagination, Input, Select, Button, SkeletonCard } from '../components/ui';
import { ClassificationBadge, VerificationBadge } from '../components/shared/Badges';
import { ConfirmDialog } from '../components/ui/Modal';
import { useDebounce } from '../hooks/useDebounce';
import { Tags, Search, CheckSquare } from 'lucide-react';

const CLASSIFICATION_OPTS: { value: string; label: string }[] = [
  { value: '', label: 'All Classifications' },
  { value: 'GREEN', label: 'Green' },
  { value: 'YELLOW', label: 'Yellow' },
  { value: 'RED', label: 'Red' },
  { value: 'BLACK', label: 'Black' },
];


function SummaryCard({
  label,
  count,
  percentage,
  colorClass,
}: {
  label: string;
  count?: number;
  percentage?: number;
  colorClass: string;
}) {
  const safeCount = typeof count === 'number' && !isNaN(count) ? count : 0;
  const safePercentage = typeof percentage === 'number' && !isNaN(percentage) ? percentage : 0;
  return (
    <div className={`card p-4 ${colorClass}`}>
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{safeCount.toLocaleString()}</p>
      <p className="text-xs text-gray-500 mt-0.5">{safePercentage.toFixed(1)}% of total</p>
    </div>
  );
}

export function ClassificationPage() {
  const [summary, setSummary] = useState<ClassificationSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [booths, setBooths] = useState<Booth[]>([]);
  const [voterLoading, setVoterLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [boothFilter, setBoothFilter] = useState('');
  const debouncedSearch = useDebounce(search);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkClass, setBulkClass] = useState<Classification>('GREEN');
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Single classification change
  const [singleVoter, setSingleVoter] = useState<Voter | null>(null);
  const [singleClass, setSingleClass] = useState<Classification>('GREEN');
  const [singleConfirm, setSingleConfirm] = useState(false);
  const [singleLoading, setSingleLoading] = useState(false);

  const loadSummary = () => {
    setSummaryLoading(true);
    classificationApi.getSummary()
      .then((res) => {
        const resObj = res as unknown as Record<string, unknown>;
        const raw = (resObj && typeof resObj === 'object' && resObj.data && typeof resObj.data === 'object')
          ? resObj.data as Record<string, unknown>
          : resObj ?? {};

        const safeNum = (v: unknown): number => (typeof v === 'number' && !isNaN(v) ? v : 0);
        const totalVoters = safeNum(raw.total ?? raw.totalVoters);
        const unclassifiedVoters = safeNum(raw.unclassified ?? raw.unclassifiedVoters);
        const percentages = (raw.percentages ?? {}) as Record<string, unknown>;

        const extractCategory = (key: string) => {
          const val = raw[key];
          if (typeof val === 'number') {
            const pct = safeNum(percentages[key]) || (totalVoters > 0 ? (val / totalVoters) * 100 : 0);
            return { count: val, percentage: pct };
          }
          if (val && typeof val === 'object') {
            const obj = val as Record<string, unknown>;
            const count = safeNum(obj.count);
            const pct = safeNum(obj.percentage) || (totalVoters > 0 ? (count / totalVoters) * 100 : 0);
            return { count, percentage: pct };
          }
          return { count: 0, percentage: safeNum(percentages[key]) };
        };

        const normalized: ClassificationSummary = {
          totalVoters,
          classifiedVoters: safeNum(raw.classifiedVoters) || (totalVoters - unclassifiedVoters),
          unclassifiedVoters,
          green: extractCategory('green'),
          yellow: extractCategory('yellow'),
          red: extractCategory('red'),
          black: extractCategory('black'),
        };
        setSummary(normalized);
      })
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  };

  const loadVoters = useCallback(() => {
    setVoterLoading(true);
    setError('');
    classificationApi.getVoters({
      page, limit, search: debouncedSearch || undefined,
      classification: classFilter as Classification || undefined,
      boothId: boothFilter || undefined,
    })
      .then((r) => {
        const d = r.data as unknown as {
          voters?: Voter[];
          data?: Voter[];
          total?: number;
          totalPages?: number;
          pagination?: { total: number; totalPages: number };
        };
        const list = d.voters ?? d.data ?? (Array.isArray(d) ? d : []);
        const totalCount = d.total ?? d.pagination?.total ?? list.length;
        const pages = d.totalPages ?? d.pagination?.totalPages ?? Math.max(1, Math.ceil(totalCount / limit));
        setVoters(list);
        setTotal(totalCount);
        setTotalPages(pages);
        setSelectedIds(new Set());
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load voters')))
      .finally(() => setVoterLoading(false));
  }, [page, limit, debouncedSearch, classFilter, boothFilter]);

  useEffect(() => { loadSummary(); }, []);
  useEffect(() => { loadVoters(); }, [loadVoters]);

  useEffect(() => {
    boothsApi.getAll({ limit: 200 })
      .then((r) => {
        const d = r.data as unknown as { booths?: Booth[] } | Booth[];
        setBooths(Array.isArray(d) ? d : d.booths ?? []);
      }).catch(() => {});
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === voters.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(voters.map((v) => v.id)));
  };

  const handleBulk = async () => {
    setBulkLoading(true);
    try {
      const res = await classificationApi.bulk(Array.from(selectedIds), bulkClass);
      const updatedCount = res.data?.count ?? selectedIds.size;
      toast.success(`Classification updated for ${updatedCount} voters`);
      setBulkConfirm(false);
      setSelectedIds(new Set());
      loadVoters();
      loadSummary();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Bulk classification failed'));
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSingle = async () => {
    if (!singleVoter) return;
    setSingleLoading(true);
    try {
      await classificationApi.updateVoter(singleVoter.id, { classification: singleClass });
      toast.success('Voter classification updated');
      setSingleConfirm(false);
      setSingleVoter(null);
      loadVoters();
      loadSummary();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update classification'));
    } finally {
      setSingleLoading(false);
    }
  };

  const boothOpts = [{ value: '', label: 'All Booths' }, ...booths.map((b) => ({ value: b.id, label: `#${b.boothNumber} ${b.boothName}` }))];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Classification</h1>
        <p className="page-subtitle">Manage voter political classification</p>
      </div>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <SummaryCard label="Green" count={summary.green?.count} percentage={summary.green?.percentage} colorClass="border-l-4 border-emerald-500" />
          <SummaryCard label="Yellow" count={summary.yellow?.count} percentage={summary.yellow?.percentage} colorClass="border-l-4 border-amber-400" />
          <SummaryCard label="Red" count={summary.red?.count} percentage={summary.red?.percentage} colorClass="border-l-4 border-red-500" />
          <SummaryCard label="Black" count={summary.black?.count} percentage={summary.black?.percentage} colorClass="border-l-4 border-slate-900" />
          <SummaryCard label="Unclassified" count={summary.unclassifiedVoters} percentage={summary.totalVoters > 0 ? (summary.unclassifiedVoters / summary.totalVoters) * 100 : 0} colorClass="border-l-4 border-gray-300" />
        </div>
      )}

      {/* Voter Table */}
      <div className="card">
        {/* Filter Bar */}
        <div className="filter-bar rounded-t-xl flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <Tags className="w-3.5 h-3.5" /> Filter Voters
          </div>
          <div className="flex-1 min-w-48 max-w-xs">
            <Input placeholder="Search EPIC or name..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={<Search className="w-4 h-4" />} />
          </div>
          <Select options={CLASSIFICATION_OPTS} value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1); }} className="text-sm" />
          <Select options={boothOpts} value={boothFilter} onChange={(e) => { setBoothFilter(e.target.value); setPage(1); }} className="text-sm" />
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border-b border-indigo-200">
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-800">{selectedIds.size} voter{selectedIds.size > 1 ? 's' : ''} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <Select
                options={[{ value: 'GREEN', label: 'GREEN' }, { value: 'YELLOW', label: 'YELLOW' }, { value: 'RED', label: 'RED' }, { value: 'BLACK', label: 'BLACK' }]}
                value={bulkClass}
                onChange={(e) => setBulkClass(e.target.value as Classification)}
                className="text-sm"
              />
              <Button variant="primary" size="sm" onClick={() => setBulkConfirm(true)}>Apply to Selected</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </div>
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th className="w-10">
                <input type="checkbox" className="rounded border-gray-300" checked={selectedIds.size === voters.length && voters.length > 0} onChange={toggleAll} />
              </th>
              <th>EPIC</th>
              <th>Name</th>
              <th>Booth</th>
              <th>Classification</th>
              <th>Verification</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {voterLoading ? (
              Array.from({ length: 10 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
            ) : error ? (
              <tr><td colSpan={7}><ErrorState message={error} onRetry={loadVoters} /></td></tr>
            ) : voters.length === 0 ? (
              <tr><td colSpan={7}><EmptyState icon={<Tags className="w-12 h-12" />} title="No voters found" /></td></tr>
            ) : (
              voters.map((v) => (
                <tr key={v.id} className={selectedIds.has(v.id) ? 'bg-indigo-50/50' : ''}>
                  <td>
                    <input type="checkbox" className="rounded border-gray-300" checked={selectedIds.has(v.id)} onChange={() => toggleSelect(v.id)} />
                  </td>
                  <td className="font-mono text-xs text-gray-700">{v.epic}</td>
                  <td className="font-medium text-gray-900">{v.name}</td>
                  <td className="text-gray-600 text-xs">{v.booth ? `#${v.booth.boothNumber}` : '—'}</td>
                  <td><ClassificationBadge value={v.classification} /></td>
                  <td><VerificationBadge value={v.verification} /></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <select
                        className="form-select text-xs py-1 px-2"
                        defaultValue={v.classification ?? ''}
                        onChange={(e) => { setSingleVoter(v); setSingleClass(e.target.value as Classification); setSingleConfirm(true); }}
                      >
                        <option value="" disabled>Change...</option>
                        <option value="GREEN">GREEN</option>
                        <option value="YELLOW">YELLOW</option>
                        <option value="RED">RED</option>
                        <option value="BLACK">BLACK</option>
                      </select>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {!voterLoading && !error && totalPages > 0 && (
          <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
        )}
      </div>

      {/* Single Classification Confirm */}
      <ConfirmDialog
        isOpen={singleConfirm}
        onClose={() => setSingleConfirm(false)}
        onConfirm={handleSingle}
        title="Change Classification"
        message={`Change classification for "${singleVoter?.name}" to ${singleClass}?`}
        confirmLabel="Change"
        confirmVariant="primary"
        loading={singleLoading}
      />

      {/* Bulk Classification Confirm */}
      <ConfirmDialog
        isOpen={bulkConfirm}
        onClose={() => setBulkConfirm(false)}
        onConfirm={handleBulk}
        title="Bulk Classification"
        message={`Change classification for ${selectedIds.size} selected voters to ${bulkClass}? This action is recorded in the audit log.`}
        confirmLabel={`Apply to ${selectedIds.size} Voters`}
        confirmVariant="primary"
        loading={bulkLoading}
      />
    </div>
  );
}
