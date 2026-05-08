import axios from 'axios';
import type { AxiosError, AxiosRequestConfig } from 'axios';
import { emitApiError } from './errorNotifier';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

const ACCESS_KEY = 'crm_access_token';
const REFRESH_KEY = 'crm_refresh_token';

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

api.interceptors.request.use((config) => {
  const tok = getAccessToken();
  if (tok) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>)['Authorization'] = `Bearer ${tok}`;
  }
  return config;
});

let isRefreshing = false;
let waiters: Array<() => void> = [];

api.interceptors.response.use(
  (r) => r,
  async (err: AxiosError) => {
    const original = err.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (
      !original ||
      err.response?.status !== 401 ||
      original._retry ||
      original.url?.includes('/auth/refresh')
    ) {
      emitApiError(err);
      return Promise.reject(err);
    }
    original._retry = true;
    if (isRefreshing) {
      await new Promise<void>((resolve) => waiters.push(resolve));
      return api(original);
    }
    isRefreshing = true;
    try {
      const refresh = getRefreshToken();
      if (!refresh) throw new Error('no refresh');
      const r = await axios.post('/api/v1/auth/refresh', { refreshToken: refresh });
      setTokens(r.data.accessToken, r.data.refreshToken);
      waiters.forEach((w) => w());
      waiters = [];
      return api(original);
    } catch {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('crm:logout'));
      }
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);
