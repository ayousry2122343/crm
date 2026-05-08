import { api } from './client';

export interface Portal {
  id: string;
  workspaceId: string;
  domain: string | null;
  theme: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const portalApi = {
  getSettings: () => api.get<Portal | null>('/portal/settings').then((r) => r.data),
  updateSettings: (data: Partial<Portal>) => api.patch<Portal>('/portal/settings', data).then((r) => r.data),
};
