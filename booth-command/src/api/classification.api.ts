import client from './client';
import type {
  ApiResponse,
  ClassificationSummary,
  Voter,
  Classification,
} from '../types';

interface ClassificationVoterListData {
  voters: Voter[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ClassificationFilters {
  page?: number;
  limit?: number;
  search?: string;
  classification?: Classification | '';
  verification?: string;
  voteStatus?: string;
  boothId?: string;
}

export const classificationApi = {
  getSummary: () =>
    client.get<ApiResponse<ClassificationSummary>>('/api/classification/summary').then((r) => r.data),

  getVoters: (params?: ClassificationFilters) =>
    client.get<ApiResponse<ClassificationVoterListData>>('/api/classification/voters', {
      params: Object.fromEntries(
        Object.entries(params ?? {}).filter(([, v]) => v !== '' && v !== undefined)
      ),
    }).then((r) => r.data),

  updateVoter: (id: string, data: { classification?: Classification; verification?: string; voteStatus?: string }) =>
    client.patch<ApiResponse<Voter>>(`/api/classification/voters/${id}`, data).then((r) => r.data),

  bulk: (voterIds: string[], classification: Classification) =>
    client.post<ApiResponse<{ count: number }>>('/api/classification/bulk', { voterIds, classification }).then((r) => r.data),
};
