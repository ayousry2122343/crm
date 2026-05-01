import { api } from './client';

export type CustomFieldType =
  | 'TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'DECIMAL'
  | 'BOOLEAN'
  | 'DATE'
  | 'DATETIME'
  | 'PICKLIST'
  | 'MULTI_PICKLIST'
  | 'LOOKUP'
  | 'URL'
  | 'EMAIL'
  | 'PHONE'
  | 'FILE';

export type CustomFieldDef = {
  id?: string;
  entityType: string;
  key: string;
  label: { ar: string; en: string };
  type: CustomFieldType;
  options?: Record<string, unknown>;
  required?: boolean;
  unique?: boolean;
  indexed?: boolean;
  default?: unknown;
  validation?: Record<string, unknown>;
  helpText?: { ar?: string; en?: string };
};

export const customFieldsApi = {
  list: (entityType: string) =>
    api
      .get<CustomFieldDef[]>('/custom-fields', { params: { entityType } })
      .then((r) => r.data),
  create: (body: CustomFieldDef) =>
    api.post<CustomFieldDef>('/custom-fields', body).then((r) => r.data),
  update: (id: string, body: Partial<CustomFieldDef>) =>
    api.patch<CustomFieldDef>(`/custom-fields/${id}`, body).then((r) => r.data),
  archive: (id: string) =>
    api.delete<{ ok: true }>(`/custom-fields/${id}`).then((r) => r.data),
};
