import { api as http } from './client';

export interface ReportDef {
  id: string;
  labelAr: string;
  labelEn: string;
  acceptedFilters: { key: string; label: string; type: string }[];
}

export interface ReportResult {
  rows: Record<string, unknown>[];
  summary: Record<string, unknown>;
}

export const reportsApi = {
  list: async (): Promise<ReportDef[]> => {
    const r = await http.get('/reports');
    return r.data;
  },
  run: async (reportId: string, filters?: Record<string, unknown>): Promise<ReportResult> => {
    const r = await http.get(`/reports/${reportId}/run`, { params: { filters: JSON.stringify(filters ?? {}) } });
    return r.data;
  },
};
