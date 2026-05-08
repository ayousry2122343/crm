import { api as http } from './client';

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'PAUSED' | 'ARCHIVED';
export type RecipientStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'UNSUBSCRIBED';

export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: CampaignStatus;
  listId: string | null;
  templateId: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  totalRecipients: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  personId: string;
  email: string;
  status: RecipientStatus;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  person?: { fullName: string };
}

export interface CampaignListResponse {
  items: Campaign[];
  nextCursor?: string;
  hasMore: boolean;
}

export interface RecipientListResponse {
  items: CampaignRecipient[];
  nextCursor?: string;
  hasMore: boolean;
}

export const campaignsApi = {
  list: (params?: Record<string, unknown>) =>
    http.get<CampaignListResponse>('/campaigns', { params }).then((r) => r.data),
  get: (id: string) => http.get<Campaign>(`/campaigns/${id}`).then((r) => r.data),
  create: (data: Partial<Campaign>) =>
    http.post<Campaign>('/campaigns', data).then((r) => r.data),
  update: (id: string, data: Partial<Campaign>) =>
    http.patch<Campaign>(`/campaigns/${id}`, data).then((r) => r.data),
  schedule: (id: string, scheduledAt: string) =>
    http.post<Campaign>(`/campaigns/${id}/schedule`, { scheduledAt }).then((r) => r.data),
  send: (id: string) =>
    http.post<Campaign>(`/campaigns/${id}/send`).then((r) => r.data),
  pause: (id: string) =>
    http.post<Campaign>(`/campaigns/${id}/pause`).then((r) => r.data),
  archive: (id: string) =>
    http.delete<Campaign>(`/campaigns/${id}`).then((r) => r.data),
  recipients: (id: string, params?: Record<string, unknown>) =>
    http.get<RecipientListResponse>(`/campaigns/${id}/recipients`, { params }).then((r) => r.data),
};
