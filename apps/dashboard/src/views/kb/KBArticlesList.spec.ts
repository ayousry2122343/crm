import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import KBArticlesList from './KBArticlesList.vue';
import PrimeVue from 'primevue/config';
import { createI18n } from 'vue-i18n';
import en from '@/i18n/en.json';
import { createRouter, createWebHistory } from 'vue-router';

vi.mock('@/api/kb', () => ({
  kbApi: {
    listCategories: vi.fn().mockResolvedValue([
      { id: 'c1', name: 'FAQ', slug: 'faq', _count: { articles: 3 } },
    ]),
    listArticles: vi.fn().mockResolvedValue({
      items: [
        { id: 'a1', title: 'Getting Started', slug: 'getting-started', status: 'PUBLISHED', category: { name: 'FAQ' }, viewCount: 42, helpfulCount: 10, notHelpfulCount: 2, createdAt: new Date().toISOString() },
      ],
      nextCursor: null,
    }),
  },
}));

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/kb', name: 'kb', component: { template: '<div />' } },
    { path: '/kb/new', name: 'kb-new', component: { template: '<div />' } },
    { path: '/kb/:id', name: 'kb-editor', component: { template: '<div />' } },
    { path: '/kb/categories', name: 'kb-categories', component: { template: '<div />' } },
  ],
});

describe('KBArticlesList.vue', () => {
  it('renders page title', async () => {
    const w = mount(KBArticlesList, {
      global: { plugins: [PrimeVue, i18n, router] },
    });
    await vi.dynamicImportSettled();
    expect(w.text()).toContain('Knowledge Base');
  });

  it('shows create article button', () => {
    const w = mount(KBArticlesList, {
      global: { plugins: [PrimeVue, i18n, router] },
    });
    expect(w.find('[data-test="create-article"]').exists()).toBe(true);
  });

  it('loads articles and categories on mount', async () => {
    const { kbApi } = await import('@/api/kb');
    mount(KBArticlesList, {
      global: { plugins: [PrimeVue, i18n, router] },
    });
    await vi.dynamicImportSettled();
    expect(kbApi.listCategories).toHaveBeenCalled();
    expect(kbApi.listArticles).toHaveBeenCalled();
  });
});
