import { api as http } from './client';

export interface CalendarAccount {
  id: string;
  provider: string;
  emailAddress: string;
  syncEnabled: boolean;
  syncDirection: string;
  lastSyncAt: string | null;
  syncState: string;
  errorMessage: string | null;
  createdAt: string;
}

export const calendarApi = {
  listAccounts: () =>
    http.get<CalendarAccount[]>('/calendar/accounts').then((r) => r.data),
  getAuthUrl: (provider: string, redirectUri: string) =>
    http.get<{ url: string }>('/calendar/auth-url', { params: { provider, redirectUri } }).then((r) => r.data),
  createAccount: (data: { provider: string; code: string; redirectUri: string; calendarId: string; emailAddress: string }) =>
    http.post<CalendarAccount>('/calendar/accounts', data).then((r) => r.data),
};
