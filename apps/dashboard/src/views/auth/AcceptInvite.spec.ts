import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import AcceptInvite from './AcceptInvite.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockAcceptInvite = vi.fn();
const mockSetAuth = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/users', () => ({
  usersApi: { acceptInvite: (...args: unknown[]) => mockAcceptInvite(...args) },
}));

vi.mock('@/pinia/auth.store', () => ({
  useAuthStore: () => ({ setAuthFromTokens: mockSetAuth }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ query: { token: 'invite-token-abc' } }),
}));

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(AcceptInvite, {
    global: { plugins: [i18n, PrimeVue] },
  });
}

describe('AcceptInvite.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAcceptInvite.mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
  });

  it('renders password input', () => {
    const w = createWrapper();
    expect(w.find('[data-test="password"]').exists()).toBe(true);
  });

  it('has a submit button', () => {
    const w = createWrapper();
    expect(w.find('[data-test="submit"]').exists()).toBe(true);
  });

  it('calls acceptInvite and navigates to dashboard on success', async () => {
    const w = createWrapper();
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(mockAcceptInvite).toHaveBeenCalledWith({ token: 'invite-token-abc', password: '' });
    expect(mockSetAuth).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' });
  });

  it('shows error on failure', async () => {
    mockAcceptInvite.mockRejectedValue({ message: 'Invalid invite' });
    const w = createWrapper();
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.text()).toContain('Invalid invite');
  });
});
