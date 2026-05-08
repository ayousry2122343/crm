import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import NotificationPreferences from './NotificationPreferences.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockGetPreferences = vi.fn();
const mockUpsertPreference = vi.fn();

vi.mock('@/api/notifications', () => ({
  notificationApi: {
    getPreferences: (...args: unknown[]) => mockGetPreferences(...args),
    upsertPreference: (...args: unknown[]) => mockUpsertPreference(...args),
  },
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn(), apiError: vi.fn(), warn: vi.fn() }),
}));

function makeWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, ar } });
  return mount(NotificationPreferences, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Checkbox: {
          template: '<input type="checkbox" :checked="modelValue" :data-test="$attrs[\'data-test\']" @change="$emit(\'update:modelValue\', !modelValue)" />',
          props: ['modelValue', 'binary'],
          emits: ['update:modelValue'],
        },
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPreferences.mockResolvedValue([]);
  mockUpsertPreference.mockResolvedValue({ id: 'p_1', enabled: false });
});

describe('NotificationPreferences', () => {
  it('renders preferences table', async () => {
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="notification-preferences"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="prefs-table"]').exists()).toBe(true);
  });

  it('renders a checkbox for each type-channel combination', async () => {
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="pref-IN_APP-ASSIGNMENT"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="pref-EMAIL-DEAL_WON"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="pref-EMAIL-SYSTEM"]').exists()).toBe(true);
  });

  it('loads existing preferences and reflects disabled state', async () => {
    mockGetPreferences.mockResolvedValue([
      { channel: 'EMAIL', type: 'SYSTEM', enabled: false },
    ]);
    const wrapper = makeWrapper();
    await flushPromises();
    const checkbox = wrapper.find('[data-test="pref-EMAIL-SYSTEM"]');
    expect(checkbox.exists()).toBe(true);
    expect((checkbox.element as HTMLInputElement).checked).toBe(false);
  });

  it('toggles preference and calls API', async () => {
    const wrapper = makeWrapper();
    await flushPromises();
    const checkbox = wrapper.find('[data-test="pref-EMAIL-ASSIGNMENT"]');
    await checkbox.trigger('change');
    await flushPromises();
    expect(mockUpsertPreference).toHaveBeenCalledWith({
      channel: 'EMAIL',
      type: 'ASSIGNMENT',
      enabled: false,
    });
  });
});
