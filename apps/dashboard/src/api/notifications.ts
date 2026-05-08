import { api } from './client';

export interface Notification {
  id: string;
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  channel: string;
  type: string;
  enabled: boolean;
}

export const notificationApi = {
  list(params?: { cursor?: string; limit?: number }) {
    return api.get<{ items: Notification[]; nextCursor: string | null }>(
      '/notifications',
      { params },
    ).then((r) => r.data);
  },
  unreadCount() {
    return api.get<{ count: number }>('/notifications/unread-count').then((r) => r.data);
  },
  markRead(id: string) {
    return api.patch<Notification>(`/notifications/${id}/read`).then((r) => r.data);
  },
  markAllRead() {
    return api.patch<{ count: number }>('/notifications/read-all').then((r) => r.data);
  },
  getPreferences() {
    return api.get<NotificationPreference[]>('/notifications/preferences').then((r) => r.data);
  },
  upsertPreference(dto: { channel: string; type: string; enabled: boolean }) {
    return api.put<NotificationPreference>('/notifications/preferences', dto).then((r) => r.data);
  },
};
