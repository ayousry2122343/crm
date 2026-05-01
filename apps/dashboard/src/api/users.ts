import { api } from './client';
import type { AuthResult } from './auth';

export type UserSummary = {
  id: string;
  email: string;
  fullName: string;
  status: string;
  lastLoginAt?: string | null;
};

export type PendingInvite = {
  id: string;
  email: string;
  fullName: string;
  expiresAt: string;
};

export const usersApi = {
  acceptInvite: (body: { token: string; password: string }) =>
    api.post<AuthResult>('/users/accept-invite', body).then((r) => r.data),
  list: () =>
    api
      .get<{ users: UserSummary[]; pendingInvites: PendingInvite[] }>('/users')
      .then((r) => r.data),
  invite: (body: { email: string; fullName: string }) =>
    api.post('/users/invite', body).then((r) => r.data),
};
