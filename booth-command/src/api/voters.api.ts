import client from './client';
import type { ApiResponse, Voter, VoterFilters } from '../types';

interface VoterListData {
  voters: Voter[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const votersApi = {
  getAll: (params?: VoterFilters) =>
    client.get<ApiResponse<VoterListData>>('/api/voters', {
      params: Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v !== '' && v !== undefined)
      ),
    }).then((r) => r.data),

  getOne: (id: string) =>
    client.get<ApiResponse<Voter>>(`/api/voters/${id}`).then((r) => r.data),

  update: (id: string, data: { mobile?: string; classification?: string; verification?: string; voteStatus?: string }) =>
    client.patch<ApiResponse<Voter>>(`/api/voters/${id}`, data).then((r) => r.data),

  import: (file: File, assemblyId: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('assemblyId', assemblyId);
    return client.post('/api/voters/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
};
