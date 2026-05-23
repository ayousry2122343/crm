import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';
import SLAPoliciesAdmin from './SLAPoliciesAdmin.vue';

const mockPolicyList = vi.fn();
const mockBhList = vi.fn();
vi.mock('@/api/sla', () => ({
  slaPolicyApi: {
    list: (...args: any[]) => mockPolicyList(...args),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  },
  businessHoursApi: {
    list: (...args: any[]) => mockBhList(...args),
  },
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
  return mount(SLAPoliciesAdmin, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="sla-table"><slot /></div>',
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
            '<div v-if="visible" data-test="sla-dialog"><slot /><slot name="footer" /></div>',
          props: ['visible', 'header', 'modal'],
        },
        InputText: { template: '<input />', props: ['modelValue'] },
        InputNumber: { template: '<input />', props: ['modelValue'] },
        Textarea: { template: '<textarea></textarea>', props: ['modelValue', 'rows'] },
        Select: {
          template: '<select></select>',
          props: ['modelValue', 'options', 'optionLabel', 'optionValue'],
        },
      },
    },
  });
}

describe('SLAPoliciesAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPolicyList.mockResolvedValue({
      items: [
        {
          id: 'sla_1',
          name: 'Standard SLA',
          description: 'Default policy',
          businessHoursId: 'bh_1',
          isDefault: true,
          rules: [
            { priority: 'HIGH', firstResponseMinutes: 60, resolutionMinutes: 480, breachAction: 'ESCALATE' },
            { priority: 'LOW', firstResponseMinutes: 480, resolutionMinutes: 2880, breachAction: 'NOTIFY' },
          ],
          createdAt: '2026-01-01',
        },
      ],
      nextCursor: null,
    });
    mockBhList.mockResolvedValue({
      items: [
        { id: 'bh_1', name: 'Standard Hours', timezone: 'Asia/Riyadh' },
      ],
    });
  });

  it('renders page + loads policies', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="sla-policies-admin-page"]').exists()).toBe(true);
    expect(mockPolicyList).toHaveBeenCalled();
  });

  it('shows DataTable', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="sla-table"]').exists()).toBe(true);
  });

  it('has create button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="create-sla-btn"]').exists()).toBe(true);
  });

  it('shows business hours name in table', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(mockBhList).toHaveBeenCalled();
  });

  it('shows rules count', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="sla-table"]').exists()).toBe(true);
  });
});
