import client from './client';
import type { ApiResponse, Booth } from '../types';

export interface CreateBoothPayload {
  boothNumber: string;
  name: string;
  village?: string;
  assemblyId?: string;
}

export interface UpdateBoothPayload {
  boothNumber?: string;
  name?: string;
  village?: string;
  status?: 'NOT_STARTED' | 'VOTING_STARTED' | 'PROBLEM';
}

export const boothsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    client.get<ApiResponse<{ booths: Booth[]; page: number; limit: number; total: number; totalPages: number }>>('/api/booths', { params }).then((r) => r.data),

  getOne: (id: string) =>
    client.get<ApiResponse<Booth>>(`/api/booths/${id}`).then((r) => r.data),

  create: (data: CreateBoothPayload) =>
    client.post<ApiResponse<{ booth: Booth }>>('/api/booths', data).then((r) => r.data),

  update: (id: string, data: UpdateBoothPayload) =>
    client.patch<ApiResponse<{ booth: Booth }>>(`/api/booths/${id}`, data).then((r) => r.data),
};

