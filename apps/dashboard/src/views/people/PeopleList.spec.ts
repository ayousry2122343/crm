import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import PeopleList from './PeopleList.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockArchive = vi.fn();
const mockTagCreate = vi.fn();
const mockTagAssign = vi.fn();

vi.mock('@/api/people', () => ({
  peopleApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    archive: (...args: unknown[]) => mockArchive(...args),
  },
}));

vi.mock('@/api/tags', () => ({
  tagsApi: {
    create: (...args: unknown[]) => mockTagCreate(...args),
    assign: (...args: unknown[]) => mockTagAssign(...args),
  },
}));

vi.mock('@/composables/useMetadata', () => ({
  useMetadata: () => ({
    data: { value: { entityType: 'Person', fields: [] } },
    loading: { value: false },
    error: { value: null },
    refetch: vi.fn(),
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const fakePeople = [
  {
    id: 'p1',
    fullName: 'Ahmed Yousry',
    email: 'ahmed@test.com',
    phone: '+201234567890',
    lifecycleStage: 'LEAD',
    isCompany: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'p2',
    fullName: 'Sara Mohamed',
    email: 'sara@test.com',
    phone: '+201098765432',
    lifecycleStage: 'MQL',
    isCompany: false,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
];

function createWrapper(props = {}) {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { ar, en },
  });

  return mount(PeopleList, {
    props,
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DynamicForm: { template: '<div data-test="dynamic-form-stub" />' },
        Dialog: {
          template: '<div v-if="visible"><slot /></div>',
          props: ['visible'],
        },
      },
    },
  });
}

describe('PeopleList.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: fakePeople, nextCursor: undefined });
    mockCreate.mockResolvedValue({ id: 'p3' });
    mockArchive.mockResolvedValue({ id: 'p1' });
    mockTagCreate.mockResolvedValue({ id: 't1', name: 'VIP' });
    mockTagAssign.mockResolvedValue({});
  });

  it('renders the page title for People', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="people-list-page"]').exists()).toBe(true);
    expect(w.text()).toContain('People');
  });

  it('renders the page title for Companies when isCompany prop is set', async () => {
    const w = createWrapper({ isCompany: true });
    await flushPromises();
    expect(w.text()).toContain('Companies');
  });

  it('shows the Add Person button', async () => {
    const w = createWrapper();
    await flushPromises();
    const btn = w.find('[data-test="add-btn"]');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toContain('Add Person');
  });

  it('shows Add Company button when isCompany', async () => {
    const w = createWrapper({ isCompany: true });
    await flushPromises();
    const btn = w.find('[data-test="add-btn"]');
    expect(btn.text()).toContain('Add Company');
  });

  it('calls peopleApi.list on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('passes isCompany filter when prop is set', async () => {
    createWrapper({ isCompany: true });
    await flushPromises();
    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ isCompany: true }),
    );
  });

  it('renders search input in filter bar', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="search-input"]').exists()).toBe(true);
  });
});
