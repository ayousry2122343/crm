import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import QuoteBuilder from './QuoteBuilder.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockCreate = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/quotes', () => ({
  quotesApi: { create: (...args: unknown[]) => mockCreate(...args) },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  useRoute: () => ({ query: { dealId: 'deal1' } }),
}));

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(QuoteBuilder, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: { template: '<div><slot /></div>', props: ['value'], inheritAttrs: true },
        Column: { template: '<div />' },
        Calendar: { template: '<input />' },
        InputNumber: { template: '<input />', props: ['modelValue'] },
      },
    },
  });
}

describe('QuoteBuilder.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({ id: 'q1' });
  });

  it('renders the page', () => {
    const w = createWrapper();
    expect(w.find('[data-test="quote-builder-page"]').exists()).toBe(true);
  });

  it('shows line items table', () => {
    const w = createWrapper();
    expect(w.find('[data-test="line-items-table"]').exists()).toBe(true);
  });

  it('has add line button', () => {
    const w = createWrapper();
    expect(w.find('[data-test="add-line-btn"]').exists()).toBe(true);
  });

  it('has save quote button', () => {
    const w = createWrapper();
    expect(w.find('[data-test="save-quote-btn"]').exists()).toBe(true);
  });

  it('shows total display', () => {
    const w = createWrapper();
    expect(w.find('[data-test="quote-total"]').exists()).toBe(true);
  });

  it('has cancel button alongside save', () => {
    const w = createWrapper();
    const buttons = w.findAll('button');
    const cancelBtn = buttons.find((b) => b.text().includes('Cancel'));
    expect(cancelBtn).toBeDefined();
  });
});
