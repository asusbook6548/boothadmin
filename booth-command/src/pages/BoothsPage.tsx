import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { boothsApi } from '../api/booths.api';
import { assembliesApi } from '../api/assemblies.api';
import type { Assembly, Booth } from '../types';
import { SkeletonRow, EmptyState, ErrorState, Pagination, Input, Button } from '../components/ui';
import { BoothStatusBadge } from '../components/shared/Badges';
import { Modal } from '../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDebounce } from '../hooks/useDebounce';
import { Landmark, Search, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/error';

const createSchema = z.object({
  boothNumber: z.string().min(1, 'Booth number is required').max(20, 'Maximum 20 characters'),
  name: z.string().min(1, 'Booth name is required').max(150, 'Maximum 150 characters'),
  village: z.string().max(150, 'Maximum 150 characters').optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export function BoothsPage() {
  const [booths, setBooths] = useState<Booth[]>([]);
  const [activeAssembly, setActiveAssembly] = useState<Assembly | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const debouncedSearch = useDebounce(search);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

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

  useEffect(() => {
    load();
  }, [page, debouncedSearch]);

  useEffect(() => {
    assembliesApi.getAll()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data as unknown as { assemblies?: Assembly[] })?.assemblies ?? [];
        const active = list.find((a) => a.isActive) || list[0] || null;
        setActiveAssembly(active);
      })
      .catch(() => {});
  }, []);

  const handleCreate = async (data: CreateForm) => {
    setCreateLoading(true);
    try {
      let assemblyId = activeAssembly?.id;
      if (!assemblyId) {
        const res = await assembliesApi.getAll();
        const list = Array.isArray(res.data) ? res.data : (res.data as unknown as { assemblies?: Assembly[] })?.assemblies ?? [];
        const active = list.find((a) => a.isActive) || list[0];
        assemblyId = active?.id;
      }

      if (!assemblyId) {
        throw new Error('No active assembly found. Please create or activate an assembly first.');
      }

      await boothsApi.create({
        boothNumber: data.boothNumber.trim(),
        name: data.name.trim(),
        village: data.village?.trim() || undefined,
        assemblyId,
      });
      toast.success('Booth created successfully');
      setCreateOpen(false);
      reset();
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create booth'));
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Booths</h1>
          <p className="page-subtitle">All polling booths in the active assembly</p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setCreateOpen(true)}
        >
          Add Booth
        </Button>
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
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={<Landmark className="w-12 h-12" />}
                    title="No booths found"
                    description={search ? 'Try adjusting your search' : 'No booths in this assembly'}
                    action={
                      <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                        Add First Booth
                      </Button>
                    }
                  />
                </td>
              </tr>
            ) : (
              booths.map((b) => (
                <tr key={b.id}>
                  <td className="font-medium text-gray-900">#{b.boothNumber}</td>
                  <td className="font-medium text-gray-900">{b.boothName ?? (b as unknown as { name?: string }).name}</td>
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

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          reset();
        }}
        title="Add Polling Booth"
      >
        <form onSubmit={handleSubmit(handleCreate)} className="p-6 space-y-4">
          <Input
            id="booth-number"
            label="Booth Number"
            placeholder="e.g. 1 or 12A"
            error={errors.boothNumber?.message}
            {...register('boothNumber')}
          />
          <Input
            id="booth-name"
            label="Booth Name / Polling Station"
            placeholder="e.g. Govt Primary School Room 1"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            id="booth-village"
            label="Village / Locality (Optional)"
            placeholder="e.g. Shahdara"
            error={errors.village?.message}
            {...register('village')}
          />
          {activeAssembly && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-900 flex items-center justify-between">
              <div>
                <span className="font-semibold text-indigo-700">Target Assembly: </span>
                <span>{activeAssembly.assemblyName ?? (activeAssembly as unknown as { name?: string }).name}</span>
              </div>
              <span className="font-mono font-medium text-indigo-600">
                #{activeAssembly.assemblyNumber ?? (activeAssembly as unknown as { number?: string | number }).number}
              </span>
            </div>
          )}
          <p className="text-xs text-gray-500">
            This booth will be assigned to the current active Assembly. Audit log will record this creation.
          </p>
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" loading={createLoading}>
              Create Booth
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

