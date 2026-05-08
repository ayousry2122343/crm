import { api } from './client';

export type Webhook = {
  id: string;
  workspaceId: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WebhookDelivery = {
  id: string;
  webhookId: string;
  eventName: string;
  payload: unknown;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  statusCode: number | null;
  attemptCount: number;
  deliveredAt: string | null;
  createdAt: string;
};

export const webhooksApi = {
  list: () => api.get<Webhook[]>('/webhooks').then((r) => r.data),
  get: (id: string) => api.get<Webhook>(`/webhooks/${id}`).then((r) => r.data),
  create: (data: { url: string; events: string[]; secret?: string }) =>
    api.post<Webhook>('/webhooks', data).then((r) => r.data),
  update: (id: string, data: Partial<{ url: string; events: string[]; enabled: boolean }>) =>
    api.patch<Webhook>(`/webhooks/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/webhooks/${id}`),
  deliveries: (webhookId: string) =>
    api.get<WebhookDelivery[]>(`/webhooks/${webhookId}/deliveries`).then((r) => r.data),
};
