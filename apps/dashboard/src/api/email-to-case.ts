import { api } from './client';

export interface EmailToCaseConfig {
  id: string;
  workspaceId: string;
  supportEmail: string;
  isActive: boolean;
  defaultQueueId: string | null;
  defaultPriority: string;
  autoReply: boolean;
  autoReplyTemplateId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmailToCaseConfigDto {
  supportEmail: string;
  isActive?: boolean;
  defaultQueueId?: string;
  defaultPriority?: string;
  autoReply?: boolean;
  autoReplyTemplateId?: string;
}

export interface UpdateEmailToCaseConfigDto {
  isActive?: boolean;
  defaultQueueId?: string;
  defaultPriority?: string;
  autoReply?: boolean;
  autoReplyTemplateId?: string;
}

export const emailToCaseApi = {
  list: () => api.get<EmailToCaseConfig[]>('/email-to-case/configs').then((r) => r.data),
  get: (id: string) => api.get<EmailToCaseConfig>(`/email-to-case/configs/${id}`).then((r) => r.data),
  create: (dto: CreateEmailToCaseConfigDto) =>
    api.post<EmailToCaseConfig>('/email-to-case/configs', dto).then((r) => r.data),
  update: (id: string, dto: UpdateEmailToCaseConfigDto) =>
    api.patch<EmailToCaseConfig>(`/email-to-case/configs/${id}`, dto).then((r) => r.data),
  delete: (id: string) => api.delete(`/email-to-case/configs/${id}`),
};
