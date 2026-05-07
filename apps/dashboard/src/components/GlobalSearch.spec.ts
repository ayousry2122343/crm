import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import GlobalSearch from './GlobalSearch.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockSearch = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/search', () => ({
  searchApi: {
    search: (...args: unknown[]) => mockSearch(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const fakeResults = [
  { id: 'p1', entityType: 'Person', title: 'Ahmed Yousry', subtitle: 'ahmed@test.com' },
  { id: 'p2', entityType: 'Company', title: 'Acme Corp', subtitle: null },
];

function createWrapper() {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { ar, en },
  });

  return mount(GlobalSearch, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Dialog: {
          template: '<div v-if="visible" data-test="global-search-dialog"><slot /></div>',
          props: ['visible'],
        },
      },
    },
  });
}

describe('GlobalSearch.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch.mockResolvedValue({ items: fakeResults });
  });

  it('opens via exposed open method', async () => {
    const w = createWrapper();
    expect(w.find('[data-test="global-search-dialog"]').exists()).toBe(false);

    (w.vm as any).open();
    await flushPromises();
    expect(w.find('[data-test="global-search-dialog"]').exists()).toBe(true);
  });

  it('shows search input when opened', async () => {
    const w = createWrapper();
    (w.vm as any).open();
    await flushPromises();
    expect(w.find('[data-test="search-query-input"]').exists()).toBe(true);
  });

  it('searches when query length >= 2', async () => {
    const w = createWrapper();
    (w.vm as any).open();
    await flushPromises();

    const input = w.find('[data-test="search-query-input"]');
    await input.setValue('ah');

    // wait for debounce
    await new Promise((r) => setTimeout(r, 300));
    await flushPromises();

    expect(mockSearch).toHaveBeenCalledWith('ah', undefined, 10);
  });

  it('does not search with single character', async () => {
    const w = createWrapper();
    (w.vm as any).open();
    await flushPromises();

    const input = w.find('[data-test="search-query-input"]');
    await input.setValue('a');
    await new Promise((r) => setTimeout(r, 300));
    await flushPromises();

    expect(mockSearch).not.toHaveBeenCalled();
  });

  it('navigates to person on click', async () => {
    const w = createWrapper();
    (w.vm as any).open();
    await flushPromises();

    await w.find('[data-test="search-query-input"]').setValue('ah');
    await new Promise((r) => setTimeout(r, 300));
    await flushPromises();

    await w.find('[data-test="search-result-0"]').trigger('click');
    expect(mockPush).toHaveBeenCalledWith({
      name: 'person-detail',
      params: { id: 'p1' },
    });
  });

  it('navigates to company on click', async () => {
    const w = createWrapper();
    (w.vm as any).open();
    await flushPromises();

    await w.find('[data-test="search-query-input"]').setValue('ac');
    await new Promise((r) => setTimeout(r, 300));
    await flushPromises();

    await w.find('[data-test="search-result-1"]').trigger('click');
    expect(mockPush).toHaveBeenCalledWith({
      name: 'company-detail',
      params: { id: 'p2' },
    });
  });
});
