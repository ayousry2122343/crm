import { api as http } from './client';

export type AttachmentEntityType = 'PERSON' | 'COMPANY' | 'DEAL' | 'BLOG' | 'ACTIVITY';

export interface Attachment {
  id: string;
  workspaceId: string;
  entityType: AttachmentEntityType;
  entityId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
  uploadedById: string;
  uploadedBy?: { id: string; fullName: string };
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentListResponse {
  items: Attachment[];
  nextCursor: string | null;
}

export const attachmentsApi = {
  upload: (entityType: AttachmentEntityType, entityId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return http
      .post<Attachment>(`/attachments/${entityType}/${entityId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  list: (entityType: AttachmentEntityType, entityId: string, params?: { cursor?: string; limit?: number }) =>
    http
      .get<AttachmentListResponse>(`/attachments/${entityType}/${entityId}`, { params })
      .then((r) => r.data),

  get: (id: string) =>
    http.get<Attachment>(`/attachments/file/${id}`).then((r) => r.data),

  download: (id: string) =>
    http.get<{ url: string }>(`/attachments/file/${id}/download`).then((r) => r.data.url),

  delete: (id: string) =>
    http.delete(`/attachments/file/${id}`).then((r) => r.data),
};
