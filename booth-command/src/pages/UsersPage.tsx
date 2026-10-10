import { useEffect, useState, useMemo } from 'react';
import { usersApi } from '../api/users.api';
import type { User } from '../types';
import { Button, EmptyState, ErrorState, Input, Pagination, Select } from '../components/ui';
import { UserStatusBadge } from '../components/shared/Badges';
import { Modal, ConfirmDialog } from '../components/ui/Modal';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDebounce } from '../hooks/useDebounce';
import { Shield, Search, Plus, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/error';

export const isSystemUser = (u: { name?: string; email?: string }): boolean =>
  Boolean(u.name?.toLowerCase().includes('system') || u.email?.toLowerCase() === 'admin@boothcommand.com');

const createSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});
const editSchema = z.object({ name: z.string().min(2), email: z.string().email() });
const pwSchema = z.object({ newPassword: z.string().min(8, 'Min 8 characters') });
type CreateForm = z.infer<typeof createSchema>;
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

  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  const [editUser, setEditUser] = useState<User | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [pwUser, setPwUser] = useState<User | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [statusUser, setStatusUser] = useState<User | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const aSys = isSystemUser(a) ? 1 : 0;
      const bSys = isSystemUser(b) ? 1 : 0;
      if (aSys !== bSys) return bSys - aSys;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [users]);

  const { register: createReg, handleSubmit: createSub, formState: { errors: createErr }, reset: createReset } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: { status: 'ACTIVE' },
  });
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

        const sortedList = [...list].sort((a, b) => {
          const aSys = isSystemUser(a) ? 1 : 0;
          const bSys = isSystemUser(b) ? 1 : 0;
          if (aSys !== bSys) return bSys - aSys;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        setUsers(sortedList);
        setTotal(total);
        setTotalPages(totalPages);
      })
      .catch((err) => setError(getErrorMessage(err, 'Failed to load users')))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [page, debouncedSearch, statusFilter]);

  const handleCreate = async (data: CreateForm) => {
    setCreateLoading(true);
    try {
      await usersApi.create(data);
      toast.success('User created successfully');
      setCreateOpen(false);
      createReset();
      load();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Failed to create user'));
    } finally {
      setCreateLoading(false);
    }
  };

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
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update user'));
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
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to change password'));
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
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to change status'));
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Admin user management — manage users, credentials, and access permissions</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setCreateOpen(true)}
        >
          Add User
        </Button>
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
            ) : sortedUsers.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon={<Shield className="w-12 h-12" />} title="No users found" action={<Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>Add First User</Button>} /></td></tr>
            ) : (
              sortedUsers.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{u.name}</span>
                      {isSystemUser(u) && (
                        <span className="badge badge-amber text-sm bg-gray-200 font-semibold">System User</span>
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

      {/* Create User Modal */}
      <Modal isOpen={createOpen} onClose={() => { setCreateOpen(false); createReset(); }} title="Create New Admin User">
        <form onSubmit={createSub(handleCreate)} className="p-6 space-y-4">
          <Input
            id="create-name"
            label="Full Name"
            placeholder="e.g. John Doe"
            error={createErr.name?.message}
            {...createReg('name')}
          />
          <Input
            id="create-email"
            label="Email Address"
            type="email"
            placeholder="admin@example.com"
            error={createErr.email?.message}
            {...createReg('email')}
          />
          <div>
            <div className="relative">
              <Input
                id="create-password"
                label="Initial Password"
                type={showCreatePassword ? 'text' : 'password'}
                placeholder="Min 8 characters"
                error={createErr.password?.message}
                {...createReg('password')}
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword(!showCreatePassword)}
                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 focus:outline-none"
                tabIndex={-1}
              >
                {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">Passwords are securely hashed before storage.</p>
          </div>
          <div>
            <label className="form-label" htmlFor="create-status">Initial Status</label>
            <select id="create-status" className="form-select" {...createReg('status')}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="primary" loading={createLoading} icon={<Plus className="w-4 h-4" />}>
              Create User
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); createReset(); }}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

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
