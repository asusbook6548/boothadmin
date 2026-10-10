import client from './client';
import type { ApiResponse, Assembly } from '../types';

export const assembliesApi = {
  getAll: () =>
    client.get<ApiResponse<any>>('/api/assemblies').then((r) => {
      const body = r.data;
      const inner = body?.data;
      let list: Assembly[] = [];
      
      if (Array.isArray(inner)) {
        list = inner;
      } else if (inner?.assembly) {
        list = [inner.assembly];
      } else if (Array.isArray(inner?.assemblies)) {
        list = inner.assemblies;
      } else if (Array.isArray(body)) {
        list = body;
      } else if (inner && typeof inner === 'object' && 'id' in inner) {
        list = [inner as Assembly];
      }

      return {
        ...body,
        data: list,
      } as ApiResponse<Assembly[]>;
    }),

  getOne: (id: string) =>
    client.get<ApiResponse<any>>(`/api/assemblies/${id}`).then((r) => {
      const body = r.data;
      const inner = body?.data;
      const assembly = inner?.assembly ?? inner ?? body;
      return {
        ...body,
        data: assembly,
      } as ApiResponse<Assembly>;
    }),

  create: (data: { number: string; name: string; district: string; electionYear: number }) =>
    client.post<ApiResponse<{ assembly: Assembly }>>('/api/assemblies', data).then((r) => r.data),
};

