import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import ListWidget from './ListWidget.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockRun = vi.fn();

vi.mock('@/api/reports', () => ({
  reportsApi: { run: (...args: unknown[]) => mockRun(...args) },
}));

const widget = {
  id: 'w1',
  type: 'LIST' as const,
  title: { en: 'Top Deals', ar: 'أهم الصفقات' },
  reportId: 'r1',
  grid: { x: 0, y: 0, w: 6, h: 4 },
};

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(ListWidget, {
    props: { widget },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: { template: '<div data-test="data-table-stub"><slot /></div>', props: ['value', 'loading'] },
        Column: { template: '<div />' },
      },
    },
  });
}

describe('ListWidget.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockResolvedValue({
      rows: [
        { name: 'Acme Deal', amount: 5000 },
        { name: 'Beta Deal', amount: 3000 },
      ],
    });
  });

  it('renders the widget', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="list-widget"]').exists()).toBe(true);
  });

  it('shows the title', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Top Deals');
  });

  it('renders data table after loading', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="data-table-stub"]').exists()).toBe(true);
  });

  it('calls reportsApi.run with widget reportId', async () => {
    createWrapper();
    await flushPromises();
    expect(mockRun).toHaveBeenCalledWith('r1', undefined);
  });

  it('handles empty rows gracefully', async () => {
    mockRun.mockResolvedValue({ rows: [] });
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="list-widget"]').exists()).toBe(true);
    expect(w.find('[data-test="data-table-stub"]').exists()).toBe(true);
  });
});
