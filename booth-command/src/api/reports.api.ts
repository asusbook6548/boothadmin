import client from './client';
import type { ApiResponse, ReportSummary, Voter, Booth, Volunteer } from '../types';

interface ReportVoterListData {
  voters: Voter[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ReportVoterFilters {
  page?: number;
  limit?: number;
  search?: string;
  boothId?: string;
  classification?: string;
  verification?: string;
  voteStatus?: string;
  gender?: string;
  ageFrom?: number | '';
  ageTo?: number | '';
}

type ExportFormat = 'xlsx' | 'csv';

const download = (url: string, params: Record<string, string | number | boolean | undefined>, filename: string) => {
  const queryString = new URLSearchParams(
    Object.fromEntries(
      Object.entries(params).filter(([, v]) => v !== '' && v !== undefined)
    ) as Record<string, string>
  ).toString();

  const token = localStorage.getItem('bc_access_token');
  return fetch(`http://localhost:5000${url}${queryString ? '?' + queryString : ''}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(async (res) => {
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  });
};

export const reportsApi = {
  getSummary: () =>
    client.get<ApiResponse<ReportSummary>>('/api/reports/summary').then((r) => r.data),

  getVoters: (params?: ReportVoterFilters) =>
    client.get<ApiResponse<ReportVoterListData>>('/api/reports/voters', {
      params: Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v !== '' && v !== undefined)
      ),
    }).then((r) => r.data),

  getBooths: () =>
    client.get<ApiResponse<Booth[]>>('/api/reports/booths').then((r) => r.data),

  getVolunteers: () =>
    client.get<ApiResponse<Volunteer[]>>('/api/reports/volunteers').then((r) => r.data),

  getClassification: () =>
    client.get<ApiResponse<unknown>>('/api/reports/classification').then((r) => r.data),

  exportVoters: (filters: ReportVoterFilters & { format?: ExportFormat }) =>
    download('/api/reports/export/voters', filters as Record<string, string | number | boolean | undefined>, `voters.${filters.format ?? 'xlsx'}`),

  exportBooths: (format: ExportFormat = 'xlsx') =>
    download('/api/reports/export/booths', { format }, `booths.${format}`),

  exportVolunteers: (format: ExportFormat = 'xlsx') =>
    download('/api/reports/export/volunteers', { format }, `volunteers.${format}`),

  exportClassification: (format: ExportFormat = 'xlsx') =>
    download('/api/reports/export/classification', { format }, `classification.${format}`),
};
