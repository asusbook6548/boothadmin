import client from './client';
import type { ApiResponse, Assembly } from '../types';

export const assembliesApi = {
  getAll: () =>
    client.get<ApiResponse<Assembly[]>>('/api/assemblies').then((r) => r.data),

  getOne: (id: string) =>
    client.get<ApiResponse<Assembly>>(`/api/assemblies/${id}`).then((r) => r.data),
};
