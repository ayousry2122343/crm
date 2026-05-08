import { api } from './client';

export type ValidationRule = {
  id: string;
  workspaceId: string;
  entityType: string;
  expression: Record<string, unknown>;
  errorMessage: { ar: string; en: string };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export const validationRulesApi = {
  list: (entityType?: string) =>
    api
      .get<ValidationRule[]>('/validation-rules', { params: entityType ? { entityType } : {} })
      .then((r) => r.data),
  create: (data: { entityType: string; expression: Record<string, unknown>; errorMessage: { ar: string; en: string } }) =>
    api.post<ValidationRule>('/validation-rules', data).then((r) => r.data),
  update: (id: string, data: Partial<{ expression: Record<string, unknown>; errorMessage: { ar: string; en: string }; enabled: boolean }>) =>
    api.patch<ValidationRule>(`/validation-rules/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/validation-rules/${id}`),
};
