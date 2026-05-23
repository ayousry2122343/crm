import { api as http } from './client';

export interface SavedReport {
  id: string;
  name: string;
  description?: string;
  entityType: string;
  reportType: 'TABULAR' | 'GROUPED' | 'SUMMARY';
  columns: Array<{ fieldKey: string; label?: string }>;
  filters: Record<string, { operator: string; value: any }>;
  groupBy: string[];
  aggregations: Array<{ fieldKey: string; function: string; label: string }>;
  sortBy: Array<{ fieldKey: string; direction: 'ASC' | 'DESC' }>;
  chartType?: 'BAR' | 'LINE' | 'PIE' | 'DOUGHNUT';
  chartConfig?: Record<string, any>;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportResult {
  rows: any[];
  total: number;
}

export interface CreateReportDto {
  name: string;
  description?: string;
  entityType: string;
  reportType: string;
  columns: Array<{ fieldKey: string; label?: string }>;
  filters?: Record<string, { operator: string; value: any }>;
  groupBy?: string[];
  aggregations?: Array<{ fieldKey: string; function: string; label: string }>;
  sortBy?: Array<{ fieldKey: string; direction: 'ASC' | 'DESC' }>;
  chartType?: string;
  isShared?: boolean;
}

export const savedReportsApi = {
  list: () =>
    http.get<SavedReport[]>('/reports/saved').then((r) => r.data),
  get: (id: string) =>
    http.get<SavedReport>(`/reports/saved/${id}`).then((r) => r.data),
  create: (dto: CreateReportDto) =>
    http.post<SavedReport>('/reports/saved', dto).then((r) => r.data),
  update: (id: string, dto: Partial<CreateReportDto>) =>
    http.patch<SavedReport>(`/reports/saved/${id}`, dto).then((r) => r.data),
  delete: (id: string) =>
    http.delete(`/reports/saved/${id}`).then((r) => r.data),
  run: (id: string, limit = 100, offset = 0) =>
    http.post<ReportResult>(`/reports/saved/${id}/run?limit=${limit}&offset=${offset}`).then((r) => r.data),
  export: (id: string, format: 'csv' | 'xlsx' = 'csv') =>
    http.post(`/reports/saved/${id}/export?format=${format}`, null, { responseType: 'blob' }).then((r) => r.data),
};
