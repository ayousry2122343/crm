import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import ChatInbox from './ChatInbox.vue';

vi.mock('@/api/chat', () => ({
  chatApi: {
    list: vi.fn().mockResolvedValue([
      { id: 'cs_1', visitorName: 'Ahmed', status: 'WAITING', createdAt: '2026-05-17T10:00:00Z' },
      { id: 'cs_2', visitorName: 'Sara', status: 'ACTIVE', assignee: { id: 'u1', fullName: 'Agent' }, createdAt: '2026-05-17T09:00:00Z' },
    ]),
    get: vi.fn().mockResolvedValue({
      id: 'cs_1',
      visitorName: 'Ahmed',
      status: 'WAITING',
      messages: [{ id: 'msg_1', senderType: 'visitor', content: 'Hello', createdAt: '2026-05-17T10:00:00Z' }],
    }),
    sendMessage: vi.fn().mockResolvedValue({ id: 'msg_2', senderType: 'agent', content: 'Hi', createdAt: '2026-05-17T10:01:00Z' }),
    assign: vi.fn().mockResolvedValue({ id: 'cs_1', status: 'ACTIVE', assigneeId: 'u1', assignee: { id: 'u1', fullName: 'Agent' } }),
    end: vi.fn().mockResolvedValue({ id: 'cs_1', status: 'ENDED', endedAt: '2026-05-17T10:05:00Z' }),
    convertToTicket: vi.fn().mockResolvedValue({ id: 'tkt_1', ticketNumber: 1 }),
  },
}));

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    user: { value: { id: 'u1', fullName: 'Agent' } },
    workspace: { value: { id: 'ws_1', name: 'Test' } },
    store: { logout: vi.fn() },
  }),
}));

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  }),
}));

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      chat: {
        title: 'Live Chat',
        inbox: 'Chat Inbox',
        startChat: 'Start Chat',
        endChat: 'End Chat',
        assignToMe: 'Assign to Me',
        convertToTicket: 'Convert to Ticket',
        visitorName: 'Your Name',
        visitorEmail: 'Email (optional)',
        typeMessage: 'Type a message...',
        waiting: 'Waiting',
        active: 'Active',
        ended: 'Ended',
        noSessions: 'No chat sessions',
        typing: 'typing...',
        converted: 'Converted to ticket',
      },
    },
  },
});

function factory() {
  return mount(ChatInbox, {
    global: {
      plugins: [i18n],
      stubs: {
        Button: { template: '<button><slot />{{ $attrs.label }}</button>', inheritAttrs: true },
      },
    },
  });
}

describe('ChatInbox.vue', () => {
  it('renders chat title', async () => {
    const wrapper = factory();
    await vi.dynamicImportSettled();
    expect(wrapper.find('[data-test="chat-title"]').text()).toBe('Live Chat');
  });

  it('renders session list after loading', async () => {
    const wrapper = factory();
    await vi.dynamicImportSettled();
    await new Promise((r) => setTimeout(r, 10));
    await wrapper.vm.$nextTick();
    const list = wrapper.find('[data-test="session-list"]');
    expect(list.exists()).toBe(true);
  });

  it('renders empty state when no sessions', async () => {
    const { chatApi } = await import('@/api/chat');
    (chatApi.list as any).mockResolvedValueOnce([]);
    const wrapper = factory();
    await vi.dynamicImportSettled();
    await new Promise((r) => setTimeout(r, 10));
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="empty-state"]').exists()).toBe(true);
  });
});
