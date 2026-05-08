import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import ReportsIndex from './ReportsIndex.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockListReports = vi.fn();
const mockRunReport = vi.fn();

vi.mock('@/api/reports', () => ({
  reportsApi: {
    list: (...args: unknown[]) => mockListReports(...args),
    run: (...args: unknown[]) => mockRunReport(...args),
  },
}));

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(ReportsIndex, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Select: true,
        DataTable: { template: '<div data-test="report-table"><slot /></div>', props: ['value', 'loading'] },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Chart: { template: '<div data-test="chart"></div>', props: ['type', 'data', 'options'] },
        Button: { template: '<button @click="$emit(\'click\')">{{ $attrs.label }}</button>', props: ['label', 'icon', 'loading', 'disabled', 'severity', 'size', 'text'] },
      },
    },
  });
}

describe('ReportsIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListReports.mockResolvedValue([]);
  });

  it('loads reports on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockListReports).toHaveBeenCalled();
  });

  it('renders the page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="reports-index-page"]').exists()).toBe(true);
  });

  it('has a run report button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="run-report-btn"]').exists()).toBe(true);
  });

  it('renders the title', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.text()).toContain('Reports');
  });
});
