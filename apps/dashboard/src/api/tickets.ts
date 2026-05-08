import { api as http } from './client';

export interface Ticket {
  id: string;
  workspaceId: string;
  ticketNumber: number;
  subject: string;
  description?: string;
  status: string;
  priority: string;
  channel: string;
  contactId?: string;
  contact?: { id: string; fullName: string };
  companyId?: string;
  company?: { id: string; fullName: string; companyName?: string };
  assigneeId?: string;
  assignee?: { id: string; fullName: string };
  teamId?: string;
  team?: { id: string; name: string };
  queueId?: string;
  queue?: { id: string; name: string; assignmentMode: string };
  tags: any[];
  customFields: Record<string, any>;
  firstResponseAt?: string;
  resolvedAt?: string;
  closedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export interface TicketListResponse {
  items: Ticket[];
  nextCursor: string | null;
}

export interface CreateTicketInput {
  subject: string;
  description?: string;
  priority?: string;
  channel?: string;
  contactId?: string;
  companyId?: string;
  assigneeId?: string;
  teamId?: string;
  queueId?: string;
  tags?: any[];
  customFields?: Record<string, any>;
}

export interface UpdateTicketInput {
  subject?: string;
  description?: string;
  priority?: string;
  channel?: string;
  contactId?: string;
  companyId?: string;
  teamId?: string;
  tags?: any[];
  customFields?: Record<string, any>;
}

export const ticketsApi = {
  list: (params?: Record<string, any>) =>
    http.get<TicketListResponse>('/tickets', { params }).then((r) => r.data),
  get: (id: string) =>
    http.get<Ticket>(`/tickets/${id}`).then((r) => r.data),
  create: (data: CreateTicketInput) =>
    http.post<Ticket>('/tickets', data).then((r) => r.data),
  update: (id: string, data: UpdateTicketInput) =>
    http.patch<Ticket>(`/tickets/${id}`, data).then((r) => r.data),
  changeStatus: (id: string, status: string) =>
    http.patch<Ticket>(`/tickets/${id}/status`, { status }).then((r) => r.data),
  assign: (id: string, assigneeId: string) =>
    http.patch<Ticket>(`/tickets/${id}/assign`, { assigneeId }).then((r) => r.data),
  archive: (id: string) =>
    http.delete(`/tickets/${id}`).then((r) => r.data),
};
