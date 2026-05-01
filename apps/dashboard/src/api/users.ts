import { api } from './client';
import type { AuthResult } from './auth';

export type UserSummary = {
  id: string;
  email: string;
  fullName: string;
  status: string;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  createdAt?: string;
};

export type PendingInvite = {
  id: string;
  email: string;
  fullName: string;
  expiresAt: string;
};

// API returns `{ members, invites }` (see UserService.list).
export type UserListResponse = { members: UserSummary[]; invites: PendingInvite[] };

export const usersApi = {
  acceptInvite: (body: { token: string; password: string }) =>
    api.post<AuthResult>('/users/accept-invite', body).then((r) => r.data),
  list: () => api.get<UserListResponse>('/users').then((r) => r.data),
  invite: (body: { email: string; fullName: string }) =>
    api.post('/users/invite', body).then((r) => r.data),
};
