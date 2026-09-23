import { useEffect, useState } from 'react';
import { usersApi } from '../api/users.api';
import type { User } from '../types';
import { Button, EmptyState, ErrorState, Input, Pagination, Select } from '../components/ui';
import { UserStatusBadge } from '../components/shared/Badges';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDebounce } from '../hooks/useDebounce';
import { Shield, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const editSchema = z.object({ name: z.string().min(2), email: z.string().email() });
const pwSchema = z.object({ newPassword: z.string().min(8, 'Min 8 characters') });
type EditForm = z.infer<typeof editSchema>;
type PwForm = z.infer<typeof pwSchema>;

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedSearch = useDebounce(search);

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [pwUser, setPwUser] = useState<User | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [statusUser, setStatusUser] = useState<User | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const { register: editReg, handleSubmit: editSub, formState: { errors: editErr }, reset: editReset, setValue } = useForm<EditForm>({ resolver: zodResolver(editSchema) });
  const { register: pwReg, handleSubmit: pwSub, formState: { errors: pwErr }, reset: pwReset } = useForm<PwForm>({ resolver: zodResolver(pwSchema) });

  const load = () => {
    setLoading(true);
    usersApi.getAll({
      page,
      limit: 20,
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
    })
      .then((r) => {
        const payload = (r?.data ?? r) as unknown as Record<string, unknown>;
        const list: User[] = Array.isArray(payload)
          ? (payload as User[])
          : Array.isArray(payload.data)
          ? (payload.data as User[])
          : Array.isArray(payload.users)
          ? (payload.users as User[])
          : [];
        const safeNum = (v: unknown, fallback: number): number =>
          typeof v === 'number' && !isNaN(v) ? v : fallback;
        const total = safeNum(payload.total, list.length);
        const totalPages = safeNum(
          payload.totalPages,
          Math.max(1, Math.ceil(total / 20))
        );

        setUsers(list);
        setTotal(total);
        setTotalPages(totalPages);
      })
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, debouncedSearch, statusFilter]);

  const openEdit = (u: User) => {
    setEditUser(u);
    setValue('name', u.name);
    setValue('email', u.email);
  };

  const handleEdit = async (data: EditForm) => {
    if (!editUser) return;
    setEditLoading(true);
    try {
      await usersApi.update(editUser.id, data);
      toast.success('User updated successfully');
      setEditUser(null);
      editReset();
      load();
    } catch {
      toast.error('Failed to update user');
    } finally {
      setEditLoading(false);
    }
  };

  const handlePw = async (data: PwForm) => {
    if (!pwUser) return;
    setPwLoading(true);
    try {
      await usersApi.changePassword(pwUser.id, data.newPassword);
      toast.success('Password updated successfully');
      setPwUser(null);
      pwReset();
    } catch {
      toast.error('Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  const handleStatus = async () => {
    if (!statusUser) return;
    setStatusLoading(true);
    try {
      await usersApi.changeStatus(statusUser.id, statusUser.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE');
      toast.success('User status updated');
      setStatusUser(null);
      load();
    } catch {
      toast.error('Failed to change status');
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Admin user management — no user creation or deletion supported</p>
        </div>
      </div>

      <div className="card">
        <div className="filter-bar rounded-t-xl gap-3 flex-wrap">
          <div className="flex-1 min-w-48 max-w-xs">
            <Input placeholder="Search name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} icon={<Search className="w-4 h-4" />} />
          </div>
          <Select
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="text-sm min-w-36"
          />
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 6 }).map((__, j) => <td key={j} className="px-4 py-3"><div className="skeleton h-4" /></td>)}</tr>
              ))
            ) : error ? (
              <tr><td colSpan={6}><ErrorState message={error} onRetry={load} /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon={<Shield className="w-12 h-12" />} title="No users found" /></td></tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{u.name}</span>
                      {(u.name.toLowerCase().includes('system') || u.email === 'admin@boothcommand.com') && (
                        <span className="badge badge-amber text-xs font-semibold">System User</span>
                      )}
                    </div>
                  </td>
                  <td className="text-gray-600">{u.email}</td>
                  <td><span className="badge badge-indigo">{u.role}</span></td>
                  <td><UserStatusBadge value={u.status} /></td>
                  <td className="text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(u)} className="btn btn-secondary btn-sm">Edit</button>
                      <button onClick={() => setStatusUser(u)} className="btn btn-secondary btn-sm">
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => setPwUser(u)} className="btn btn-secondary btn-sm">Password</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && totalPages > 1 && <Pagination page={page} totalPages={totalPages} total={total} limit={20} onPageChange={setPage} />}
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editUser} onClose={() => { setEditUser(null); editReset(); }} title="Edit User">
        <form onSubmit={editSub(handleEdit)} className="p-6 space-y-4">
          <Input id="edit-name" label="Name" error={editErr.name?.message} {...editReg('name')} />
          <Input id="edit-email" label="Email" type="email" error={editErr.email?.message} {...editReg('email')} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" loading={editLoading}>Save Changes</Button>
            <Button type="button" variant="secondary" onClick={() => { setEditUser(null); editReset(); }}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Password Modal */}
      <Modal isOpen={!!pwUser} onClose={() => { setPwUser(null); pwReset(); }} title="Change Password">
        <form onSubmit={pwSub(handlePw)} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">Changing password for <strong>{pwUser?.name}</strong>. Passwords are stored as bcrypt hashes and cannot be viewed.</p>
          <Input id="new-password" label="New Password" type="password" placeholder="Min 8 characters" error={pwErr.newPassword?.message} {...pwReg('newPassword')} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="danger" loading={pwLoading}>Set New Password</Button>
            <Button type="button" variant="secondary" onClick={() => { setPwUser(null); pwReset(); }}>Cancel</Button>
          </div>
        </form>
      </Modal>

      {/* Status Confirm */}
      <ConfirmDialog
        isOpen={!!statusUser}
        onClose={() => setStatusUser(null)}
        onConfirm={handleStatus}
        title={statusUser?.status === 'ACTIVE' ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${statusUser?.status === 'ACTIVE' ? 'deactivate' : 'activate'} ${statusUser?.name}?`}
        confirmVariant={statusUser?.status === 'ACTIVE' ? 'danger' : 'success'}
        confirmLabel={statusUser?.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        loading={statusLoading}
      />
    </div>
  );
}
