import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import QuotesList from './QuotesList.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/quotes', () => ({
  quotesApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: {}, query: {} }),
}));

const quotes = [
  {
    id: 'q_1',
    number: 'Q-0001',
    total: 5000,
    currency: 'EGP',
    status: 'DRAFT',
    deal: { name: 'Big Deal' },
    contact: { fullName: 'Ahmed' },
    lineItems: [],
    createdAt: '2025-01-01',
  },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(QuotesList, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="quotes-table"><slot /></div>',
          props: ['value', 'loading'],
        },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: {
          template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'loading', 'severity', 'size'],
        },
      },
    },
  });
}

describe('QuotesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: quotes });
  });

  it('loads quotes on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders quotes list page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="quotes-list-page"]').exists()).toBe(true);
  });

  it('has add quote button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-quote-btn"]').exists()).toBe(true);
  });

  it('renders the quotes table', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="quotes-table"]').exists()).toBe(true);
  });
});
