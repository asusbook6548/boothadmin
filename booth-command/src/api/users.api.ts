import client from './client';
import type { ApiResponse, User } from '../types';

interface UserListData {
  users: User[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role?: 'ADMIN';
  status?: 'ACTIVE' | 'INACTIVE';
}

export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    client.get<ApiResponse<UserListData>>('/api/users', { params }).then((r) => r.data),

  getOne: (id: string) =>
    client.get<ApiResponse<User>>(`/api/users/${id}`).then((r) => r.data),

  create: (data: CreateUserPayload) =>
    client.post<ApiResponse<User>>('/api/users', data).then((r) => r.data),

  update: (id: string, data: { name?: string; email?: string }) =>
    client.patch<ApiResponse<User>>(`/api/users/${id}`, data).then((r) => r.data),

  changeStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    client.patch<ApiResponse<User>>(`/api/users/${id}/status`, { status }).then((r) => r.data),

  changePassword: (id: string, newPassword: string) =>
    client.patch<ApiResponse<{ message: string }>>(`/api/users/${id}/password`, { newPassword }).then((r) => r.data),
};
