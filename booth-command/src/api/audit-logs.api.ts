import client from './client';
import type { AuditLogsResponse, AuditLogFilters } from '../types';

export const auditLogsApi = {
  getAll: (params?: AuditLogFilters) =>
    client.get<AuditLogsResponse>('/api/audit-logs', { params }).then((r) => r.data),
};
