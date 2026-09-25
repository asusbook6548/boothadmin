import { useEffect, useState } from 'react';
import { auditLogsApi } from '../api/audit-logs.api';
import type { AuditLog, AuditLogFilters } from '../types';
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  Select,
  SkeletonRow,
} from '../components/ui';
import { Modal } from '../components/ui/Modal';
import { useDebounce } from '../hooks/useDebounce';
import {
  ClipboardList,
  Search,
  RefreshCw,
  Eye,
  Shield,
  UserCheck,
  Calendar,
  X,
} from 'lucide-react';
import { getErrorMessage } from '../utils/error';

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'USER_CREATED', label: 'User Created' },
  { value: 'USER_UPDATED', label: 'User Updated' },
  { value: 'USER_ACTIVATED', label: 'User Activated' },
  { value: 'USER_DEACTIVATED', label: 'User Deactivated' },
  { value: 'USER_PASSWORD_CHANGED', label: 'Password Changed' },
  { value: 'VOLUNTEER_CREATED', label: 'Volunteer Created' },
  { value: 'VOLUNTEER_UPDATED', label: 'Volunteer Updated' },
  { value: 'VOLUNTEER_STATUS_CHANGED', label: 'Volunteer Status Changed' },
  { value: 'VOLUNTEER_BOOTH_ASSIGNED', label: 'Booth Assigned' },
  { value: 'VOTER_UPDATED', label: 'Voter Updated' },
  { value: 'VOTER_IMPORT_COMPLETED', label: 'Voter Import Completed' },
  { value: 'SYSTEM_SETTINGS_UPDATED', label: 'Settings Updated' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'All Entities' },
  { value: 'USER', label: 'User' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'VOTER', label: 'Voter' },
  { value: 'BOOTH', label: 'Booth' },
  { value: 'IMPORT_BATCH', label: 'Import Batch' },
  { value: 'SYSTEM_SETTINGS', label: 'System Settings' },
];

