import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import CSATDashboard from './CSATDashboard.vue';
import PrimeVue from 'primevue/config';
import { createI18n } from 'vue-i18n';
import en from '@/i18n/en.json';
import { createRouter, createWebHistory } from 'vue-router';

vi.mock('@/api/csat', () => ({
  csatApi: {
    list: vi.fn().mockResolvedValue({
      items: [
        { id: 'r1', ticketId: 't1', ticket: { subject: 'Help' }, contact: { fullName: 'Ahmed' }, rating: 5, comment: 'Great', respondedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
      ],
      nextCursor: null,
    }),
    stats: vi.fn().mockResolvedValue({
      total: 10,
      responded: 8,
      averageRating: 4.2,
      distribution: { 1: 0, 2: 1, 3: 1, 4: 2, 5: 4 },
    }),
  },
}));

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });
const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: { template: '<div />' } }] });

describe('CSATDashboard.vue', () => {
  it('renders page title', async () => {
    const w = mount(CSATDashboard, {
      global: { plugins: [PrimeVue, i18n, router] },
    });
    await vi.dynamicImportSettled();
    expect(w.text()).toContain('Customer Satisfaction');
  });

  it('loads stats and ratings on mount', async () => {
    const { csatApi } = await import('@/api/csat');
    mount(CSATDashboard, {
      global: { plugins: [PrimeVue, i18n, router] },
    });
    await vi.dynamicImportSettled();
    expect(csatApi.stats).toHaveBeenCalled();
    expect(csatApi.list).toHaveBeenCalled();
  });
});
