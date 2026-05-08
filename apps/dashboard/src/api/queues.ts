import { api as http } from './client';

export interface Queue {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  assignmentMode: string;
  members: string[];
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export interface QueueListResponse {
  items: Queue[];
  nextCursor: string | null;
}

export interface CreateQueueInput {
  name: string;
  description?: string;
  assignmentMode?: string;
  members?: string[];
}

export interface UpdateQueueInput {
  name?: string;
  description?: string;
  assignmentMode?: string;
  members?: string[];
  isDefault?: boolean;
}

export const queuesApi = {
  list: (params?: Record<string, any>) =>
    http.get<QueueListResponse>('/queues', { params }).then((r) => r.data),
  get: (id: string) =>
    http.get<Queue>(`/queues/${id}`).then((r) => r.data),
  create: (data: CreateQueueInput) =>
    http.post<Queue>('/queues', data).then((r) => r.data),
  update: (id: string, data: UpdateQueueInput) =>
    http.patch<Queue>(`/queues/${id}`, data).then((r) => r.data),
  archive: (id: string) =>
    http.delete(`/queues/${id}`).then((r) => r.data),
  addMember: (id: string, userId: string) =>
    http.post<Queue>(`/queues/${id}/members`, { userId }).then((r) => r.data),
  removeMember: (id: string, userId: string) =>
    http.delete(`/queues/${id}/members/${userId}`).then((r) => r.data),
};
