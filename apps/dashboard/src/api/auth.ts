import { api } from './client';

export type AuthUser = { id: string; email: string; fullName: string; workspaceId: string };
export type AuthWorkspace = { id: string; slug: string; name: string };
export type AuthResult = {
  user: AuthUser;
  workspace: AuthWorkspace;
  accessToken: string;
  refreshToken: string;
};

export type TwoFactorChallenge = {
  requiresTwoFactor: true;
  tempToken: string;
};

export type LoginResult = AuthResult | TwoFactorChallenge;

export const authApi = {
  signUp: (body: {
    email: string;
    password: string;
    fullName: string;
    workspaceName: string;
  }) => api.post<AuthResult>('/auth/sign-up', body).then((r) => r.data),
  login: (body: { email: string; password: string; workspaceSlug: string }) =>
    api.post<LoginResult>('/auth/login', body).then((r) => r.data),
  logout: (refreshToken: string) =>
    api.post<{ ok: true }>('/auth/logout', { refreshToken }).then((r) => r.data),
  me: () =>
    api
      .get<{ userId: string; workspaceId: string; email: string; fullName: string }>('/auth/me')
      .then((r) => r.data),
  requestPasswordReset: (body: { workspaceSlug: string; email: string }) =>
    api.post<{ ok: true }>('/auth/request-password-reset', body).then((r) => r.data),
  confirmPasswordReset: (body: { token: string; newPassword: string }) =>
    api.post<{ ok: true }>('/auth/confirm-password-reset', body).then((r) => r.data),
  confirmEmail: (body: { token: string }) =>
    api.post<{ ok: true }>('/auth/confirm-email', body).then((r) => r.data),
};
