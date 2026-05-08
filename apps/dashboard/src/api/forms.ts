import { api } from './client';

export type FormField = {
  key: string;
  label: { ar: string; en: string };
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'file';
  required?: boolean;
  options?: Array<{ value: string; label: { ar: string; en: string } }>;
  placeholder?: { ar: string; en: string };
};

export type CrmForm = {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  isPublic: boolean;
  redirectUrl: string | null;
  fields: FormField[];
  mappings: Record<string, string>;
  successMessage: { ar: string; en: string } | null;
  useHoneypot: boolean;
  rateLimit: number;
  createdAt: string;
  updatedAt: string;
};

export type FormSubmission = {
  id: string;
  formId: string;
  data: Record<string, unknown>;
  ipAddress: string | null;
  personId: string | null;
  createdAt: string;
};

export const formsApi = {
  list: () => api.get<CrmForm[]>('/forms').then((r) => r.data),
  get: (id: string) => api.get<CrmForm>(`/forms/${id}`).then((r) => r.data),
  create: (data: Partial<CrmForm>) => api.post<CrmForm>('/forms', data).then((r) => r.data),
  update: (id: string, data: Partial<CrmForm>) => api.patch<CrmForm>(`/forms/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/forms/${id}`),
  submissions: (formId: string) =>
    api.get<FormSubmission[]>(`/forms/${formId}/submissions`).then((r) => r.data),
};
