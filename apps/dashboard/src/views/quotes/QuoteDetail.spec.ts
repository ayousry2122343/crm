import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import QuoteDetail from './QuoteDetail.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockGet = vi.fn();
const mockSend = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/quotes', () => ({
  quotesApi: {
    get: (...args: unknown[]) => mockGet(...args),
    send: (...args: unknown[]) => mockSend(...args),
    accept: vi.fn(),
    reject: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: { id: 'q_1' }, query: {} }),
}));

const quote = {
  id: 'q_1',
  number: 'Q-0001',
  status: 'DRAFT',
  total: 5000,
  subtotal: 5000,
  discountPct: 0,
  discountAmt: 0,
  taxPct: 0,
  taxAmt: 0,
  currency: 'EGP',
  deal: { name: 'Big Deal' },
  contact: { fullName: 'Ahmed' },
  lineItems: [
    { id: 'li_1', description: 'Widget', quantity: 5, unitPrice: 1000, discountPct: 0, total: 5000, sortOrder: 0 },
  ],
  createdAt: '2025-01-01',
};

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(QuoteDetail, {
    props: { id: 'q_1' },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="line-items-detail"><slot /></div>',
          props: ['value'],
        },
        Column: { template: '<div></div>', props: ['field', 'header'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: {
          template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'severity', 'size', 'text', 'rounded'],
        },
      },
    },
  });
}

describe('QuoteDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(quote);
  });

  it('loads quote on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('q_1');
  });

  it('renders quote detail page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="quote-detail-page"]').exists()).toBe(true);
  });

  it('shows quote number', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="quote-number"]').text()).toBe('Q-0001');
  });

  it('shows send button for DRAFT quotes', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="send-quote-btn"]').exists()).toBe(true);
  });

  it('shows total amount', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="quote-total"]').text()).toContain('5,000');
  });
});
