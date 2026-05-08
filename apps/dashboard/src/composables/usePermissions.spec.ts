import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
vi.mock('@/api/client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('starts with null permissions', async () => {
    const { usePermissions } = await import('./usePermissions');
    const { permissions, loading } = usePermissions();
    expect(permissions.value).toBeNull();
    expect(loading.value).toBe(false);
  });

  it('fetchPermissions calls API and populates permissions', async () => {
    mockGet.mockResolvedValue({ data: { permissions: ['person:read', 'deal:write'] } });
    const { usePermissions } = await import('./usePermissions');
    const { fetchPermissions, permissions } = usePermissions();
    await fetchPermissions();
    expect(mockGet).toHaveBeenCalledWith('/auth/me/permissions');
    expect(permissions.value).toEqual(['person:read', 'deal:write']);
  });

  it('fetchPermissions is idempotent when already loaded', async () => {
    mockGet.mockResolvedValue({ data: { permissions: ['person:read'] } });
    const { usePermissions } = await import('./usePermissions');
    const { fetchPermissions } = usePermissions();
    await fetchPermissions();
    await fetchPermissions();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('fetchPermissions falls back to empty array on error', async () => {
    mockGet.mockRejectedValue(new Error('network'));
    const { usePermissions } = await import('./usePermissions');
    const { fetchPermissions, permissions } = usePermissions();
    await fetchPermissions();
    expect(permissions.value).toEqual([]);
  });

  it('has() returns true when permission exists', async () => {
    mockGet.mockResolvedValue({ data: { permissions: ['person:read', 'deal:write'] } });
    const { usePermissions } = await import('./usePermissions');
    const { fetchPermissions, has } = usePermissions();
    await fetchPermissions();
    expect(has('person:read').value).toBe(true);
    expect(has('deal:write').value).toBe(true);
  });

  it('has() returns false when permission missing', async () => {
    mockGet.mockResolvedValue({ data: { permissions: ['person:read'] } });
    const { usePermissions } = await import('./usePermissions');
    const { fetchPermissions, has } = usePermissions();
    await fetchPermissions();
    expect(has('deal:delete').value).toBe(false);
  });

  it('has() returns true optimistically when permissions not yet loaded', async () => {
    const { usePermissions } = await import('./usePermissions');
    const { has } = usePermissions();
    expect(has('anything').value).toBe(true);
  });

  it('resetPermissions clears cached permissions', async () => {
    mockGet.mockResolvedValue({ data: { permissions: ['person:read'] } });
    const { usePermissions } = await import('./usePermissions');
    const { fetchPermissions, resetPermissions, permissions } = usePermissions();
    await fetchPermissions();
    expect(permissions.value).toHaveLength(1);
    resetPermissions();
    expect(permissions.value).toBeNull();
  });
});
