import { api } from './client';

export interface CommentAuthor {
  id: string;
  fullName: string;
  email: string;
}

export interface Comment {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  authorId: string;
  author: CommentAuthor;
  body: string;
  mentions: string[];
  parentId: string | null;
  replies?: Comment[];
  isPinned: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Follower {
  id: string;
  userId: string;
  user: { id: string; fullName: string };
}

export const commentsApi = {
  list(entityType: string, entityId: string, params?: { cursor?: string; limit?: number }) {
    return api.get<{ items: Comment[]; nextCursor: string | null }>(
      `/comments/${entityType}/${entityId}`,
      { params },
    ).then((r) => r.data);
  },
  create(dto: { entityType: string; entityId: string; body: string; parentId?: string }) {
    return api.post<Comment>('/comments', dto).then((r) => r.data);
  },
  update(id: string, dto: { body: string }) {
    return api.put<Comment>(`/comments/${id}`, dto).then((r) => r.data);
  },
  pin(id: string) {
    return api.patch<Comment>(`/comments/${id}/pin`).then((r) => r.data);
  },
  unpin(id: string) {
    return api.patch<Comment>(`/comments/${id}/unpin`).then((r) => r.data);
  },
  archive(id: string) {
    return api.delete(`/comments/${id}`).then((r) => r.data);
  },
  follow(entityType: string, entityId: string) {
    return api.post(`/comments/${entityType}/${entityId}/follow`).then((r) => r.data);
  },
  unfollow(entityType: string, entityId: string) {
    return api.delete(`/comments/${entityType}/${entityId}/follow`).then((r) => r.data);
  },
  listFollowers(entityType: string, entityId: string) {
    return api.get<Follower[]>(`/comments/${entityType}/${entityId}/followers`).then((r) => r.data);
  },
};
