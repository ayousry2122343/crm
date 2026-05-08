import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import DashboardEditor from './DashboardEditor.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockReportsList = vi.fn();

vi.mock('@/api/dashboards', () => ({
  dashboardsApi: {
    get: (...args: unknown[]) => mockGet(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock('@/api/reports', () => ({
  reportsApi: {
    list: (...args: unknown[]) => mockReportsList(...args),
    run: vi.fn().mockResolvedValue({ rows: [], summary: {} }),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const fakeDashboard = {
  id: 'dash1',
  name: 'Sales Dashboard',
  layout: {
    widgets: [
      { id: 'w1', type: 'NUMBER', title: { en: 'Total Deals', ar: 'الصفقات' }, reportId: 'r1', grid: { x: 0, y: 0, w: 6, h: 4 } },
    ],
  },
};

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(DashboardEditor, {
    props: { id: 'dash1' },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        NumberWidget: { template: '<div data-test="number-widget-stub" />' },
        ChartWidget: { template: '<div />' },
        ListWidget: { template: '<div />' },
        KanbanWidget: { template: '<div />' },
        Dialog: { template: '<div v-if="visible"><slot /><slot name="footer" /></div>', props: ['visible'] },
      },
    },
  });
}

describe('DashboardEditor.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(JSON.parse(JSON.stringify(fakeDashboard)));
    mockReportsList.mockResolvedValue([{ id: 'r1', labelEn: 'Deals Count', labelAr: 'عدد الصفقات' }]);
    mockUpdate.mockResolvedValue({});
  });

  it('renders the page', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="dashboard-editor-page"]').exists()).toBe(true);
  });

  it('loads dashboard and renders name input', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('dash1');
    expect(w.find('[data-test="dashboard-name"]').exists()).toBe(true);
  });

  it('shows add widget button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="add-widget-btn"]').exists()).toBe(true);
  });

  it('shows save button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="save-dashboard-btn"]').exists()).toBe(true);
  });

  it('renders existing widgets', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="number-widget-stub"]').exists()).toBe(true);
  });

  it('loads reports list on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockReportsList).toHaveBeenCalled();
  });
});
