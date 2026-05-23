import { api as http } from './client';

export interface AuditLogEntry {
  id: string;
  workspaceId: string;
  entityType: string;
  entityId: string;
  fieldKey: string | null;
  oldValue: unknown;
  newValue: unknown;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditListResponse {
  items: AuditLogEntry[];
  nextCursor: string | null;
}

export const auditApi = {
  list: (params?: Record<string, any>) =>
    http.get<AuditListResponse>('/audit', { params }).then((r) => r.data),
  listForRecord: (entityType: string, entityId: string) =>
    http.get<AuditLogEntry[]>(`/audit/${entityType}/${entityId}`).then((r) => r.data),
};
