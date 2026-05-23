import { api as http } from './client';

export interface Conversation {
  id: string;
  workspaceId: string;
  personId?: string;
  person?: { id: string; fullName: string; email?: string; phone?: string };
  channelType: string;
  subject?: string;
  status: string;
  assigneeId?: string;
  queueId?: string;
  priority?: string;
  snoozedUntil?: string;
  lastMessageAt: string;
  unreadCount: number;
  ticketId?: string;
  chatSessionId?: string;
  createdAt: string;
}

export interface ConversationListResponse {
  items: Conversation[];
  nextCursor: string | null;
}

export interface ConversationMessage {
  id: string;
  content: string;
  direction?: string;
  senderType?: string;
  senderId?: string;
  createdAt: string;
}

export const conversationsApi = {
  list: (params?: Record<string, any>) =>
    http.get<ConversationListResponse>('/conversations', { params }).then((r) => r.data),
  get: (id: string) =>
    http.get<Conversation>(`/conversations/${id}`).then((r) => r.data),
  getMessages: (id: string) =>
    http.get<ConversationMessage[]>(`/conversations/${id}/messages`).then((r) => r.data),
  assign: (id: string, assigneeId: string) =>
    http.patch<Conversation>(`/conversations/${id}/assign`, { assigneeId }).then((r) => r.data),
  snooze: (id: string, until: string) =>
    http.patch<Conversation>(`/conversations/${id}/snooze`, { until }).then((r) => r.data),
  close: (id: string) =>
    http.patch<Conversation>(`/conversations/${id}/close`).then((r) => r.data),
  merge: (id: string, sourceIds: string[]) =>
    http.post(`/conversations/${id}/merge`, { sourceIds }).then((r) => r.data),
};
