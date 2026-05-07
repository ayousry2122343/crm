import { api } from './client';

export type ActivityType = 'CALL' | 'MEETING' | 'EMAIL' | 'TASK' | 'NOTE' | 'SYSTEM' | 'FORM_SUBMISSION';
export type ActivityStatus = 'OPEN' | 'DONE' | 'CANCELED';

export type Activity = {
  id: string;
  workspaceId: string;
  parentEntity: string;
  parentId: string;
  type: ActivityType;
  subject: string;
  body: string | null;
  status: ActivityStatus;
  ownerId: string | null;
  dueAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ActivityListResponse = { items: Activity[]; nextCursor?: string };

export const activitiesApi = {
  list: (params: Record<string, unknown> = {}) =>
    api.get<ActivityListResponse>('/activities', { params }).then((r) => r.data),
  get: (id: string) => api.get<Activity>(`/activities/${id}`).then((r) => r.data),
  create: (data: Partial<Activity>) =>
    api.post<Activity>('/activities', data).then((r) => r.data),
  update: (id: string, data: Partial<Activity>) =>
    api.patch<Activity>(`/activities/${id}`, data).then((r) => r.data),
  complete: (id: string) =>
    api.post<Activity>(`/activities/${id}/complete`).then((r) => r.data),
  archive: (id: string) => api.delete(`/activities/${id}`),
};
