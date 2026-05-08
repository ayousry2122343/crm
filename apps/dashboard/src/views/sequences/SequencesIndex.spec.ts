import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import SequencesIndex from './SequencesIndex.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/sequences', () => ({
  sequencesApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: {}, query: {} }),
}));

const sequences = [
  {
    id: 's_1',
    name: 'Welcome Drip',
    enabled: true,
    steps: [],
    _count: { enrollments: 5 },
    createdAt: '2025-01-01',
  },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(SequencesIndex, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="sequences-table"><slot /></div>',
          props: ['value', 'loading'],
        },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: {
          template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'loading', 'severity', 'size'],
        },
        Dialog: { template: '<div v-if="$attrs.visible" data-test="create-sequence-dialog"><slot /></div>', props: ['visible', 'header', 'modal'] },
        InputText: { template: '<input />', props: ['modelValue', 'placeholder'] },
      },
    },
  });
}

describe('SequencesIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: sequences });
  });

  it('loads sequences on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders sequences list page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="sequences-list-page"]').exists()).toBe(true);
  });

  it('has add sequence button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-sequence-btn"]').exists()).toBe(true);
  });

  it('renders the sequences table', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="sequences-table"]').exists()).toBe(true);
  });
});
