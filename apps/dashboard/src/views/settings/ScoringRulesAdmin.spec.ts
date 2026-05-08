import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import ScoringRulesAdmin from './ScoringRulesAdmin.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockListRules = vi.fn();
const mockCreateRule = vi.fn();
const mockUpdateRule = vi.fn();
const mockArchiveRule = vi.fn();
const mockBulkRescore = vi.fn();

vi.mock('@/api/scoring', () => ({
  scoringApi: {
    listRules: (...args: unknown[]) => mockListRules(...args),
    createRule: (...args: unknown[]) => mockCreateRule(...args),
    updateRule: (...args: unknown[]) => mockUpdateRule(...args),
    archiveRule: (...args: unknown[]) => mockArchiveRule(...args),
    bulkRescore: (...args: unknown[]) => mockBulkRescore(...args),
  },
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn(), warn: vi.fn(), apiError: vi.fn() }),
}));

const fakeRules = [
  {
    id: 'sr_1',
    name: 'Lead Quality',
    entityType: 'PERSON',
    isActive: true,
    rules: [
      { field: 'lifecycleStage', operator: 'EQUALS', value: 'SQL', points: 30 },
    ],
    maxScore: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'sr_2',
    name: 'Deal Value',
    entityType: 'DEAL',
    isActive: false,
    rules: [
      { field: 'amount', operator: 'GT', value: 10000, points: 25 },
    ],
    maxScore: 80,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];

function createWrapper() {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { ar, en },
  });

  return mount(ScoringRulesAdmin, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Dialog: {
          template: '<div v-if="visible"><slot /></div>',
          props: ['visible'],
        },
      },
    },
  });
}

describe('ScoringRulesAdmin.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListRules.mockResolvedValue({ items: fakeRules, nextCursor: null });
    mockCreateRule.mockResolvedValue({ id: 'sr_3' });
    mockUpdateRule.mockResolvedValue({});
    mockArchiveRule.mockResolvedValue({});
    mockBulkRescore.mockResolvedValue({ processed: 10, updated: 10 });
  });

  it('renders page and loads rules', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="scoring-rules-page"]').exists()).toBe(true);
    expect(mockListRules).toHaveBeenCalled();
  });

  it('shows DataTable with rules', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="rules-table"]').exists()).toBe(true);
  });

  it('has create button that opens dialog', async () => {
    const w = createWrapper();
    await flushPromises();
    const btn = w.find('[data-test="create-rule-btn"]');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('Create Rule');
  });

  it('shows entityType filter', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="entity-type-filter"]').exists()).toBe(true);
  });

  it('has bulk rescore buttons', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="rescore-person-btn"]').exists()).toBe(true);
    expect(w.find('[data-test="rescore-deal-btn"]').exists()).toBe(true);
  });
});
