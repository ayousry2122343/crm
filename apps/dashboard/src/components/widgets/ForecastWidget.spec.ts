import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import ForecastWidget from './ForecastWidget.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockGetByPeriod = vi.fn();

vi.mock('@/api/forecasts', () => ({
  forecastsApi: {
    getByPeriod: (...args: unknown[]) => mockGetByPeriod(...args),
  },
}));

const entries = [
  { id: 'e1', category: 'PIPELINE', amount: 10000, adjustedAmount: null },
  { id: 'e2', category: 'BEST_CASE', amount: 8000, adjustedAmount: null },
  { id: 'e3', category: 'COMMIT', amount: 5000, adjustedAmount: 6000 },
  { id: 'e4', category: 'CLOSED_WON', amount: 12000, adjustedAmount: null },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(ForecastWidget, {
    global: {
      plugins: [i18n, PrimeVue],
    },
  });
}

describe('ForecastWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByPeriod.mockResolvedValue({ id: 'fp_1', entries });
  });

  it('renders the widget', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="forecast-widget"]').exists()).toBe(true);
  });

  it('shows pipeline total', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="fw-pipeline"]').exists()).toBe(true);
  });

  it('shows best case total', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="fw-bestcase"]').exists()).toBe(true);
  });

  it('shows commit total', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="fw-commit"]').exists()).toBe(true);
  });

  it('shows closed won total', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="fw-closedwon"]').exists()).toBe(true);
  });

  it('handles API error gracefully', async () => {
    mockGetByPeriod.mockRejectedValue(new Error('fail'));
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="forecast-widget"]').exists()).toBe(true);
  });
});
