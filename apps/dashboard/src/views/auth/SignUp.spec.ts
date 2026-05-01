import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createRouter, createMemoryHistory } from 'vue-router';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import SignUp from './SignUp.vue';
import ar from '../../i18n/ar.json';

vi.mock('@/pinia/auth.store', () => {
  const signUp = vi.fn();
  return {
    useAuthStore: () => ({ signUp }),
  };
});

describe('SignUp.vue', () => {
  beforeEach(() => setActivePinia(createPinia()));

  it('renders all the form fields', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/dashboard', name: 'dashboard', component: { template: '<div>D</div>' } },
        { path: '/login', name: 'login', component: { template: '<div>L</div>' } },
      ],
    });
    const i18n = createI18n({ legacy: false, locale: 'ar', messages: { ar } });
    const wrapper = mount(SignUp, {
      global: { plugins: [router, i18n, PrimeVue] },
    });
    expect(wrapper.find('[data-test="email"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="password"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="full-name"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="workspace-name"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="submit"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('إنشاء حساب جديد');
  });
});
