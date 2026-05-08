import { api } from './client';

export type EmailTemplate = {
  id: string;
  workspaceId: string;
  name: string;
  subject: string;
  body: string;
  mergeTagKeys: string[];
  category: string | null;
  createdAt: string;
  updatedAt: string;
};

export const emailTemplatesApi = {
  list: () => api.get<EmailTemplate[]>('/email/templates').then((r) => r.data),
  get: (id: string) => api.get<EmailTemplate>(`/email/templates/${id}`).then((r) => r.data),
  create: (data: { name: string; subject: string; body: string; mergeTagKeys?: string[]; category?: string }) =>
    api.post<EmailTemplate>('/email/templates', data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; subject: string; body: string; mergeTagKeys: string[]; category: string }>) =>
    api.patch<EmailTemplate>(`/email/templates/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/email/templates/${id}`),
};

export const emailApi = {
  send: (data: { to: string; subject: string; body: string; templateId?: string; entityType?: string; entityId?: string }) =>
    api.post('/email/send', data).then((r) => r.data),
};
