import { api } from './client';

export type LifecycleStage =
  | 'LEAD'
  | 'MQL'
  | 'SQL'
  | 'OPP'
  | 'CUSTOMER'
  | 'EVANGELIST';

export type Person = {
  id: string;
  workspaceId: string;
  isCompany: boolean;
  parentId: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  companyName: string | null;
  email: string | null;
  emailNormalized?: string | null;
  phone: string | null;
  phoneNormalized?: string | null;
  title: string | null;
  industry: string | null;
  website: string | null;
  address?: unknown;
  lifecycleStage: LifecycleStage;
  source: string | null;
  ownerId: string | null;
  customFields: Record<string, unknown>;
  doNotContact: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PersonListResponse = { items: Person[]; nextCursor?: string };

export const peopleApi = {
  list: (params: Record<string, unknown> = {}) =>
    api.get<PersonListResponse>('/people', { params }).then((r) => r.data),
  get: (id: string) => api.get<Person>(`/people/${id}`).then((r) => r.data),
  create: (data: Partial<Person>) =>
    api.post<Person>('/people', data).then((r) => r.data),
  update: (id: string, data: Partial<Person>) =>
    api.patch<Person>(`/people/${id}`, data).then((r) => r.data),
  archive: (id: string) =>
    api.delete<{ id: string }>(`/people/${id}`).then((r) => r.data),
  duplicates: (params: { email?: string; phone?: string }) =>
    api
      .get<{ items: Person[] }>('/people/duplicates', { params })
      .then((r) => r.data),
  merge: (data: { primaryId: string; mergedIds: string[] }) =>
    api.post<Person>('/people/merge', data).then((r) => r.data),
};
