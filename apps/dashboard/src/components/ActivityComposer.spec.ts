import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import ActivityComposer from './ActivityComposer.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockCreate = vi.fn();

vi.mock('@/api/activities', () => ({
  activitiesApi: { create: (...args: unknown[]) => mockCreate(...args) },
}));

function createWrapper(props: Record<string, unknown> = {}) {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(ActivityComposer, {
    props: { visible: true, parentEntity: 'Person', parentId: 'p1', ...props },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Dialog: { template: '<div><slot /></div>', props: ['visible'] },
        Select: { template: '<select />', props: ['modelValue', 'options'], inheritAttrs: true },
        DatePicker: { template: '<input />', props: ['modelValue'] },
      },
    },
  });
}

describe('ActivityComposer.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreate.mockResolvedValue({});
  });

  it('renders the composer when visible', () => {
    const w = createWrapper();
    expect(w.find('[data-test="activity-subject"]').exists()).toBe(true);
  });

  it('renders activity type selector', () => {
    const w = createWrapper();
    expect(w.find('[data-test="activity-type-select"]').exists()).toBe(true);
  });

  it('renders subject input', () => {
    const w = createWrapper();
    expect(w.find('[data-test="activity-subject"]').exists()).toBe(true);
  });

  it('renders body textarea', () => {
    const w = createWrapper();
    expect(w.find('[data-test="activity-body"]').exists()).toBe(true);
  });

  it('has save button', () => {
    const w = createWrapper();
    expect(w.find('[data-test="save-activity-btn"]').exists()).toBe(true);
  });
});
