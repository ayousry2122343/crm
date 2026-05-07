import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import DealsKanban from './DealsKanban.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockPipelineList = vi.fn();
const mockPipelineGet = vi.fn();
const mockDealList = vi.fn();
const mockDealCreate = vi.fn();
const mockDealMoveStage = vi.fn();

vi.mock('@/api/pipelines', () => ({
  pipelinesApi: {
    list: (...args: unknown[]) => mockPipelineList(...args),
    get: (...args: unknown[]) => mockPipelineGet(...args),
  },
}));

vi.mock('@/api/deals', () => ({
  dealsApi: {
    list: (...args: unknown[]) => mockDealList(...args),
    create: (...args: unknown[]) => mockDealCreate(...args),
    moveStage: (...args: unknown[]) => mockDealMoveStage(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: {} }),
}));

const pipeline = {
  id: 'p1',
  name: 'Sales',
  entityType: 'Deal',
  isDefault: true,
  stages: [
    { id: 's1', name: 'Lead', order: 0, probability: 10, color: '#3b82f6' },
    { id: 's2', name: 'Won', order: 1, probability: 100, color: '#22c55e', isWon: true },
  ],
};

const deals = [
  {
    id: 'd1',
    name: 'Acme deal',
    amount: '5000',
    currency: 'EGP',
    status: 'OPEN',
    stageId: 's1',
    pipelineId: 'p1',
    isRotting: false,
    createdAt: '2024-01-01T00:00:00Z',
  },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(DealsKanban, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        KanbanBoard: { template: '<div data-test="kanban-board"><slot /></div>' },
        Dialog: { template: '<div><slot /></div>', props: ['visible'] },
        Select: true,
        Button: { template: '<button @click="$emit(\'click\')"><slot />{{ $attrs.label }}</button>', props: ['label', 'icon', 'loading', 'severity', 'size'] },
        InputText: true,
      },
    },
  });
}

describe('DealsKanban', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPipelineList.mockResolvedValue({ items: [pipeline] });
    mockPipelineGet.mockResolvedValue(pipeline);
    mockDealList.mockResolvedValue({ items: deals });
    mockDealCreate.mockResolvedValue({ id: 'd2' });
  });

  it('loads pipelines on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockPipelineList).toHaveBeenCalled();
  });

  it('loads deals when pipeline is selected', async () => {
    createWrapper();
    await flushPromises();
    expect(mockDealList).toHaveBeenCalled();
  });

  it('renders the page title', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.text()).toContain('Kanban');
  });

  it('has an add deal button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-deal-btn"]').exists()).toBe(true);
  });
});
