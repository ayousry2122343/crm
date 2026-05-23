import { api as http } from './client';

export interface TwoFactorSetupResponse {
  secret: string;
  qrCodeUri: string;
}

export interface TwoFactorConfirmResponse {
  backupCodes: string[];
}

export const twoFactorApi = {
  setup: () =>
    http.post<TwoFactorSetupResponse>('/auth/2fa/setup').then((r) => r.data),
  confirm: (code: string) =>
    http.post<TwoFactorConfirmResponse>('/auth/2fa/confirm', { code }).then((r) => r.data),
  disable: (code: string) =>
    http.delete('/auth/2fa', { data: { code } }).then((r) => r.data),
  status: () =>
    http.get<boolean>('/auth/2fa/status').then((r) => r.data),
  verify: (tempToken: string, code: string) =>
    http.post('/auth/verify-2fa', { tempToken, code }).then((r) => r.data),
};
