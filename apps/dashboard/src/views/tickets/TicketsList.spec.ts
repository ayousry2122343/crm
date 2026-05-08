import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';
import TicketsList from './TicketsList.vue';

const mockList = vi.fn();
vi.mock('@/api/tickets', () => ({
  ticketsApi: {
    list: (...args: any[]) => mockList(...args),
  },
}));

vi.mock('@/api/queues', () => ({
  queuesApi: {
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: {}, query: {} }),
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, ar } });

function createWrapper() {
  return mount(TicketsList, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="tickets-table"><slot /></div>',
          props: ['value', 'loading'],
        },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: {
          template:
            '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'loading', 'severity', 'size'],
        },
        Select: {
          template: '<select :data-test="$attrs[\'data-test\']"></select>',
          props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'placeholder'],
        },
        InputText: {
          template: '<input :data-test="$attrs[\'data-test\']" />',
          props: ['modelValue', 'placeholder'],
        },
        TicketCreateDialog: { template: '<div></div>', props: ['visible'] },
      },
    },
  });
}

describe('TicketsList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({
      items: [
        {
          id: 't_1',
          ticketNumber: 1,
          subject: 'Cannot login',
          status: 'NEW',
          priority: 'HIGH',
          channel: 'EMAIL',
          assignee: { fullName: 'Agent' },
          contact: { fullName: 'John' },
          createdAt: '2026-01-01',
        },
      ],
      nextCursor: null,
    });
  });

  it('renders page and loads tickets', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="tickets-list-page"]').exists()).toBe(true);
    expect(mockList).toHaveBeenCalled();
  });

  it('shows DataTable with correct columns', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="tickets-table"]').exists()).toBe(true);
  });

  it('has create button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="create-ticket-btn"]').exists()).toBe(true);
  });

  it('shows status filter', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="status-filter"]').exists()).toBe(true);
  });

  it('shows priority filter', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="priority-filter"]').exists()).toBe(true);
  });

  it('shows queue filter', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="queue-filter"]').exists()).toBe(true);
  });

  it('shows search input', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="search-input"]').exists()).toBe(true);
  });
});
