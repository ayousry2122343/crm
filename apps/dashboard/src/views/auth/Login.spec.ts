import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import Login from './Login.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockLogin = vi.fn();
const mockPush = vi.fn();

vi.mock('@/pinia/auth.store', () => ({
  useAuthStore: () => ({ login: mockLogin }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: {} }),
}));

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(Login, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        'router-link': { template: '<a><slot /></a>' },
      },
    },
  });
}

describe('Login.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLogin.mockResolvedValue({});
  });

  it('renders the login form with workspace slug, email and password inputs', () => {
    const w = createWrapper();
    expect(w.find('[data-test="workspace-slug"]').exists()).toBe(true);
    expect(w.find('[data-test="email"]').exists()).toBe(true);
    expect(w.find('[data-test="password"]').exists()).toBe(true);
  });

  it('renders a submit button', () => {
    const w = createWrapper();
    expect(w.find('[data-test="submit"]').exists()).toBe(true);
  });

  it('navigates to dashboard on successful login', async () => {
    const w = createWrapper();
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(mockLogin).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' });
  });

  it('shows error message on failed login', async () => {
    mockLogin.mockRejectedValue({ response: { data: { message: 'Invalid credentials' } } });
    const w = createWrapper();
    await w.find('form').trigger('submit');
    await flushPromises();
    expect(w.text()).toContain('Invalid credentials');
  });

  it('renders forgot password and sign-up links', () => {
    const w = createWrapper();
    const links = w.findAll('a');
    expect(links.length).toBeGreaterThanOrEqual(2);
  });
});
