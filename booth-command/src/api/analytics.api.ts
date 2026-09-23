import client from './client';
import type {
  ApiResponse,
  OverviewAnalytics,
  ClassificationAnalytics,
  VerificationAnalytics,
  BoothAnalyticsRow,
  SingleBoothAnalytics,
} from '../types';

interface BoothAnalyticsList {
  booths: BoothAnalyticsRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface BoothAnalysisParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const analyticsApi = {
  getOverview: () =>
    client.get<ApiResponse<OverviewAnalytics>>('/api/analytics/overview').then((r) => r.data),

  getClassification: () =>
    client.get<ApiResponse<ClassificationAnalytics>>('/api/analytics/classification').then((r) => r.data),

  getVerification: () =>
    client.get<ApiResponse<VerificationAnalytics>>('/api/analytics/verification').then((r) => r.data),

  getBooths: (params?: { page?: number; limit?: number; search?: string }) =>
    client.get<ApiResponse<BoothAnalyticsList>>('/api/analytics/booths', { params }).then((r) => r.data),

  getBoothById: (id: string) =>
    client.get<ApiResponse<SingleBoothAnalytics>>(`/api/analytics/booths/${id}`).then((r) => r.data),

  // Booth Analysis endpoints (served via booth-analysis routes, same /api/analytics/booths prefix)
  getStrongBooths: (params?: BoothAnalysisParams) =>
    client.get<ApiResponse<BoothAnalyticsList>>('/api/analytics/booths/strong', { params }).then((r) => r.data),

  getWeakBooths: (params?: BoothAnalysisParams) =>
    client.get<ApiResponse<BoothAnalyticsList>>('/api/analytics/booths/weak', { params }).then((r) => r.data),

  getOpportunityBooths: (params?: BoothAnalysisParams) =>
    client.get<ApiResponse<BoothAnalyticsList>>('/api/analytics/booths/opportunity', { params }).then((r) => r.data),

  getConfidenceBooths: (params?: BoothAnalysisParams) =>
    client.get<ApiResponse<BoothAnalyticsList>>('/api/analytics/booths/confidence', { params }).then((r) => r.data),
};
