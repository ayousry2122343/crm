import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import PasswordResetConfirm from './PasswordResetConfirm.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockConfirmPasswordReset = vi.fn();
const mockPush = vi.fn();

vi.mock('@/pinia/auth.store', () => ({
  useAuthStore: () => ({ confirmPasswordReset: mockConfirmPasswordReset }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ query: { token: 'test-token-123' } }),
}));

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(PasswordResetConfirm, {
    global: { plugins: [i18n, PrimeVue] },
  });
}

describe('PasswordResetConfirm.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmPasswordReset.mockResolvedValue({});
  });

  it('renders new password input', () => {
    const w = createWrapper();
    expect(w.find('[data-test="password"]').exists()).toBe(true);
  });

  it('renders a submit button', () => {
    const w = createWrapper();
    expect(w.find('[data-test="submit"]').exists()).toBe(true);
  });

  it('calls confirmPasswordReset on submit', async () => {
    const w = createWrapper();
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(mockConfirmPasswordReset).toHaveBeenCalledWith({
      token: 'test-token-123',
      newPassword: '',
    });
  });

  it('shows error on failure', async () => {
    mockConfirmPasswordReset.mockRejectedValue({ message: 'Token expired' });
    const w = createWrapper();
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.text()).toContain('Token expired');
  });
});
