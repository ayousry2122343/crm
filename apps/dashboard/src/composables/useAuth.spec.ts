import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  getAccessToken: vi.fn(() => 'tok'),
}));

vi.mock('@/api/notifications', () => ({
  notificationApi: {
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    unreadCount: vi.fn().mockResolvedValue({ count: 0 }),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}));

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('returns user, workspace, isAuthenticated, and store', async () => {
    const { useAuth } = await import('./useAuth');
    const result = useAuth();
    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('workspace');
    expect(result).toHaveProperty('isAuthenticated');
    expect(result).toHaveProperty('store');
  });

  it('user and workspace are ref-like (have .value)', async () => {
    const { useAuth } = await import('./useAuth');
    const { user, workspace } = useAuth();
    expect(user).toHaveProperty('value');
    expect(workspace).toHaveProperty('value');
  });

  it('isAuthenticated is ref-like', async () => {
    const { useAuth } = await import('./useAuth');
    const { isAuthenticated } = useAuth();
    expect(isAuthenticated).toHaveProperty('value');
    expect(typeof isAuthenticated.value).toBe('boolean');
  });

  it('store has login and logout methods', async () => {
    const { useAuth } = await import('./useAuth');
    const { store } = useAuth();
    expect(typeof store.login).toBe('function');
    expect(typeof store.logout).toBe('function');
  });

  it('store has fetchMe method', async () => {
    const { useAuth } = await import('./useAuth');
    const { store } = useAuth();
    expect(typeof store.fetchMe).toBe('function');
  });

  it('multiple calls return refs backed by same store', async () => {
    const { useAuth } = await import('./useAuth');
    const a = useAuth();
    const b = useAuth();
    expect(a.user.value).toEqual(b.user.value);
    expect(a.workspace.value).toEqual(b.workspace.value);
    expect(a.store).toBe(b.store);
  });
});
