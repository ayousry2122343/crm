import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import NotificationBell from './NotificationBell.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

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

vi.mock('@/composables/useSocket', () => ({
  useSocket: () => ({ connected: { value: false }, connect: vi.fn(), disconnect: vi.fn() }),
}));

function makeWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, ar } });
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(NotificationBell, {
    global: {
      plugins: [i18n, PrimeVue, pinia],
      stubs: {
        OverlayPanel: {
          template: '<div data-test="notification-panel"><slot /></div>',
          methods: { toggle: vi.fn(), hide: vi.fn() },
        },
        Badge: {
          template: '<span data-test="notification-badge">{{ value }}</span>',
          props: ['value', 'severity'],
        },
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue({ items: [], nextCursor: null });
  mockUnreadCount.mockResolvedValue({ count: 0 });
  mockMarkAllRead.mockResolvedValue({ count: 0 });
});

describe('NotificationBell', () => {
  it('renders bell button', async () => {
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="notification-bell-btn"]').exists()).toBe(true);
  });

  it('shows badge when unread count > 0', async () => {
    mockUnreadCount.mockResolvedValue({ count: 3 });
    const wrapper = makeWrapper();
    await flushPromises();
    const badge = wrapper.find('[data-test="notification-badge"]');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toBe('3');
  });

  it('hides badge when unread count is 0', async () => {
    mockUnreadCount.mockResolvedValue({ count: 0 });
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="notification-badge"]').exists()).toBe(false);
  });

  it('shows empty state when no notifications', async () => {
    mockList.mockResolvedValue({ items: [], nextCursor: null });
    mockUnreadCount.mockResolvedValue({ count: 0 });
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="no-notifications"]').exists()).toBe(true);
  });

  it('renders notification items', async () => {
    mockList.mockResolvedValue({
      items: [
        { id: 'n_1', type: 'ASSIGNMENT', title: 'Assigned', body: 'Deal X', isRead: false, createdAt: new Date().toISOString() },
        { id: 'n_2', type: 'SYSTEM', title: 'Update', isRead: true, createdAt: new Date().toISOString() },
      ],
      nextCursor: null,
    });
    mockUnreadCount.mockResolvedValue({ count: 1 });
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="notification-list"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="notification-item-n_1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="notification-item-n_2"]').exists()).toBe(true);
  });

  it('shows unread dot for unread notifications', async () => {
    mockList.mockResolvedValue({
      items: [
        { id: 'n_1', type: 'SYSTEM', title: 'New', isRead: false, createdAt: new Date().toISOString() },
      ],
      nextCursor: null,
    });
    mockUnreadCount.mockResolvedValue({ count: 1 });
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="unread-dot"]').exists()).toBe(true);
  });

  it('shows mark all read button when there are unread notifications', async () => {
    mockList.mockResolvedValue({
      items: [
        { id: 'n_1', type: 'SYSTEM', title: 'Test', isRead: false, createdAt: new Date().toISOString() },
      ],
      nextCursor: null,
    });
    mockUnreadCount.mockResolvedValue({ count: 1 });
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="mark-all-read"]').exists()).toBe(true);
  });
});
