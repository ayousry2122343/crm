import { api } from './client';

export type DealStatus = 'OPEN' | 'WON' | 'LOST';

export type Deal = {
  id: string;
  workspaceId: string;
  name: string;
  pipelineId: string;
  stageId: string;
  amount: number;
  currency: string;
  expectedCloseDate: string | null;
  probability: number | null;
  ownerId: string | null;
  primaryContactId: string | null;
  primaryCompanyId: string | null;
  source: string | null;
  status: DealStatus;
  wonAt: string | null;
  lostAt: string | null;
  wonReason: string | null;
  lostReason: string | null;
  lastActivityAt: string | null;
  isRotting: boolean;
  customFields: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  pipeline?: { name: string };
  stage?: { name: string; color: string };
};

export type DealListResponse = { items: Deal[]; nextCursor?: string };

export const dealsApi = {
  list: (params: Record<string, unknown> = {}) =>
    api.get<DealListResponse>('/deals', { params }).then((r) => r.data),
  get: (id: string) => api.get<Deal>(`/deals/${id}`).then((r) => r.data),
  create: (data: Partial<Deal>) =>
    api.post<Deal>('/deals', data).then((r) => r.data),
  update: (id: string, data: Partial<Deal>) =>
    api.patch<Deal>(`/deals/${id}`, data).then((r) => r.data),
  moveStage: (id: string, data: { stageId: string; wonReason?: string; lostReason?: string }) =>
    api.post<Deal>(`/deals/${id}/move`, data).then((r) => r.data),
  archive: (id: string) => api.delete(`/deals/${id}`),
};
