import { api } from './client';

export type EmailProvider = 'GMAIL' | 'OUTLOOK';
export type EmailSyncState = 'IDLE' | 'SYNCING' | 'ERROR';
export type EmailDirection = 'IN' | 'OUT';

export interface EmailAccount {
  id: string;
  workspaceId: string;
  userId: string;
  provider: EmailProvider;
  emailAddress: string;
  syncState: EmailSyncState;
  lastSyncAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  externalId: string;
  fromAddress: string;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  direction: EmailDirection;
  receivedAt: string;
}

export interface EmailThread {
  id: string;
  accountId: string;
  externalId: string;
  subject: string;
  lastMessageAt: string;
  personId: string | null;
  person?: { id: string; fullName: string; email: string | null } | null;
  messages: EmailMessage[];
}

export const emailSyncApi = {
  listAccounts: () =>
    api.get<EmailAccount[]>('/email-sync/accounts').then((r) => r.data),
  getAccount: (id: string) =>
    api.get<EmailAccount>(`/email-sync/accounts/${id}`).then((r) => r.data),
  connectAccount: (data: { provider: EmailProvider; emailAddress: string; accessToken: string; refreshToken?: string }) =>
    api.post<EmailAccount>('/email-sync/accounts', data).then((r) => r.data),
  disconnectAccount: (id: string) =>
    api.delete(`/email-sync/accounts/${id}`),
  listThreads: (params?: { personId?: string; cursor?: string; limit?: number }) =>
    api.get<{ data: EmailThread[]; hasMore: boolean; nextCursor: string | null }>('/email-sync/threads', { params }).then((r) => r.data),
  getThread: (id: string) =>
    api.get<EmailThread>(`/email-sync/threads/${id}`).then((r) => r.data),
  threadsForPerson: (personId: string) =>
    api.get<EmailThread[]>(`/email-sync/person/${personId}/threads`).then((r) => r.data),
};
