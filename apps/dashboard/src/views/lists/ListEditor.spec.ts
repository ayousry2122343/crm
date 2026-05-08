import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import ListEditor from './ListEditor.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockGet = vi.fn();
const mockMembers = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/api/lists', () => ({
  listsApi: {
    get: (...args: unknown[]) => mockGet(...args),
    members: (...args: unknown[]) => mockMembers(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const fakeList = {
  id: 'l1',
  name: 'VIP Contacts',
  type: 'LIVE',
  query: { filters: [{ field: 'lifecycleStage', op: 'eq', value: 'MQL' }] },
};

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(ListEditor, {
    props: { id: 'l1' },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: { template: '<div data-test="data-table-stub"><slot /><slot name="empty" /></div>', props: ['value'] },
        Column: { template: '<div />' },
        Select: { template: '<select />', props: ['modelValue', 'options'] },
      },
    },
  });
}

describe('ListEditor.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(JSON.parse(JSON.stringify(fakeList)));
    mockMembers.mockResolvedValue({ items: [] });
    mockUpdate.mockResolvedValue({});
  });

  it('renders the page', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="list-editor-page"]').exists()).toBe(true);
  });

  it('renders list name input', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="list-name"]').exists()).toBe(true);
  });

  it('shows query builder section', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="query-builder"]').exists()).toBe(true);
  });

  it('has save button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="save-btn"]').exists()).toBe(true);
  });

  it('has add filter button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="add-filter-btn"]').exists()).toBe(true);
  });

  it('calls listsApi.get and listsApi.members on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('l1');
    expect(mockMembers).toHaveBeenCalledWith('l1');
  });

  it('renders members table', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="members-table"]').exists()).toBe(true);
  });
});
