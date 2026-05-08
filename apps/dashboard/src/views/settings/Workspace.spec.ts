import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import Workspace from './Workspace.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockGet = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/api/workspace', () => ({
  workspaceApi: {
    get: (...args: unknown[]) => mockGet(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(Workspace, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Select: { template: '<select />', props: ['modelValue', 'options'] },
      },
    },
  });
}

describe('Workspace.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ name: 'My CRM', primaryLocale: 'ar', primaryCurrency: 'EGP' });
    mockUpdate.mockResolvedValue({});
  });

  it('renders workspace settings title', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Workspace');
  });

  it('loads workspace data and shows name input', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(mockGet).toHaveBeenCalled();
    expect(w.find('[data-test="ws-name"]').exists()).toBe(true);
  });

  it('shows locale selector', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="ws-locale"]').exists()).toBe(true);
  });

  it('shows currency selector', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="ws-currency"]').exists()).toBe(true);
  });

  it('has save button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="save"]').exists()).toBe(true);
  });
});
