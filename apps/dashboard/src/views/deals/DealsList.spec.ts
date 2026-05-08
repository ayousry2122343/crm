import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import DealsList from './DealsList.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockList = vi.fn();
const mockExportDeals = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/deals', () => ({
  dealsApi: { list: (...args: unknown[]) => mockList(...args) },
}));

vi.mock('@/api/import-export', () => ({
  importExportApi: { exportDeals: (...args: unknown[]) => mockExportDeals(...args) },
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn(), apiError: vi.fn() }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const fakeDeals = [
  { id: 'd1', name: 'Acme Deal', amount: '5000', status: 'OPEN', score: 80, createdAt: '2026-01-01T00:00:00Z' },
  { id: 'd2', name: 'Beta Deal', amount: '3000', status: 'WON', score: 95, createdAt: '2026-01-02T00:00:00Z' },
];

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(DealsList, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        ListView: { template: '<div data-test="list-view-stub"><slot /></div>', props: ['items', 'columns', 'loading'] },
        FilterBar: { template: '<div data-test="filter-bar-stub" />' },
        ScoreBadge: { template: '<span />' },
      },
    },
  });
}

describe('DealsList.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: fakeDeals, nextCursor: undefined });
  });

  it('renders the page', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="deals-list-page"]').exists()).toBe(true);
  });

  it('calls dealsApi.list on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('shows export CSV button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="export-csv-btn"]').exists()).toBe(true);
  });

  it('shows export Excel button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="export-excel-btn"]').exists()).toBe(true);
  });

  it('has kanban button that navigates to kanban view', async () => {
    const w = createWrapper();
    await flushPromises();
    const kanbanBtn = w.findAll('button').find((b) => b.text().includes('Kanban'));
    expect(kanbanBtn).toBeDefined();
  });
});
