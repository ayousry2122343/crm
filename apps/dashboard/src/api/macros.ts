import { api as http } from './client';

export interface Macro {
  id: string;
  workspaceId: string;
  name: string;
  content: string;
  category: string | null;
  shortcut: string | null;
  visibility: 'PERSONAL' | 'TEAM' | 'GLOBAL';
  createdById: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMacroInput {
  name: string;
  content: string;
  category?: string;
  shortcut?: string;
  visibility?: 'PERSONAL' | 'TEAM' | 'GLOBAL';
}

export interface UpdateMacroInput {
  name?: string;
  content?: string;
  category?: string;
  shortcut?: string;
  visibility?: 'PERSONAL' | 'TEAM' | 'GLOBAL';
}

export const macrosApi = {
  list: (params?: Record<string, any>) =>
    http.get<Macro[]>('/macros', { params }).then((r) => r.data),
  get: (id: string) =>
    http.get<Macro>(`/macros/${id}`).then((r) => r.data),
  create: (data: CreateMacroInput) =>
    http.post<Macro>('/macros', data).then((r) => r.data),
  update: (id: string, data: UpdateMacroInput) =>
    http.patch<Macro>(`/macros/${id}`, data).then((r) => r.data),
  archive: (id: string) =>
    http.delete(`/macros/${id}`).then((r) => r.data),
};
