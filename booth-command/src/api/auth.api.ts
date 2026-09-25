import client from './client';
import type { ApiResponse, AuthUser, LoginRequest, LoginResponse } from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<LoginResponse>('/api/auth/login', data).then((r) => r.data),

  getMe: () =>
    client.get<ApiResponse<{ user: AuthUser }>>('/api/auth/me').then((r) => r.data),
};

