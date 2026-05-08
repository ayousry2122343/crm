import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import BlogEditor from './BlogEditor.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockPublish = vi.fn();
const mockListCategories = vi.fn();
const mockPush = vi.fn();
const mockBack = vi.fn();

vi.mock('@/api/blogs', () => ({
  blogsApi: {
    get: (...args: unknown[]) => mockGet(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    publish: (...args: unknown[]) => mockPublish(...args),
    listCategories: (...args: unknown[]) => mockListCategories(...args),
  },
}));

vi.mock('@/api/comments', () => ({
  commentsApi: {
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    pin: vi.fn(),
    unpin: vi.fn(),
    follow: vi.fn(),
    unfollow: vi.fn(),
    listFollowers: vi.fn(),
  },
}));

vi.mock('@/api/users', () => ({
  usersApi: {
    list: vi.fn().mockResolvedValue({ members: [], invites: [] }),
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

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useRoute: () => ({ params: {}, query: {} }),
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn(), warn: vi.fn(), apiError: vi.fn() }),
}));

const blog = {
  id: 'b_1',
  title: 'Test Post',
  slug: 'test-post',
  body: '# Hello',
  status: 'DRAFT',
  tags: ['tech'],
  metaDescription: 'A test post',
  categoryId: null,
  author: { id: 'u_1', fullName: 'Ahmed' },
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

function createWrapper(id = 'new') {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(BlogEditor, {
    props: { id },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Button: {
          template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'severity', 'size', 'text', 'loading'],
        },
        InputText: { template: '<input :data-test="$attrs[\'data-test\']" />', props: ['modelValue'] },
        Textarea: { template: '<textarea :data-test="$attrs[\'data-test\']" />', props: ['modelValue'] },
        Select: { template: '<select></select>', props: ['modelValue', 'options'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Chips: { template: '<div data-test="tags-input"></div>', props: ['modelValue'] },
      },
    },
  });
}

describe('BlogEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(blog);
    mockListCategories.mockResolvedValue([]);
    mockCreate.mockResolvedValue({ ...blog, id: 'b_new' });
    mockUpdate.mockResolvedValue(blog);
  });

  it('renders editor page for new blog', async () => {
    const wrapper = createWrapper('new');
    await flushPromises();
    expect(wrapper.find('[data-test="blog-editor-page"]').exists()).toBe(true);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('loads existing blog on mount', async () => {
    createWrapper('b_1');
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('b_1');
  });

  it('renders save button', async () => {
    const wrapper = createWrapper('new');
    await flushPromises();
    expect(wrapper.find('[data-test="save-blog-btn"]').exists()).toBe(true);
  });

  it('renders title and slug inputs', async () => {
    const wrapper = createWrapper('new');
    await flushPromises();
    expect(wrapper.find('[data-test="blog-title-input"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="blog-slug-input"]').exists()).toBe(true);
  });
});
