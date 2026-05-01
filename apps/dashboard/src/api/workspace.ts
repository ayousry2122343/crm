import { api } from './client';

export type Workspace = {
  id: string;
  slug: string;
  name: string;
  primaryLocale: string;
  primaryCurrency: string;
  branding?: Record<string, unknown> | null;
};

export type UpdateWorkspaceBody = {
  name?: string;
  branding?: Record<string, unknown>;
  primaryLocale?: string;
  primaryCurrency?: string;
};

export const workspaceApi = {
  get: () => api.get<Workspace>('/workspace').then((r) => r.data),
  update: (body: UpdateWorkspaceBody) =>
    api.patch<Workspace>('/workspace', body).then((r) => r.data),
};
