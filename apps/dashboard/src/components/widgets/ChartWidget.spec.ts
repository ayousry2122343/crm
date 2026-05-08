import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import ChartWidget from './ChartWidget.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockRun = vi.fn();

vi.mock('@/api/reports', () => ({
  reportsApi: { run: (...args: unknown[]) => mockRun(...args) },
}));

const widget = {
  id: 'w1',
  type: 'CHART' as const,
  title: { en: 'Deals by Stage', ar: 'الصفقات حسب المرحلة' },
  reportId: 'r1',
  chartType: 'bar' as const,
  grid: { x: 0, y: 0, w: 6, h: 4 },
};

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(ChartWidget, {
    props: { widget },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Chart: { template: '<div data-test="chart-stub" />', props: ['type', 'data', 'options'] },
      },
    },
  });
}

describe('ChartWidget.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockResolvedValue({
      rows: [
        { label: 'Lead', count: 10 },
        { label: 'Qualified', count: 5 },
      ],
    });
  });

  it('renders the widget', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="chart-widget"]').exists()).toBe(true);
  });

  it('shows the title', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Deals by Stage');
  });

  it('renders chart after loading', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="chart-stub"]').exists()).toBe(true);
  });

  it('shows loading state initially', () => {
    const w = createWrapper();
    expect(w.text()).toContain('Loading...');
  });
});
