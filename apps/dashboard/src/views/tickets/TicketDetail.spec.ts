import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';
import TicketDetail from './TicketDetail.vue';

const mockGet = vi.fn();
vi.mock('@/api/tickets', () => ({
  ticketsApi: {
    get: (...args: any[]) => mockGet(...args),
    changeStatus: vi.fn(),
    assign: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: { id: 't_1' } }),
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, ar } });

const sampleTicket = {
  id: 't_1',
  ticketNumber: 7,
  subject: 'Cannot login',
  description: 'User reports login failure',
  status: 'NEW',
  priority: 'HIGH',
  channel: 'EMAIL',
  contact: { id: 'p_1', fullName: 'John Doe' },
  contactId: 'p_1',
  company: { id: 'p_2', fullName: 'Acme', companyName: 'Acme Corp' },
  companyId: 'p_2',
  assignee: { id: 'u_1', fullName: 'Agent Smith' },
  assigneeId: 'u_1',
  team: null,
  teamId: null,
  createdAt: '2026-01-01',
  resolvedAt: null,
  closedAt: null,
};

function createWrapper() {
  return mount(TicketDetail, {
    props: { id: 't_1' },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Tag: { template: '<span :data-test="$attrs[\'data-test\']">{{ value }}</span>', props: ['value', 'severity'] },
        Button: {
          template:
            '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'loading', 'severity', 'size'],
        },
        TabView: { template: '<div data-test="ticket-tabs"><slot /></div>', props: [] },
        TabPanel: { template: '<div><slot /></div>', props: ['header'] },
        CommentSection: { template: '<div data-test="comments-section"></div>', props: ['entityType', 'entityId'] },
        AttachmentList: { template: '<div data-test="attachments-section"></div>', props: ['entityType', 'entityId'] },
        'router-link': { template: '<a><slot /></a>', props: ['to'] },
      },
    },
  });
}

describe('TicketDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(sampleTicket);
  });

  it('renders ticket header with number + subject + status', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="ticket-number"]').text()).toContain('TKT-0007');
    expect(w.find('[data-test="ticket-subject"]').text()).toContain('Cannot login');
    expect(w.find('[data-test="ticket-status"]').text()).toContain('NEW');
  });

  it('shows status change buttons', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="status-actions"]').exists()).toBe(true);
    expect(w.find('[data-test="status-btn-OPEN"]').exists()).toBe(true);
  });

  it('shows assign button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="assign-btn"]').exists()).toBe(true);
  });

  it('shows tabs (overview, comments, files)', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="ticket-tabs"]').exists()).toBe(true);
    expect(w.find('[data-test="comments-section"]').exists()).toBe(true);
    expect(w.find('[data-test="attachments-section"]').exists()).toBe(true);
  });

  it('shows contact and company info', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="ticket-contact"]').text()).toContain('John Doe');
    expect(w.find('[data-test="ticket-company"]').text()).toContain('Acme Corp');
  });

  it('shows priority tag', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="ticket-priority"]').text()).toContain('HIGH');
  });

  it('shows assignee name', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="ticket-assignee"]').text()).toContain('Agent Smith');
  });
});
