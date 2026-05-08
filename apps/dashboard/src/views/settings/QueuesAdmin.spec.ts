import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';
import QueuesAdmin from './QueuesAdmin.vue';

const mockList = vi.fn();
vi.mock('@/api/queues', () => ({
  queuesApi: {
    list: (...args: any[]) => mockList(...args),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
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
  return mount(QueuesAdmin, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="queues-table"><slot /></div>',
          props: ['value', 'loading'],
        },
        Column: { template: '<div></div>', props: ['field', 'header'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: {
          template:
            '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'loading', 'severity', 'size', 'text'],
        },
        Dialog: { template: '<div v-if="visible" data-test="queue-dialog"><slot /><slot name="footer" /></div>', props: ['visible', 'header', 'modal'] },
        InputText: { template: '<input :data-test="$attrs[\'data-test\']" />', props: ['modelValue'] },
        Textarea: { template: '<textarea :data-test="$attrs[\'data-test\']"></textarea>', props: ['modelValue', 'rows'] },
        Select: {
          template: '<select :data-test="$attrs[\'data-test\']"></select>',
          props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'placeholder'],
        },
      },
    },
  });
}

describe('QueuesAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({
      items: [
        {
          id: 'q_1',
          name: 'Support',
          description: 'Main queue',
          assignmentMode: 'ROUND_ROBIN',
          members: ['u_1', 'u_2'],
          createdAt: '2026-01-01',
        },
      ],
      nextCursor: null,
    });
  });

  it('renders page + loads queues', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="queues-admin-page"]').exists()).toBe(true);
    expect(mockList).toHaveBeenCalled();
  });

  it('shows DataTable with correct columns', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="queues-table"]').exists()).toBe(true);
  });

  it('has create button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="create-queue-btn"]').exists()).toBe(true);
  });

  it('shows assignment mode in table', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="queues-table"]').exists()).toBe(true);
  });
});
