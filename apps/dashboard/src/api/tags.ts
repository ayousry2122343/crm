import { api } from './client';

export type Tag = {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
};

export type EntityTag = {
  id: string;
  tagId: string;
  entityType: string;
  entityId: string;
};

export const tagsApi = {
  list: () => api.get<{ items: Tag[] }>('/tags').then((r) => r.data),
  create: (data: { name: string; color?: string }) =>
    api.post<Tag>('/tags', data).then((r) => r.data),
  update: (id: string, data: Partial<{ name: string; color: string }>) =>
    api.patch<Tag>(`/tags/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/tags/${id}`),
  assign: (tagId: string, data: { entityType: string; entityIds: string[] }) =>
    api.post(`/tags/${tagId}/assign`, data),
  unassign: (tagId: string, data: { entityType: string; entityIds: string[] }) =>
    api.post(`/tags/${tagId}/unassign`, data),
};
