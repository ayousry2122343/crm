import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import KanbanWidget from './KanbanWidget.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockRun = vi.fn();

vi.mock('@/api/reports', () => ({
  reportsApi: { run: (...args: unknown[]) => mockRun(...args) },
}));

const widget = {
  id: 'w1',
  type: 'KANBAN' as const,
  title: { en: 'Deal Pipeline', ar: 'مسار الصفقات' },
  reportId: 'r1',
  grid: { x: 0, y: 0, w: 12, h: 4 },
};

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(KanbanWidget, {
    props: { widget },
    global: { plugins: [i18n, PrimeVue] },
  });
}

describe('KanbanWidget.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRun.mockResolvedValue({
      rows: [
        { label: 'Lead', count: 10, total: 50000 },
        { label: 'Qualified', count: 5, total: 25000 },
        { label: 'Won', count: 3, total: 15000 },
      ],
    });
  });

  it('renders the widget', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="kanban-widget"]').exists()).toBe(true);
  });

  it('shows the title', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Deal Pipeline');
  });

  it('renders columns after loading', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Lead');
    expect(w.text()).toContain('Qualified');
    expect(w.text()).toContain('Won');
  });

  it('shows loading state initially', () => {
    const w = createWrapper();
    expect(w.text()).toContain('Loading...');
  });

  it('shows counts in columns', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('10');
    expect(w.text()).toContain('5');
  });

  it('handles empty rows gracefully', async () => {
    mockRun.mockResolvedValue({ rows: [] });
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="kanban-widget"]').exists()).toBe(true);
    expect(w.text()).not.toContain('Loading...');
  });
});
