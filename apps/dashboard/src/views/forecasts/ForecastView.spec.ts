import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import ForecastView from './ForecastView.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockGetByPeriod = vi.fn();
const mockTakeSnapshot = vi.fn();
const mockUpdateEntry = vi.fn();

vi.mock('@/api/forecasts', () => ({
  forecastsApi: {
    getByPeriod: (...args: unknown[]) => mockGetByPeriod(...args),
    takeSnapshot: (...args: unknown[]) => mockTakeSnapshot(...args),
    updateEntry: (...args: unknown[]) => mockUpdateEntry(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: {}, query: {} }),
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const forecastData = {
  id: 'fp_1',
  periodType: 'MONTHLY',
  startDate: '2026-05-01',
  endDate: '2026-05-31',
  entries: [
    {
      id: 'fe_1',
      userId: 'u_1',
      user: { id: 'u_1', fullName: 'Ahmed' },
      pipelineId: 'p_1',
      pipeline: { id: 'p_1', name: 'Default' },
      category: 'COMMIT',
      amount: 5000,
      adjustedAmount: null,
      note: null,
    },
    {
      id: 'fe_2',
      userId: 'u_1',
      user: { id: 'u_1', fullName: 'Ahmed' },
      pipelineId: 'p_1',
      pipeline: { id: 'p_1', name: 'Default' },
      category: 'BEST_CASE',
      amount: 3000,
      adjustedAmount: null,
      note: null,
    },
  ],
};

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(ForecastView, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="forecast-table"><slot /></div>',
          props: ['value', 'loading'],
        },
        Column: { template: '<div></div>', props: ['field', 'header'] },
        Select: {
          template: '<select data-test="period-type-select"></select>',
          props: ['modelValue', 'options'],
        },
        InputText: {
          template: '<input data-test="date-input" />',
          props: ['modelValue', 'placeholder'],
        },
        InputNumber: {
          template: '<input />',
          props: ['modelValue'],
        },
        Button: {
          template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'severity', 'disabled'],
        },
      },
    },
  });
}

describe('ForecastView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetByPeriod.mockResolvedValue(forecastData);
    mockTakeSnapshot.mockResolvedValue({});
  });

  it('renders the forecast page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="forecast-page"]').exists()).toBe(true);
  });

  it('loads forecast on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockGetByPeriod).toHaveBeenCalled();
  });

  it('shows period type selector', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="period-type-select"]').exists()).toBe(true);
  });

  it('renders the forecast table with data', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="forecast-table"]').exists()).toBe(true);
  });

  it('has take snapshot button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="snapshot-btn"]').exists()).toBe(true);
  });

  it('shows no data message when empty', async () => {
    mockGetByPeriod.mockRejectedValue(new Error('not found'));
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="no-data"]').exists()).toBe(true);
  });
});
