import { api } from './client';

export type EntityFieldDef = {
  key: string;
  label?: { ar: string; en: string };
  type: string;
  required?: boolean;
  builtIn?: boolean;
  custom?: boolean;
};

export type EntityDef = {
  entityType: string;
  label?: { ar: string; en: string };
  fields: EntityFieldDef[];
};

export const metadataApi = {
  list: () => api.get<{ entityType: string }[]>('/metadata').then((r) => r.data),
  get: (entityType: string) =>
    api.get<EntityDef>(`/metadata/${entityType}`).then((r) => r.data),
};
