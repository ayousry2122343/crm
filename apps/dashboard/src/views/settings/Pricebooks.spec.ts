import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import Pricebooks from './Pricebooks.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockArchive = vi.fn();
const mockSetEntry = vi.fn();
const mockRemoveEntry = vi.fn();
const mockListProducts = vi.fn();

vi.mock('@/api/pricebooks', () => ({
  pricebooksApi: {
    list: (...args: unknown[]) => mockList(...args),
    get: (...args: unknown[]) => mockGet(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    archive: (...args: unknown[]) => mockArchive(...args),
    setEntry: (...args: unknown[]) => mockSetEntry(...args),
    removeEntry: (...args: unknown[]) => mockRemoveEntry(...args),
  },
}));

vi.mock('@/api/products', () => ({
  productsApi: {
    list: (...args: unknown[]) => mockListProducts(...args),
  },
}));

const pricebooks = [
  {
    id: 'pb_1',
    name: 'Standard',
    currency: 'EGP',
    isDefault: true,
    _count: { entries: 3 },
    createdAt: '2025-01-01',
  },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(Pricebooks, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div :data-test="$attrs[\'data-test\']"><slot /></div>',
          props: ['value', 'loading'],
        },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Dialog: {
          template: '<div v-if="$attrs.visible"><slot /></div>',
          props: ['visible', 'header', 'modal'],
        },
        InputText: true,
        InputNumber: true,
        Select: true,
        InputSwitch: true,
        Tag: {
          template: '<span>{{ $attrs.value }}</span>',
          props: ['value', 'severity'],
        },
        Button: {
          template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'loading', 'severity', 'size', 'text'],
        },
      },
    },
  });
}

describe('Pricebooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(pricebooks);
    mockListProducts.mockResolvedValue({ items: [] });
    mockCreate.mockResolvedValue({ id: 'pb_2' });
  });

  it('loads pricebooks on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders pricebooks admin page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="pricebooks-admin-page"]').exists()).toBe(true);
  });

  it('has add pricebook button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-pricebook-btn"]').exists()).toBe(true);
  });

  it('renders the pricebooks table', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="pricebooks-table"]').exists()).toBe(true);
  });

  it('also loads products for entry selection', async () => {
    createWrapper();
    await flushPromises();
    expect(mockListProducts).toHaveBeenCalledWith({ isActive: true, limit: 200 });
  });
});
