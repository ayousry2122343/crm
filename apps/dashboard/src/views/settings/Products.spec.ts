import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import Products from './Products.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockArchive = vi.fn();
const mockListCategories = vi.fn();
const mockCreateCategory = vi.fn();

vi.mock('@/api/products', () => ({
  productsApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    archive: (...args: unknown[]) => mockArchive(...args),
    listCategories: (...args: unknown[]) => mockListCategories(...args),
    createCategory: (...args: unknown[]) => mockCreateCategory(...args),
  },
}));

const products = [
  {
    id: 'prod_1',
    name: 'Widget A',
    sku: 'WDG-001',
    unitPrice: 100,
    currency: 'EGP',
    isActive: true,
    category: { id: 'cat_1', name: 'Hardware' },
    categoryId: 'cat_1',
    createdAt: '2025-01-01',
  },
  {
    id: 'prod_2',
    name: 'Service B',
    sku: 'SVC-001',
    unitPrice: 500,
    currency: 'EGP',
    isActive: false,
    category: null,
    categoryId: null,
    createdAt: '2025-01-02',
  },
];

const categories = [
  { id: 'cat_1', name: 'Hardware', children: [] },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(Products, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="products-table"><slot /></div>',
          props: ['value', 'loading'],
        },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Dialog: {
          template: '<div v-if="$attrs.visible"><slot /></div>',
          props: ['visible', 'header', 'modal'],
        },
        InputText: true,
        InputNumber: true,
        Textarea: true,
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

describe('Products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: products });
    mockListCategories.mockResolvedValue(categories);
    mockCreate.mockResolvedValue({ id: 'prod_3' });
    mockCreateCategory.mockResolvedValue({ id: 'cat_2' });
  });

  it('loads products and categories on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
    expect(mockListCategories).toHaveBeenCalled();
  });

  it('renders products admin page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="products-admin-page"]').exists()).toBe(true);
  });

  it('has add product button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-product-btn"]').exists()).toBe(true);
  });

  it('has add category button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-category-btn"]').exists()).toBe(true);
  });

  it('renders the products table', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="products-table"]').exists()).toBe(true);
  });
});