function getActionBadge(action: string) {
  if (action.includes('CREATED')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (action.includes('UPDATED') || action.includes('ASSIGNED')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (action.includes('DEACTIVATED') || action.includes('PASSWORD')) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200';
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 20,
    search: '',
    action: '',
    entity: '',
    dateFrom: '',
    dateTo: '',
  });

  const debouncedSearch = useDebounce(filters.search as string, 400);

  const loadLogs = () => {
    setLoading(true);
    setError('');

    const queryParams: AuditLogFilters = {
      page: filters.page,
      limit: filters.limit,
    };

    if (debouncedSearch && debouncedSearch.trim()) {
      queryParams.search = debouncedSearch.trim();
    }
    if (filters.action) {
      queryParams.action = filters.action;
    }
    if (filters.entity) {
      queryParams.entity = filters.entity;
    }
    if (filters.dateFrom) {
      queryParams.dateFrom = new Date(filters.dateFrom).toISOString();
    }
    if (filters.dateTo) {
      // Set to end of selected day if plain date is chosen
      const d = new Date(filters.dateTo);
      d.setHours(23, 59, 59, 999);
      queryParams.dateTo = d.toISOString();
    }

    auditLogsApi
      .getAll(queryParams)
      .then((res) => {
        setLogs(res.data || []);
        if (res.pagination) {
          setTotal(res.pagination.total);
          setTotalPages(res.pagination.totalPages || 1);
        } else {
          setTotal((res.data || []).length);
          setTotalPages(1);
        }
      })
      .catch((err) => {
        setError(getErrorMessage(err, 'Failed to load audit logs'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, [
    filters.page,
    filters.limit,
    debouncedSearch,
    filters.action,
    filters.entity,
    filters.dateFrom,
    filters.dateTo,
  ]);

  const updateFilter = (key: keyof AuditLogFilters, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? (value as number) : 1,
    }));
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 20,
      search: '',
      action: '',
      entity: '',
      dateFrom: '',
      dateTo: '',
    });
  };

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.action ||
      filters.entity ||
      filters.dateFrom ||
      filters.dateTo
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-indigo-600" />
            Audit Logs
          </h1>
          <p className="page-subtitle">
            {total > 0
              ? `${total.toLocaleString()} total audit log entries recorded`
              : 'System activity and change history'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
            onClick={() => loadLogs()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="card">
        {/* Filter Bar */}
        <div className="filter-bar rounded-t-xl flex flex-wrap items-center gap-3 p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex-1 min-w-[220px] max-w-sm">
            <Input
              placeholder="Search action, user, volunteer..."
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value)}
              icon={<Search className="w-4 h-4 text-gray-400" />}
            />
          </div>

          <div className="w-44">
            <Select
              options={ACTION_OPTIONS}
              value={filters.action || ''}
              onChange={(e) => updateFilter('action', e.target.value)}
            />
          </div>

          <div className="w-40">
            <Select
              options={ENTITY_OPTIONS}
              value={filters.entity || ''}
              onChange={(e) => updateFilter('entity', e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="date"
              className="form-input py-1 text-xs"
              value={filters.dateFrom || ''}
              onChange={(e) => updateFilter('dateFrom', e.target.value)}
              title="From date"
            />
            <span>to</span>
            <input
              type="date"
              className="form-input py-1 text-xs"
              value={filters.dateTo || ''}
              onChange={(e) => updateFilter('dateTo', e.target.value)}
              title="To date"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              icon={<X className="w-3.5 h-3.5" />}
              onClick={clearFilters}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Content */}
        {error ? (
          <ErrorState message={error} onRetry={loadLogs} />
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table w-full">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Performed By</th>
                  <th>Target Voter</th>
                  <th className="text-right">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} cols={6} />
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <EmptyState
                        icon={<ClipboardList className="w-12 h-12 text-gray-300" />}
                        title="No audit logs found"
                        description={
                          hasActiveFilters
                            ? 'No activity matches your current filters. Try resetting the search or filter options.'
                            : 'No system actions have been recorded yet.'
                        }
                        action={
                          hasActiveFilters ? (
                            <Button variant="secondary" size="sm" onClick={clearFilters}>
                              Reset Filters
                            </Button>
                          ) : undefined
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const formattedDate = new Date(log.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'medium',
                    });

                    return (
                      <tr key={log.id} className="hover:bg-gray-50/75 transition-colors">
                        <td className="whitespace-nowrap text-xs text-gray-600 font-mono">
                          {formattedDate}
                        </td>
                        <td>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getActionBadge(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-col">
                            <span className="font-semibold text-xs text-gray-800">
                              {log.entity}
                            </span>
                            {log.entityId && (
                              <span className="text-[11px] text-gray-400 font-mono truncate max-w-[130px]" title={log.entityId}>
                                {log.entityId}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          {log.user ? (
                            <div className="flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <div className="flex flex-col leading-tight">
                                <span className="text-xs font-medium text-gray-900">
                                  {log.user.name}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  {log.user.email} (Admin)
                                </span>
                              </div>
                            </div>
                          ) : log.volunteer ? (
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <div className="flex flex-col leading-tight">
                                <span className="text-xs font-medium text-gray-900">
                                  {log.volunteer.name}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  {log.volunteer.mobile} (Volunteer)
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">System</span>
                          )}
                        </td>
                        <td>
                          {log.voter ? (
                            <div className="flex flex-col leading-tight">
                              <span className="text-xs font-medium text-gray-900">
                                {log.voter.name}
                              </span>
                              <span className="text-[11px] font-mono text-gray-500">
                                {log.voter.epic}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Eye className="w-3.5 h-3.5 text-gray-500" />}
                            onClick={() => setSelectedLog(log)}
                            className="text-xs"
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && total > 0 && (
          <Pagination
            page={filters.page || 1}
            totalPages={totalPages}
            total={total}
            limit={filters.limit || 20}
            onPageChange={(p) => updateFilter('page', p)}
            onLimitChange={(l) => updateFilter('limit', l)}
          />
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Details"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg text-xs">
              <div>
                <span className="text-gray-500 block">Action</span>
                <span className="font-semibold text-gray-900">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Timestamp</span>
                <span className="font-mono text-gray-900">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Entity</span>
                <span className="font-semibold text-gray-900">{selectedLog.entity}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Entity ID</span>
                <span className="font-mono text-gray-900 text-[11px] break-all">
                  {selectedLog.entityId || '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Actor</span>
                <span className="text-gray-900">
                  {selectedLog.user
                    ? `${selectedLog.user.name} (${selectedLog.user.email})`
                    : selectedLog.volunteer
                    ? `${selectedLog.volunteer.name} (${selectedLog.volunteer.mobile})`
                    : 'System'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Related Voter</span>
                <span className="text-gray-900">
                  {selectedLog.voter
                    ? `${selectedLog.voter.name} (${selectedLog.voter.epic})`
                    : '—'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-gray-700 block mb-1">
                Payload / Details
              </span>
              <pre className="p-3 bg-gray-900 text-emerald-400 rounded-lg text-xs overflow-auto max-h-64 font-mono leading-relaxed">
                {selectedLog.details
                  ? JSON.stringify(selectedLog.details, null, 2)
                  : '// No additional details'}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
