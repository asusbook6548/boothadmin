import client from './client';
import type { ApiResponse, Booth } from '../types';

export const boothsApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    client.get<ApiResponse<{ booths: Booth[]; page: number; limit: number; total: number; totalPages: number }>>('/api/booths', { params }).then((r) => r.data),

  getOne: (id: string) =>
    client.get<ApiResponse<Booth>>(`/api/booths/${id}`).then((r) => r.data),
};
