import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { volunteersApi } from '../api/volunteers.api';
import type { Volunteer } from '../types';
import { Button, EmptyState, ErrorState, Input } from '../components/ui';
import { VolunteerStatusBadge } from '../components/shared/Badges';
import { Modal } from '../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDebounce } from '../hooks/useDebounce';
import { UserCheck, Search, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/error';

const createSchema = z.object({
  name: z.string().min(2),
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  password: z.string().min(6),
});
type CreateForm = z.infer<typeof createSchema>;

export function VolunteersPage() {
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const debouncedSearch = useDebounce(search);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const load = () => {
    setLoading(true);
    volunteersApi.getAll()
      .then((r) => {
        const d = r.data;
        setVolunteers(Array.isArray(d) ? d : []);
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load volunteers')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = volunteers.filter((v) =>
    !debouncedSearch || v.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || v.mobile.includes(debouncedSearch)
  );

  const handleCreate = async (data: CreateForm) => {
    setCreateLoading(true);
    try {
      await volunteersApi.create(data);
      toast.success('Volunteer created successfully');
      setCreateOpen(false);
      reset();
      load();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create volunteer'));
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Volunteers</h1>
          <p className="page-subtitle">{volunteers.length} total volunteers</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
          Add Volunteer
        </Button>
      </div>

      <div className="card">
        <div className="filter-bar rounded-t-xl">
          <div className="flex-1 min-w-48 max-w-xs">
            <Input placeholder="Search name or mobile..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search className="w-4 h-4" />} />
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Assigned Booth</th>
              <th>Status</th>
              <th>Created</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((__, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4" /></td>)}</tr>
              ))
            ) : error ? (
              <tr><td colSpan={6}><ErrorState message={error} onRetry={load} /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon={<UserCheck className="w-12 h-12" />} title="No volunteers found" action={<Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>Add First Volunteer</Button>} /></td></tr>
            ) : (
              filtered.map((v) => (
                <tr key={v.id}>
                  <td className="font-medium text-gray-900">{v.name}</td>
                  <td className="font-mono text-sm text-gray-700">{v.mobile}</td>
                  <td className="text-gray-600">{v.booth ? `#${v.booth.boothNumber} ${v.booth.boothName}` : <span className="text-gray-400 italic text-xs">Unassigned</span>}</td>
                  <td><VolunteerStatusBadge value={v.status} /></td>
                  <td className="text-gray-500 text-xs">{new Date(v.createdAt).toLocaleDateString()}</td>
                  <td><Link to={`/volunteers/${v.id}`} className="btn btn-secondary btn-sm">View</Link></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); reset(); }} title="Add Volunteer">
        <form onSubmit={handleSubmit(handleCreate)} className="p-6 space-y-4">
          <Input id="vol-name" label="Full Name" placeholder="Rahul Kumar" error={errors.name?.message} {...register('name')} />
          <Input id="vol-mobile" label="Mobile Number" placeholder="9876543210" error={errors.mobile?.message} {...register('mobile')} />
          <Input id="vol-password" label="Initial Password" type="password" placeholder="Min 6 characters" error={errors.password?.message} {...register('password')} />
          <p className="text-xs text-gray-500">Volunteer authentication uses Mobile + Password (no OTP). Password is securely hashed and never displayed.</p>
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" loading={createLoading}>Create Volunteer</Button>
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); }}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
