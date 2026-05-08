import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import Dashboard from './Dashboard.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockGet = vi.fn();

vi.mock('@/api/client', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

vi.mock('@/composables/useAuth', async () => {
  const { ref } = await import('vue');
  return {
    useAuth: () => ({
      user: ref({ fullName: 'Ahmed Yousry' }),
      workspace: ref({ name: 'My CRM' }),
    }),
  };
});

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(Dashboard, {
    global: { plugins: [i18n, PrimeVue] },
  });
}

describe('Dashboard.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: { total: 25 } });
  });

  it('renders the home page', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="home-page"]').exists()).toBe(true);
  });

  it('shows welcome message with user name', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Ahmed Yousry');
  });

  it('shows workspace name', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('My CRM');
  });

  it('renders stat cards', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="stat-people"]').exists()).toBe(true);
    expect(w.find('[data-test="stat-deals"]').exists()).toBe(true);
    expect(w.find('[data-test="stat-companies"]').exists()).toBe(true);
    expect(w.find('[data-test="stat-activities"]').exists()).toBe(true);
  });

  it('shows stat values after loading', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="stat-people"]').text()).toContain('25');
  });

  it('fetches stats from API on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('/people', expect.objectContaining({ params: { limit: 0 } }));
    expect(mockGet).toHaveBeenCalledWith('/deals', expect.objectContaining({ params: { limit: 0 } }));
  });
});
