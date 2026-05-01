import { api } from './client';

export type FieldType =
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
  | 'FILE'
  | 'FORMULA'
  | 'ROLLUP';

export type FieldDef = {
  key: string;
  label: { ar: string; en: string };
  type: FieldType;
  required?: boolean;
  unique?: boolean;
  options?: unknown;
  helpText?: { ar?: string; en?: string };
  default?: unknown;
  validation?: unknown;
  builtIn?: boolean;
  custom?: boolean;
};

export type EntityDef = {
  entityType: string;
  labelSingular?: { ar: string; en: string };
  labelPlural?: { ar: string; en: string };
  label?: { ar: string; en: string };
  icon?: string;
  color?: string;
  fields: FieldDef[];
};

export const metadataApi = {
  list: () => api.get<{ entityType: string }[]>('/metadata').then((r) => r.data),
  get: (entityType: string) =>
    api.get<EntityDef>(`/metadata/${entityType}`).then((r) => r.data),
};
