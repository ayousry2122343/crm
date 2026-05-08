import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import DealDetail from './DealDetail.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockDealGet = vi.fn();
const mockDealUpdate = vi.fn();
const mockActivityList = vi.fn();

vi.mock('@/api/deals', () => ({
  dealsApi: {
    get: (...args: unknown[]) => mockDealGet(...args),
    update: (...args: unknown[]) => mockDealUpdate(...args),
  },
}));

vi.mock('@/api/activities', () => ({
  activitiesApi: {
    list: (...args: unknown[]) => mockActivityList(...args),
    create: vi.fn(),
  },
}));

vi.mock('@/api/pipelines', () => ({
  pipelinesApi: {
    get: vi.fn().mockResolvedValue({
      id: 'p1',
      name: 'Sales',
      stages: [
        { id: 's1', name: 'Lead', order: 0, probability: 10, color: '#3b82f6' },
      ],
    }),
  },
}));

vi.mock('@/api/attachments', () => ({
  attachmentsApi: {
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn(), apiError: vi.fn() }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useRoute: () => ({ params: { id: 'd1' } }),
}));

const deal = {
  id: 'd1',
  name: 'Acme deal',
  amount: '5000.00',
  currency: 'EGP',
  status: 'OPEN',
  stageId: 's1',
  pipelineId: 'p1',
  expectedClose: null,
  wonReason: null,
  lostReason: null,
  probability: 10,
  isRotting: false,
  customFields: {},
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(DealDetail, {
    props: { id: 'd1' },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        TabView: { template: '<div><slot /></div>' },
        TabPanel: { template: '<div><slot /></div>', props: ['value', 'header'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: { template: '<button @click="$emit(\'click\')">{{ $attrs.label }}</button>', props: ['label', 'icon', 'severity', 'size'] },
        ActivityComposer: true,
      },
    },
  });
}

describe('DealDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDealGet.mockResolvedValue(deal);
    mockActivityList.mockResolvedValue({ items: [] });
  });

  it('loads deal on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockDealGet).toHaveBeenCalledWith('d1');
  });

  it('renders deal name', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.text()).toContain('Acme deal');
  });

  it('renders deal amount', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.text()).toContain('5,000');
  });

  it('shows OPEN status', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.text()).toContain('OPEN');
  });
});
