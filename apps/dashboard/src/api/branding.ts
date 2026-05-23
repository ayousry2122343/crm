import { api as http } from './client';

export interface WorkspaceBranding {
  logo?: string;
  favicon?: string;
  primaryColor: string;
  secondaryColor: string;
  companyName?: string;
}

export const brandingApi = {
  get: () =>
    http.get<WorkspaceBranding>('/branding').then((r) => r.data),
  update: (data: Partial<WorkspaceBranding>) =>
    http.put<WorkspaceBranding>('/branding', data).then((r) => r.data),
};
