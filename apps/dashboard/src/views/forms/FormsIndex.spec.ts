import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import FormsIndex from './FormsIndex.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/api/forms', () => ({
  formsApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    delete: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(FormsIndex, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: { template: '<div data-test="forms-table"><slot /></div>', props: ['value', 'loading'] },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Dialog: { template: '<div v-if="$attrs.visible"><slot /></div>', props: ['visible', 'header', 'modal'] },
        InputText: true,
        Tag: true,
        Button: { template: '<button @click="$emit(\'click\')">{{ $attrs.label }}</button>', props: ['label', 'icon', 'loading', 'severity', 'size', 'text'] },
        'router-link': { template: '<a><slot /></a>', props: ['to'] },
      },
    },
  });
}

describe('FormsIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

  it('loads forms on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders the page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="forms-index-page"]').exists()).toBe(true);
  });

  it('has an add form button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-form-btn"]').exists()).toBe(true);
  });
});
