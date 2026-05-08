import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import PortalSettings from './PortalSettings.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockGetSettings = vi.fn();
const mockUpdateSettings = vi.fn();

vi.mock('@/api/portal', () => ({
  portalApi: {
    getSettings: (...args: unknown[]) => mockGetSettings(...args),
    updateSettings: (...args: unknown[]) => mockUpdateSettings(...args),
  },
}));

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(PortalSettings, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Button: { template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>', props: ['label', 'loading'] },
        InputText: { template: '<input :data-test="$attrs[\'data-test\']" />', props: ['modelValue'] },
        InputSwitch: { template: '<div :data-test="$attrs[\'data-test\']" />', props: ['modelValue'] },
      },
    },
  });
}

describe('PortalSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue({ id: 'pt_1', enabled: true, domain: 'portal.example.com' });
  });

  it('loads portal settings on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockGetSettings).toHaveBeenCalled();
  });

  it('renders the page', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="portal-settings-page"]').exists()).toBe(true);
  });

  it('has a save button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="save-portal-btn"]').exists()).toBe(true);
  });

  it('shows enabled toggle and domain input', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="portal-enabled"]').exists()).toBe(true);
    expect(w.find('[data-test="portal-domain"]').exists()).toBe(true);
  });
});
