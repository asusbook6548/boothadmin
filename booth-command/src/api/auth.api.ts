import client from './client';
import type { LoginRequest, LoginResponse } from '../types';

export const authApi = {
  login: (data: LoginRequest) =>
    client.post<LoginResponse>('/api/auth/login', data).then((r) => r.data),
};
