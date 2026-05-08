import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import PasswordResetRequest from './PasswordResetRequest.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockRequestPasswordReset = vi.fn();

vi.mock('@/pinia/auth.store', () => ({
  useAuthStore: () => ({ requestPasswordReset: mockRequestPasswordReset }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: {} }),
}));

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(PasswordResetRequest, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: { 'router-link': { template: '<a><slot /></a>' } },
    },
  });
}

describe('PasswordResetRequest.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestPasswordReset.mockResolvedValue({});
  });

  it('renders workspace slug and email inputs', () => {
    const w = createWrapper();
    expect(w.find('[data-test="workspace-slug"]').exists()).toBe(true);
    expect(w.find('[data-test="email"]').exists()).toBe(true);
  });

  it('has a submit button', () => {
    const w = createWrapper();
    expect(w.find('[data-test="submit"]').exists()).toBe(true);
  });

  it('shows success message after submit', async () => {
    const w = createWrapper();
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(mockRequestPasswordReset).toHaveBeenCalled();
    expect(w.find('form').exists()).toBe(false);
  });

  it('shows error on failure', async () => {
    mockRequestPasswordReset.mockRejectedValue({ message: 'Not found' });
    const w = createWrapper();
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.text()).toContain('Not found');
  });

  it('has back to login link', () => {
    const w = createWrapper();
    const links = w.findAll('a');
    expect(links.length).toBeGreaterThanOrEqual(1);
  });
});
