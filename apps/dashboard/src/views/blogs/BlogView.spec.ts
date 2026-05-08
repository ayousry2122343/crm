import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import BlogView from './BlogView.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockGetBySlug = vi.fn();
const mockRender = vi.fn();

vi.mock('@/api/blogs', () => ({
  blogsApi: {
    getBySlug: (...args: unknown[]) => mockGetBySlug(...args),
    render: (...args: unknown[]) => mockRender(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const fakeBlog = {
  id: 'b1',
  title: 'My First Blog',
  bodyHtml: '<p>Hello world</p>',
  author: { fullName: 'Ahmed Yousry' },
  publishedAt: '2026-01-01T00:00:00Z',
  category: { name: 'Engineering' },
  tags: ['vue', 'testing'],
};

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(BlogView, {
    props: { slug: 'my-first-blog' },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: { Tag: { template: '<span>{{ value }}</span>', props: ['value'] } },
    },
  });
}

describe('BlogView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetBySlug.mockResolvedValue({ id: 'b1' });
    mockRender.mockResolvedValue(fakeBlog);
  });

  it('renders the page', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="blog-view-page"]').exists()).toBe(true);
  });

  it('shows blog title', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('My First Blog');
  });

  it('shows author name', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Ahmed Yousry');
  });

  it('renders blog content', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.html()).toContain('Hello world');
  });

  it('handles missing blog gracefully', async () => {
    mockGetBySlug.mockResolvedValue({ id: 'b1' });
    mockRender.mockResolvedValue({
      ...fakeBlog,
      author: null,
      category: null,
      tags: [],
    });
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="blog-view-page"]').exists()).toBe(true);
  });
});
