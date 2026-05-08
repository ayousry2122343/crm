import { api as http } from './client';

export interface ForecastEntry {
  id: string;
  forecastPeriodId: string;
  userId: string;
  user?: { id: string; fullName: string };
  pipelineId: string;
  pipeline?: { id: string; name: string };
  category: 'PIPELINE' | 'BEST_CASE' | 'COMMIT' | 'CLOSED_WON' | 'OMITTED';
  amount: number;
  adjustedAmount: number | null;
  note: string | null;
}

export interface ForecastPeriod {
  id: string;
  workspaceId: string;
  periodType: 'MONTHLY' | 'QUARTERLY';
  startDate: string;
  endDate: string;
  entries: ForecastEntry[];
  createdAt: string;
}

export interface ForecastSnapshot {
  id: string;
  forecastPeriodId: string;
  snapshotDate: string;
  data: ForecastEntry[];
  createdAt: string;
}

export const forecastsApi = {
  getByPeriod: (periodType: string, date: string, pipelineId?: string) =>
    http.get<ForecastPeriod>(`/forecasts/${periodType}/${date}`, {
      params: pipelineId ? { pipelineId } : undefined,
    }).then((r) => r.data),

  generate: (data: { periodType: string; date: string; pipelineId?: string }) =>
    http.post<ForecastPeriod>('/forecasts/generate', data).then((r) => r.data),

  updateEntry: (id: string, data: { adjustedAmount?: number; note?: string }) =>
    http.put<ForecastEntry>(`/forecasts/entry/${id}`, data).then((r) => r.data),

  takeSnapshot: (periodId: string) =>
    http.post<ForecastSnapshot>(`/forecasts/${periodId}/snapshot`).then((r) => r.data),

  getSnapshots: (periodId: string) =>
    http.get<ForecastSnapshot[]>(`/forecasts/${periodId}/snapshots`).then((r) => r.data),
};
