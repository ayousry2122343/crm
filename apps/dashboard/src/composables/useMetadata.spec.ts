import { describe, it, expect, vi, beforeEach } from 'vitest';

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock('@/api/client', () => ({
  api: { get: getMock },
}));

import { useMetadata, invalidateMetadata } from './useMetadata';
import { nextTick } from 'vue';

describe('useMetadata', () => {
  beforeEach(() => {
    getMock.mockReset();
    invalidateMetadata();
  });

  it('fetches entity metadata once and caches it', async () => {
    getMock.mockResolvedValue({
      data: { entityType: 'Person', fields: [{ key: 'name', type: 'TEXT' }] },
    });
    const { data, refetch } = useMetadata('Person');
    expect(getMock).toHaveBeenCalledTimes(1);
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();
    expect(data.value?.entityType).toBe('Person');

    // Second consumer for the same type gets it from cache (no extra request)
    useMetadata('Person');
    expect(getMock).toHaveBeenCalledTimes(1);

    // Refetch still triggers a request
    await refetch();
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it('invalidateMetadata clears cache so the next call refetches', async () => {
    getMock.mockResolvedValue({ data: { entityType: 'Company', fields: [] } });
    useMetadata('Company');
    await new Promise((r) => setTimeout(r, 0));
    expect(getMock).toHaveBeenCalledTimes(1);

    invalidateMetadata('Company');
    useMetadata('Company');
    expect(getMock).toHaveBeenCalledTimes(2);
  });
});
