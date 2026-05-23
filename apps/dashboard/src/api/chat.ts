import { api as http } from './client';

export interface ChatSession {
  id: string;
  workspaceId: string;
  visitorName: string;
  visitorEmail?: string;
  status: 'WAITING' | 'ACTIVE' | 'ENDED';
  assigneeId?: string;
  assignee?: { id: string; fullName: string };
  queueId?: string;
  queue?: { id: string; name: string };
  ticketId?: string;
  metadata: Record<string, any>;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderType: 'visitor' | 'agent' | 'system';
  senderId?: string;
  content: string;
  createdAt: string;
}

export interface StartSessionInput {
  workspaceId: string;
  visitorName: string;
  visitorEmail?: string;
  queueId?: string;
}

export interface SendMessageInput {
  senderType: 'visitor' | 'agent' | 'system';
  senderId?: string;
  content: string;
  workspaceId?: string;
}

export const chatApi = {
  list: (params?: Record<string, any>) =>
    http.get<ChatSession[]>('/chat/sessions', { params }).then((r) => r.data),
  get: (id: string) =>
    http.get<ChatSession>(`/chat/sessions/${id}`).then((r) => r.data),
  startSession: (data: StartSessionInput) =>
    http.post<ChatSession>('/chat/sessions', data).then((r) => r.data),
  sendMessage: (sessionId: string, data: SendMessageInput) =>
    http.post<ChatMessage>(`/chat/sessions/${sessionId}/messages`, data).then((r) => r.data),
  assign: (sessionId: string, agentId: string) =>
    http.patch<ChatSession>(`/chat/sessions/${sessionId}/assign`, { agentId }).then((r) => r.data),
  end: (sessionId: string) =>
    http.patch<ChatSession>(`/chat/sessions/${sessionId}/end`).then((r) => r.data),
  convertToTicket: (sessionId: string) =>
    http.post(`/chat/sessions/${sessionId}/convert`).then((r) => r.data),
};
