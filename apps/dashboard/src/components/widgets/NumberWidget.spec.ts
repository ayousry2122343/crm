import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import NumberWidget from './NumberWidget.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockRun = vi.fn();

vi.mock('@/api/reports', () => ({
  reportsApi: { run: (...args: unknown[]) => mockRun(...args) },
}));

const widget = {
  id: 'w1',
  type: 'NUMBER' as const,
  title: { en: 'Total Contacts', ar: 'جهات الاتصال' },
  reportId: 'r1',
  grid: { x: 0, y: 0, w: 6, h: 4 },
};

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(NumberWidget, {
    props: { widget },
    global: { plugins: [i18n, PrimeVue] },
  });
}

describe('NumberWidget.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockResolvedValue({ summary: { total: 42 }, rows: [] });
  });

  it('renders the widget', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="number-widget"]').exists()).toBe(true);
  });

  it('shows the widget title', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Total Contacts');
  });

  it('shows the number value after loading', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('42');
  });

  it('shows loading state initially', () => {
    const w = createWrapper();
    expect(w.text()).toContain('...');
  });

  it('shows dash when result has no total', async () => {
    mockRun.mockResolvedValue({ summary: {}, rows: [] });
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('—');
  });

  it('shows zero when total is 0', async () => {
    mockRun.mockResolvedValue({ summary: { total: 0 }, rows: [] });
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('0');
  });
});
