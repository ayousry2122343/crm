import { api } from './client';
import type { Person } from './people';

export type ListFilter = {
  field: string;
  op: string;
  value: unknown;
};

export type CrmList = {
  id: string;
  workspaceId: string;
  entityType: string;
  name: string;
  description: string | null;
  isActive: boolean;
  query: { filters: ListFilter[]; sort?: string };
  memberIds: string[];
  ownerId: string;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ListMembersResponse = { items: Person[]; nextCursor?: string };

export const listsApi = {
  list: (entityType?: string) =>
    api
      .get<{ items: CrmList[] }>('/lists', { params: entityType ? { entityType } : {} })
      .then((r) => r.data),
  get: (id: string) => api.get<CrmList>(`/lists/${id}`).then((r) => r.data),
  create: (data: Partial<CrmList>) =>
    api.post<CrmList>('/lists', data).then((r) => r.data),
  update: (id: string, data: Partial<CrmList>) =>
    api.patch<CrmList>(`/lists/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/lists/${id}`),
  members: (id: string, params?: { cursor?: string; limit?: number }) =>
    api.get<ListMembersResponse>(`/lists/${id}/members`, { params }).then((r) => r.data),
};
