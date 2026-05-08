import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useNotificationStore } from './notification.store';

const mockList = vi.fn();
const mockUnreadCount = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkAllRead = vi.fn();

vi.mock('@/api/notifications', () => ({
  notificationApi: {
    list: (...args: unknown[]) => mockList(...args),
    unreadCount: (...args: unknown[]) => mockUnreadCount(...args),
    markRead: (...args: unknown[]) => mockMarkRead(...args),
    markAllRead: (...args: unknown[]) => mockMarkAllRead(...args),
  },
}));

describe('useNotificationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    mockList.mockResolvedValue({ items: [{ id: 'n1', message: 'test', isRead: false }], nextCursor: null });
    mockUnreadCount.mockResolvedValue({ count: 3 });
    mockMarkRead.mockResolvedValue({});
    mockMarkAllRead.mockResolvedValue({});
  });

  it('starts with empty items and zero unread count', () => {
    const store = useNotificationStore();
    expect(store.items).toEqual([]);
    expect(store.unreadCount).toBe(0);
  });

  it('fetchList populates items on reset', async () => {
    const store = useNotificationStore();
    await store.fetchList(true);
    expect(mockList).toHaveBeenCalled();
    expect(store.items.length).toBe(1);
    expect(store.items[0].id).toBe('n1');
  });

  it('fetchList appends items when not resetting', async () => {
    const store = useNotificationStore();
    await store.fetchList(true);
    mockList.mockResolvedValue({ items: [{ id: 'n2', message: 'test2', isRead: false }], nextCursor: null });
    await store.fetchList(false);
    expect(store.items.length).toBe(2);
  });

  it('fetchUnreadCount updates count', async () => {
    const store = useNotificationStore();
    await store.fetchUnreadCount();
    expect(mockUnreadCount).toHaveBeenCalled();
    expect(store.unreadCount).toBe(3);
  });

  it('markRead updates item and decrements count', async () => {
    const store = useNotificationStore();
    await store.fetchList(true);
    store.unreadCount = 1;
    await store.markRead('n1');
    expect(mockMarkRead).toHaveBeenCalledWith('n1');
    expect(store.items[0].isRead).toBe(true);
    expect(store.unreadCount).toBe(0);
  });

  it('markAllRead updates all items and resets count', async () => {
    const store = useNotificationStore();
    await store.fetchList(true);
    store.unreadCount = 5;
    await store.markAllRead();
    expect(mockMarkAllRead).toHaveBeenCalled();
    expect(store.items.every((n) => n.isRead)).toBe(true);
    expect(store.unreadCount).toBe(0);
  });

  it('addFromSocket prepends notification and increments count', () => {
    const store = useNotificationStore();
    store.addFromSocket({ id: 'n3', message: 'new', isRead: false } as any);
    expect(store.items.length).toBe(1);
    expect(store.items[0].id).toBe('n3');
    expect(store.unreadCount).toBe(1);
  });

  it('addFromSocket does not increment count for already-read notification', () => {
    const store = useNotificationStore();
    store.addFromSocket({ id: 'n4', message: 'read one', isRead: true } as any);
    expect(store.items.length).toBe(1);
    expect(store.unreadCount).toBe(0);
  });

  it('loading toggles during fetchList', async () => {
    const store = useNotificationStore();
    expect(store.loading).toBe(false);
    const promise = store.fetchList(true);
    expect(store.loading).toBe(true);
    await promise;
    expect(store.loading).toBe(false);
  });

  it('loading resets even when fetchList throws', async () => {
    const store = useNotificationStore();
    mockList.mockRejectedValueOnce(new Error('network'));
    await store.fetchList(true).catch(() => {});
    expect(store.loading).toBe(false);
  });

  it('markRead is idempotent for already-read items', async () => {
    const store = useNotificationStore();
    await store.fetchList(true);
    store.items[0].isRead = true;
    store.unreadCount = 5;
    await store.markRead('n1');
    expect(store.unreadCount).toBe(5);
  });

  it('fetchList passes cursor for pagination', async () => {
    mockList.mockResolvedValueOnce({ items: [{ id: 'n1' }], nextCursor: 'cur_abc' });
    const store = useNotificationStore();
    await store.fetchList(true);
    expect(store.nextCursor).toBe('cur_abc');
    mockList.mockResolvedValueOnce({ items: [{ id: 'n2' }], nextCursor: null });
    await store.fetchList(false);
    expect(mockList).toHaveBeenLastCalledWith({ cursor: 'cur_abc', limit: 20 });
  });
});
