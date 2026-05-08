import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import SequenceDetail from './SequenceDetail.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/sequences', () => ({
  sequencesApi: {
    get: (...args: unknown[]) => mockGet(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: { id: 's_1' }, query: {} }),
}));

const sequence = {
  id: 's_1',
  name: 'Welcome Drip',
  enabled: true,
  steps: [
    { action: 'send_email', delay: 1, delayUnit: 'days' },
    { action: 'send_email', delay: 3, delayUnit: 'days' },
  ],
  enrollments: [
    { id: 'e_1', personId: 'p_1', currentStep: 0, status: 'ACTIVE', person: { fullName: 'Ahmed' }, createdAt: '2025-01-01' },
  ],
  _count: { enrollments: 1 },
  createdAt: '2025-01-01',
};

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(SequenceDetail, {
    props: { id: 's_1' },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="enrollments-table"><slot /></div>',
          props: ['value'],
        },
        Column: { template: '<div></div>', props: ['field', 'header'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: {
          template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'severity', 'size', 'text', 'rounded'],
        },
        Select: { template: '<select></select>', props: ['modelValue', 'options'] },
        InputNumber: { template: '<input type="number" />', props: ['modelValue', 'min'] },
        InputText: { template: '<input />', props: ['modelValue'] },
      },
    },
  });
}

describe('SequenceDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(sequence);
  });

  it('loads sequence on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('s_1');
  });

  it('renders sequence detail page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="sequence-detail-page"]').exists()).toBe(true);
  });

  it('shows sequence name', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="sequence-name"]').text()).toBe('Welcome Drip');
  });

  it('shows toggle enabled button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="toggle-enabled-btn"]').exists()).toBe(true);
  });
});
