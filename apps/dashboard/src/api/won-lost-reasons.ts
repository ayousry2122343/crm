import { api } from './client';

export type WonLostKind = 'WON' | 'LOST';

export type WonLostReason = {
  id: string;
  workspaceId: string;
  kind: WonLostKind;
  label: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};

export const wonLostReasonsApi = {
  list: (kind?: WonLostKind) =>
    api
      .get<WonLostReason[]>('/won-lost-reasons', { params: kind ? { kind } : {} })
      .then((r) => ({ items: r.data })),
  create: (data: { kind: WonLostKind; label: string; order?: number }) =>
    api.post<WonLostReason>('/won-lost-reasons', data).then((r) => r.data),
  update: (id: string, data: Partial<{ label: string; order: number }>) =>
    api.patch<WonLostReason>(`/won-lost-reasons/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/won-lost-reasons/${id}`),
};
