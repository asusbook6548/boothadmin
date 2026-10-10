import client from './client';
import type { ApiResponse, Volunteer } from '../types';

export const volunteersApi = {
  getAll: () =>
    client.get<ApiResponse<Volunteer[]>>('/api/volunteers').then((r) => r.data),

  getOne: (id: string) =>
    client.get<ApiResponse<Volunteer>>(`/api/volunteers/${id}`).then((r) => r.data),

  create: (data: { name: string; mobile: string; password: string }) =>
    client.post<ApiResponse<Volunteer>>('/api/volunteers', data).then((r) => r.data),

  update: (id: string, data: { name?: string; mobile?: string; password?: string; status?: string }) =>
    client.patch<ApiResponse<Volunteer>>(`/api/volunteers/${id}`, data).then((r) => r.data),

  assignBooth: (id: string, boothId: string) =>
    client.patch<ApiResponse<Volunteer>>(`/api/volunteers/${id}/assign-booth`, { boothId }).then((r) => r.data),

  unassignBooth: (id: string) =>
    client.delete<ApiResponse<Volunteer>>(`/api/volunteers/${id}/assign-booth`).then((r) => r.data),
};
