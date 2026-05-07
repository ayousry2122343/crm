import { describe, it, expect, vi, beforeEach } from 'vitest';
import { nextTick } from 'vue';
import { usePeople } from './usePeople';

const mockList = vi.fn();
const mockArchive = vi.fn();

vi.mock('@/api/people', () => ({
  peopleApi: {
    list: (...args: unknown[]) => mockList(...args),
    archive: (...args: unknown[]) => mockArchive(...args),
  },
}));

const fakePeople = [
  { id: '1', fullName: 'Ahmed', email: 'a@b.com', isCompany: false, lifecycleStage: 'LEAD', createdAt: '2026-01-01' },
  { id: '2', fullName: 'Sara', email: 's@b.com', isCompany: false, lifecycleStage: 'MQL', createdAt: '2026-01-02' },
];

describe('usePeople', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: fakePeople, nextCursor: undefined });
    mockArchive.mockResolvedValue({ id: '1' });
  });

  it('fetches people on initial call', async () => {
    const { items, loading, fetch } = usePeople();
    await fetch();
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ limit: 50, sort: '-createdAt' }));
    expect(items.value).toHaveLength(2);
    expect(loading.value).toBe(false);
  });

  it('passes isCompany filter when set', async () => {
    const { fetch } = usePeople({ isCompany: true });
    await fetch();
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ isCompany: true }));
  });

  it('supports cursor-based load-more', async () => {
    mockList.mockResolvedValueOnce({ items: fakePeople, nextCursor: 'abc' });
    const { items, hasMore, fetch, loadMore } = usePeople();
    await fetch();
    expect(hasMore.value).toBe(true);
    expect(items.value).toHaveLength(2);

    mockList.mockResolvedValueOnce({ items: [{ id: '3', fullName: 'Omar' }], nextCursor: undefined });
    await loadMore();
    expect(items.value).toHaveLength(3);
    expect(hasMore.value).toBe(false);
  });

  it('re-fetches when filters change', async () => {
    const { filters, fetch } = usePeople();
    await fetch();
    mockList.mockClear();

    filters.lifecycleStage = 'SQL';
    await nextTick();
    // watcher triggers async fetch — wait for it
    await new Promise((r) => setTimeout(r, 10));
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ lifecycleStage: 'SQL' }));
  });

  it('archives selected and re-fetches', async () => {
    const { selected, archiveSelected, fetch } = usePeople();
    await fetch();
    selected.value = [fakePeople[0] as any];
    await archiveSelected();
    expect(mockArchive).toHaveBeenCalledWith('1');
    expect(selected.value).toHaveLength(0);
  });

  it('handles search filter', async () => {
    const { fetch, filters } = usePeople();
    filters.search = 'ahmed';
    await fetch();
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ search: 'ahmed' }));
  });
});
