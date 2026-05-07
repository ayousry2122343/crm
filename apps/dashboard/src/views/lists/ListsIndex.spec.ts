import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import ListsIndex from './ListsIndex.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/api/lists', () => ({
  listsApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const fakeLists = [
  {
    id: 'l1',
    name: 'VIP Leads',
    entityType: 'Person',
    isActive: true,
    memberIds: [],
    query: { filters: [] },
    createdAt: '2026-01-01',
  },
  {
    id: 'l2',
    name: 'Big Deals',
    entityType: 'Deal',
    isActive: false,
    memberIds: ['d1', 'd2'],
    query: { filters: [] },
    createdAt: '2026-01-02',
  },
];

function createWrapper() {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { ar, en },
  });

  return mount(ListsIndex, {
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

describe('ListsIndex.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: fakeLists });
    mockCreate.mockResolvedValue({ id: 'l3' });
  });

  it('renders page title', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Lists');
  });

  it('loads lists on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('shows create list button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="add-list-btn"]').exists()).toBe(true);
  });
});
