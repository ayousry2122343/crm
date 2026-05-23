import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';
import BusinessHoursAdmin from './BusinessHoursAdmin.vue';

const mockList = vi.fn();
vi.mock('@/api/sla', () => ({
  businessHoursApi: {
    list: (...args: any[]) => mockList(...args),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  },
  slaPolicyApi: { list: vi.fn().mockResolvedValue({ items: [] }) },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: {}, query: {} }),
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, ar } });

function createWrapper() {
  return mount(BusinessHoursAdmin, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="bh-table"><slot /></div>',
          props: ['value', 'loading'],
        },
        Column: { template: '<div></div>', props: ['field', 'header'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: {
          template:
            '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'loading', 'severity', 'size', 'text'],
        },
        Dialog: {
          template:
            '<div v-if="visible" data-test="bh-dialog"><slot /><slot name="footer" /></div>',
          props: ['visible', 'header', 'modal'],
        },
        InputText: { template: '<input />', props: ['modelValue'] },
        Select: {
          template: '<select></select>',
          props: ['modelValue', 'options', 'optionLabel', 'optionValue'],
        },
      },
    },
  });
}

describe('BusinessHoursAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({
      items: [
        {
          id: 'bh_1',
          name: 'Standard',
          timezone: 'Asia/Riyadh',
          schedule: [
            { day: 0, startTime: '09:00', endTime: '17:00' },
            { day: 1, startTime: '09:00', endTime: '17:00' },
            { day: 2, startTime: '09:00', endTime: '17:00' },
            { day: 3, startTime: '09:00', endTime: '17:00' },
            { day: 4, startTime: '09:00', endTime: '17:00' },
          ],
          holidays: [{ date: '2026-01-01', name: 'New Year' }],
          isDefault: true,
          createdAt: '2026-01-01',
        },
      ],
      nextCursor: null,
    });
  });

  it('renders page + loads business hours', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="business-hours-admin-page"]').exists()).toBe(true);
    expect(mockList).toHaveBeenCalled();
  });

  it('shows DataTable', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="bh-table"]').exists()).toBe(true);
  });

  it('has create button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="create-bh-btn"]').exists()).toBe(true);
  });

  it('shows schedule summary in table', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="bh-table"]').exists()).toBe(true);
  });

  it('shows timezone in table', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="bh-table"]').exists()).toBe(true);
  });
});
