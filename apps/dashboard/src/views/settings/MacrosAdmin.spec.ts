import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import MacrosAdmin from './MacrosAdmin.vue';
import PrimeVue from 'primevue/config';
import { createI18n } from 'vue-i18n';
import en from '@/i18n/en.json';
import { createRouter, createWebHistory } from 'vue-router';

vi.mock('@/api/macros', () => ({
  macrosApi: {
    list: vi.fn().mockResolvedValue([
      { id: 'm1', name: 'Greeting', content: 'Hello!', category: 'General', visibility: 'GLOBAL', shortcut: '/greet' },
    ]),
    create: vi.fn().mockResolvedValue({ id: 'm2' }),
    update: vi.fn().mockResolvedValue({ id: 'm1' }),
    archive: vi.fn().mockResolvedValue({}),
  },
}));

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });
const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: { template: '<div />' } }] });

function factory() {
  return mount(MacrosAdmin, {
    global: { plugins: [PrimeVue, i18n, router] },
  });
}

describe('MacrosAdmin.vue', () => {
  it('renders page title', async () => {
    const w = factory();
    await vi.dynamicImportSettled();
    expect(w.text()).toContain('Macros');
  });

  it('shows create button', () => {
    const w = factory();
    expect(w.find('[data-test="create-macro"]').exists()).toBe(true);
  });

  it('loads macros on mount', async () => {
    const { macrosApi } = await import('@/api/macros');
    factory();
    await vi.dynamicImportSettled();
    expect(macrosApi.list).toHaveBeenCalled();
  });
});
