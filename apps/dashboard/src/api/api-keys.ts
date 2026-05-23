import { api as http } from './client';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyResponse extends ApiKey {
  rawKey: string;
}

export const apiKeysApi = {
  list: () =>
    http.get<ApiKey[]>('/api-keys').then((r) => r.data),
  create: (data: { name: string; scopes: string[]; expiresAt?: string }) =>
    http.post<CreateApiKeyResponse>('/api-keys', data).then((r) => r.data),
  update: (id: string, data: { name?: string; scopes?: string[]; expiresAt?: string }) =>
    http.patch<ApiKey>(`/api-keys/${id}`, data).then((r) => r.data),
  revoke: (id: string) =>
    http.delete(`/api-keys/${id}`).then((r) => r.data),
};
