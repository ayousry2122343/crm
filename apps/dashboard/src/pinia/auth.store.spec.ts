import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from './auth.store';

vi.mock('../api/client', () => ({
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getAccessToken: vi.fn(() => null),
  getRefreshToken: vi.fn(() => 'RT-stored'),
  api: { post: vi.fn(), get: vi.fn() },
}));

vi.mock('../api/auth', () => ({
  authApi: {
    signUp: vi.fn(async () => ({
      user: { id: 'u1', email: 'a@b.com', fullName: 'A', workspaceId: 'ws1' },
      workspace: { id: 'ws1', slug: 'acme', name: 'Acme' },
      accessToken: 'AT',
      refreshToken: 'RT',
    })),
    login: vi.fn(async () => ({
      user: { id: 'u1', email: 'a@b.com', fullName: 'A', workspaceId: 'ws1' },
      workspace: { id: 'ws1', slug: 'acme', name: 'Acme' },
      accessToken: 'AT',
      refreshToken: 'RT',
    })),
    logout: vi.fn(async () => ({ ok: true as const })),
    me: vi.fn(async () => ({
      userId: 'u1',
      workspaceId: 'ws1',
      email: 'a@b.com',
      fullName: 'A',
    })),
    requestPasswordReset: vi.fn(async () => ({ ok: true as const })),
    confirmPasswordReset: vi.fn(async () => ({ ok: true as const })),
    confirmEmail: vi.fn(async () => ({ ok: true as const })),
  },
}));

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it('initial state: not authenticated', () => {
    const s = useAuthStore();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(s.workspace).toBeNull();
  });

  it('signUp populates user/workspace and sets isAuthenticated', async () => {
    const s = useAuthStore();
    await s.signUp({
      email: 'a@b.com',
      password: 'hunter2!',
      fullName: 'A',
      workspaceName: 'Acme',
    });
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.email).toBe('a@b.com');
    expect(s.workspace?.slug).toBe('acme');
  });

  it('login populates state', async () => {
    const s = useAuthStore();
    await s.login({ email: 'a@b.com', password: 'hunter2!', workspaceSlug: 'acme' });
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.fullName).toBe('A');
  });

  it('logout clears state', async () => {
    const s = useAuthStore();
    await s.signUp({
      email: 'a@b.com',
      password: 'hunter2!',
      fullName: 'A',
      workspaceName: 'Acme',
    });
    await s.logout();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(s.workspace).toBeNull();
  });

  it('fetchMe restores user identity (workspaceId only — workspace stays null until reloaded by app)', async () => {
    const s = useAuthStore();
    await s.fetchMe();
    expect(s.user?.id).toBe('u1');
    expect(s.user?.workspaceId).toBe('ws1');
    expect(s.isAuthenticated).toBe(true);
  });

  it('setAuthFromTokens hydrates state directly (used by accept-invite)', () => {
    const s = useAuthStore();
    s.setAuthFromTokens({
      user: { id: 'u9', email: 'x@y.com', fullName: 'X', workspaceId: 'ws9' },
      workspace: { id: 'ws9', slug: 'ws9', name: 'WS9' },
      accessToken: 'AT',
      refreshToken: 'RT',
    });
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.email).toBe('x@y.com');
  });
});
