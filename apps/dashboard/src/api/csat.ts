import { api as http } from './client';

export interface SatisfactionRating {
  id: string;
  workspaceId: string;
  ticketId: string;
  ticket?: { id: string; subject: string; ticketNumber: number };
  contactId: string | null;
  contact?: { id: string; fullName: string } | null;
  rating: number;
  comment: string | null;
  token: string;
  respondedAt: string | null;
  createdAt: string;
}

export interface CSATStats {
  total: number;
  responded: number;
  averageRating: number;
  distribution: Record<number, number>;
}

export interface CSATListResponse {
  items: SatisfactionRating[];
  nextCursor: string | null;
}

export const csatApi = {
  send: (ticketId: string) =>
    http.post<SatisfactionRating>('/csat/send', { ticketId }).then((r) => r.data),
  respond: (token: string, rating: number, comment?: string) =>
    http.post<SatisfactionRating>('/csat/respond', { token, rating, comment }).then((r) => r.data),
  list: (params?: Record<string, any>) =>
    http.get<CSATListResponse>('/csat', { params }).then((r) => r.data),
  stats: () =>
    http.get<CSATStats>('/csat/stats').then((r) => r.data),
};
