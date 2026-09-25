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
  FileText,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Database,
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

function formatKey(key: string): string {
  const map: Record<string, string> = {
    fileName: 'Uploaded File Name',
    totalRows: 'Total Rows in File',
    validRows: 'Valid Records',
    importedRows: 'Successfully Imported Voters',
    duplicateRows: 'Duplicate Records Skipped',
    errorRows: 'Errors Encountered',
    assemblyId: 'Target Assembly ID',
    boothId: 'Booth ID',
    boothNumber: 'Booth Number',
    volunteerId: 'Volunteer ID',
    userId: 'User ID',
    oldStatus: 'Previous Status',
    newStatus: 'Updated Status',
    oldValue: 'Previous Value',
    newValue: 'New Value',
    changedFields: 'Modified Fields',
    strongGreenPercent: 'Strong Green Threshold',
    moderateGreenPercent: 'Moderate Green Threshold',
    highOpportunityYellow: 'High Opportunity Yellow',
    mediumOpportunityYellow: 'Medium Opportunity Yellow',
    highVerification: 'High Verification Target',
    mediumVerification: 'Medium Verification Target',
  };
  if (map[key]) return map[key];
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Human-readable details viewer for non-technical users
 */
function AuditDetailsRenderer({ log }: { log: AuditLog }) {
  const [showTechnical, setShowTechnical] = useState(false);
  const details = log.details as Record<string, unknown> | null;

  if (!details || Object.keys(details).length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-xs text-gray-500">
        No additional details recorded for this activity.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 1. Voter Import Completed */}
      {log.action === 'VOTER_IMPORT_COMPLETED' ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-blue-50/80 border border-blue-200 rounded-lg">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span className="text-[11px] text-blue-700 font-medium block">Source Excel/CSV File</span>
              <span className="text-xs font-bold text-blue-950 font-mono">
                {String(details.fileName || 'Uploaded file')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center">
              <span className="text-[11px] text-gray-500 block mb-0.5">Total Rows</span>
              <span className="text-lg font-bold text-gray-900">
                {Number(details.totalRows || 0).toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center">
              <span className="text-[11px] text-emerald-700 block mb-0.5">Imported</span>
              <span className="text-lg font-bold text-emerald-700">
                {Number(details.importedRows || details.validRows || 0).toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <span className="text-[11px] text-amber-700 block mb-0.5">Duplicates</span>
              <span className="text-lg font-bold text-amber-700">
                {Number(details.duplicateRows || 0).toLocaleString()}
              </span>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
              <span className="text-[11px] text-red-700 block mb-0.5">Errors</span>
              <span className="text-lg font-bold text-red-700">
                {Number(details.errorRows || 0).toLocaleString()}
              </span>
            </div>
          </div>

          {details.assemblyId && (
            <div className="flex items-center justify-between p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
              <span className="text-gray-500 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-gray-400" />
                Target Assembly ID:
              </span>
              <span className="font-mono text-gray-700 text-[11px]">
                {String(details.assemblyId)}
              </span>
            </div>
          )}
        </div>
      ) : log.action === 'VOLUNTEER_CREATED' ? (
        /* 2. Volunteer Created */
        <div className="space-y-2.5">
          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>New volunteer account was created.</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-gray-500 block text-[11px] mb-0.5">Volunteer Name</span>
              <span className="font-bold text-gray-900 text-sm">
                {String(details.name || '—')}
              </span>
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-gray-500 block text-[11px] mb-0.5">Mobile Number</span>
              <span className="font-bold text-gray-900 text-sm font-mono">
                {String(details.mobile || '—')}
              </span>
            </div>
          </div>
        </div>
      ) : log.action === 'VOLUNTEER_BOOTH_ASSIGNED' || log.action === 'VOLUNTEER_BOOTH_UNASSIGNED' ? (
        /* 3. Volunteer Booth Assigned / Unassigned */
        <div className="space-y-2.5">
          <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
            log.action === 'VOLUNTEER_BOOTH_ASSIGNED'
              ? 'bg-blue-50 border border-blue-200 text-blue-900'
              : 'bg-amber-50 border border-amber-200 text-amber-900'
          }`}>
            <CheckCircle2 className={`w-4 h-4 shrink-0 ${
              log.action === 'VOLUNTEER_BOOTH_ASSIGNED' ? 'text-blue-600' : 'text-amber-600'
            }`} />
            <span>
              {log.action === 'VOLUNTEER_BOOTH_ASSIGNED'
                ? 'Volunteer was assigned to a polling booth.'
                : 'Volunteer was removed from polling booth.'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-gray-500 block text-[11px] mb-0.5">Volunteer Name</span>
              <span className="font-bold text-gray-900 text-sm">
                {String(log.volunteer?.name || details.volunteerName || details.name || '—')}
              </span>
              {(log.volunteer?.mobile || details.mobile) && (
                <span className="text-[11px] text-gray-500 font-mono block mt-0.5">
                  {String(log.volunteer?.mobile || details.mobile)}
                </span>
              )}
            </div>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <span className="text-gray-500 block text-[11px] mb-0.5">
                {log.action === 'VOLUNTEER_BOOTH_ASSIGNED' ? 'Assigned Booth' : 'Previous Booth'}
              </span>
              <span className="font-bold text-gray-900 text-sm">
                {String(
                  details.boothNumber
                    ? `Booth #${details.boothNumber}`
                    : details.boothName || details.boothId || (log.entity === 'BOOTH' ? log.entityId : '') || '—'
                )}
              </span>
            </div>
          </div>
        </div>
      ) : log.action === 'SYSTEM_SETTINGS_UPDATED' ? (
        /* 4. System Settings Updated */
        <div className="space-y-2.5">
          <div className="p-2.5 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-purple-600 shrink-0" />
            <span>System thresholds and analysis configuration were updated.</span>
          </div>

          {details.newValues && typeof details.newValues === 'object' ? (
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-200">
                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 text-[11px] uppercase tracking-wider">Configuration Parameter</th>
                    <th className="text-right px-4 py-2.5 font-semibold text-gray-600 text-[11px] uppercase tracking-wider">Updated Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {Object.entries(details.newValues as Record<string, unknown>).map(([k, val]) => (
                    <tr key={k} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-800">{formatKey(k)}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-600">
                        {String(val)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(details).map(([k, val]) => (
                <div key={k} className="flex justify-between items-center p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                  <span className="text-gray-600 font-medium">{formatKey(k)}</span>
                  <span className="font-bold text-indigo-600 font-mono">{String(val)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* 5. Generic Formatted View for other actions */
        <div className="space-y-2">
          {details.oldStatus && details.newStatus && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
              <span className="text-gray-600 font-medium">Status Changed:</span>
              <span className="px-2 py-0.5 rounded bg-gray-200 font-bold text-gray-800">
                {String(details.oldStatus)}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                {String(details.newStatus)}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {Object.entries(details).map(([key, value]) => {
              if (key === 'oldStatus' || key === 'newStatus') return null;

              if (value && typeof value === 'object') {
                return (
                  <div key={key} className="col-span-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
                    <span className="text-gray-500 font-bold block mb-1.5">{formatKey(key)}</span>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(value as Record<string, unknown>).map(([subK, subV]) => (
                        <div key={subK} className="p-2 bg-white border border-gray-200 rounded">
                          <span className="text-[10px] text-gray-500 block">{formatKey(subK)}</span>
                          <span className="font-semibold text-gray-800">{String(subV)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div key={key} className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                  <span className="text-gray-500 text-[11px] font-medium">{formatKey(key)}:</span>
                  <span className="font-semibold text-gray-800 text-xs">{String(value)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Developer / Technical Collapsible */}
      <div className="pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={() => setShowTechnical(!showTechnical)}
          className="text-[11px] text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
        >
          {showTechnical ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{showTechnical ? 'Hide Technical Data' : 'View Technical Data (JSON)'}</span>
        </button>

        {showTechnical && (
          <pre className="mt-2 p-3 bg-gray-900 text-emerald-400 rounded-lg text-[11px] overflow-auto max-h-48 font-mono leading-relaxed">
            {JSON.stringify(details, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
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
                  <th>Target Record</th>
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
                    const details = log.details as Record<string, unknown> | null;

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
                              <span
                                className="text-[11px] text-gray-400 font-mono truncate max-w-[130px]"
                                title={log.entityId}
                              >
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
                          ) : log.volunteer ? (
                            <div className="flex flex-col leading-tight">
                              <span className="text-xs font-medium text-gray-900">
                                {log.volunteer.name}
                              </span>
                              <span className="text-[11px] font-mono text-gray-500">
                                {log.volunteer.mobile} (Volunteer)
                              </span>
                            </div>
                          ) : details?.boothNumber ? (
                            <div className="flex flex-col leading-tight">
                              <span className="text-xs font-medium text-gray-900">
                                Booth #{String(details.boothNumber)}
                              </span>
                              {details.name && (
                                <span className="text-[11px] text-gray-500 truncate max-w-[140px]" title={String(details.name)}>
                                  {String(details.name)}
                                </span>
                              )}
                            </div>
                          ) : details?.email ? (
                            <div className="flex flex-col leading-tight">
                              <span className="text-xs font-medium text-gray-900 truncate max-w-[140px]" title={String(details.email)}>
                                {String(details.email)}
                              </span>
                              {details.role && (
                                <span className="text-[11px] text-gray-500">
                                  {String(details.role)}
                                </span>
                              )}
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

      {/* Detail Modal with Human-Friendly Details */}
      {selectedLog && (
        <Modal
          isOpen={Boolean(selectedLog)}
          onClose={() => setSelectedLog(null)}
          title="Audit Log Details"
          maxWidth="lg"
        >
          <div className="p-6 space-y-5">
            {/* Metadata Summary Card */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50/90 rounded-xl border border-gray-200 text-xs">
              <div>
                <span className="text-gray-500 block text-[11px] mb-1 font-medium">Action</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getActionBadge(
                    selectedLog.action
                  )}`}
                >
                  {selectedLog.action}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] mb-1 font-medium">Timestamp</span>
                <span className="font-mono text-gray-800 text-xs font-medium">
                  {new Date(selectedLog.createdAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] mb-1 font-medium">Target Entity</span>
                <span className="font-semibold text-gray-900">{selectedLog.entity}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] mb-1 font-medium">Entity ID</span>
                <span className="font-mono text-gray-700 text-[11px] break-all">
                  {selectedLog.entityId || '—'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] mb-1 font-medium">Actor (Performed By)</span>
                <span className="text-gray-900 font-medium">
                  {selectedLog.user
                    ? `${selectedLog.user.name} (${selectedLog.user.email})`
                    : selectedLog.volunteer
                      ? `${selectedLog.volunteer.name} (${selectedLog.volunteer.mobile})`
                      : 'System'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px] mb-1 font-medium">Related Voter</span>
                <span className="text-gray-900 font-medium">
                  {selectedLog.voter
                    ? `${selectedLog.voter.name} (${selectedLog.voter.epic})`
                    : '—'}
                </span>
              </div>
              {selectedLog.volunteer && (
                <div>
                  <span className="text-gray-500 block text-[11px] mb-1 font-medium">Related Volunteer</span>
                  <span className="text-gray-900 font-medium">
                    {selectedLog.volunteer.name} ({selectedLog.volunteer.mobile})
                  </span>
                </div>
              )}
            </div>

            {/* Human-Readable Event Information */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Event Activity Details
              </span>
              <AuditDetailsRenderer log={selectedLog} />
            </div>

            
          </div>
        </Modal>
      )}
    </div>
  );
}
