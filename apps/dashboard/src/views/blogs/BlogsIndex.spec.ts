import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import BlogsIndex from './BlogsIndex.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockListCategories = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/blogs', () => ({
  blogsApi: {
    list: (...args: unknown[]) => mockList(...args),
    listCategories: (...args: unknown[]) => mockListCategories(...args),
    publish: vi.fn().mockResolvedValue({}),
    unpublish: vi.fn().mockResolvedValue({}),
    archive: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: {}, query: {} }),
}));

const blogs = [
  {
    id: 'b_1',
    title: 'Hello World',
    slug: 'hello-world',
    status: 'PUBLISHED',
    author: { id: 'u_1', fullName: 'Ahmed' },
    tags: ['tech'],
    createdAt: '2026-01-01',
  },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(BlogsIndex, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="blogs-table"><slot /></div>',
          props: ['value', 'loading'],
        },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: {
          template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'loading', 'severity', 'size'],
        },
        Dialog: {
          template: '<div v-if="$attrs.visible" data-test="create-blog-dialog"><slot /></div>',
          props: ['visible', 'header', 'modal'],
        },
        InputText: { template: '<input />', props: ['modelValue', 'placeholder'] },
        Textarea: { template: '<textarea />', props: ['modelValue', 'placeholder'] },
      },
    },
  });
}

describe('BlogsIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: blogs, nextCursor: null });
    mockListCategories.mockResolvedValue([]);
  });

  it('loads blogs on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders blogs list page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="blogs-list-page"]').exists()).toBe(true);
  });

  it('has add blog button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-blog-btn"]').exists()).toBe(true);
  });

  it('renders the blogs table', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="blogs-table"]').exists()).toBe(true);
  });
});
