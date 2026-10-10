import client from './client';
import type { ApiResponse, SystemSettings } from '../types';

export const settingsApi = {
  get: () =>
    client.get<ApiResponse<SystemSettings>>('/api/settings').then((r) => r.data),

  update: (data: Partial<Omit<SystemSettings, 'id' | 'createdAt' | 'updatedAt'>>) =>
    client.patch<ApiResponse<SystemSettings>>('/api/settings', data).then((r) => r.data),
};
