import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import WonLostReasons from './WonLostReasons.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/api/won-lost-reasons', () => ({
  wonLostReasonsApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const reasons = [
  { id: 'r1', kind: 'WON', label: 'Good price', order: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
  { id: 'r2', kind: 'LOST', label: 'Too expensive', order: 0, createdAt: '2024-01-01', updatedAt: '2024-01-01' },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(WonLostReasons, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="reasons-table"><slot /></div>',
          props: ['value', 'loading'],
        },
        Column: { template: '<div><slot name="body" :data="{}" /></div>', props: ['field', 'header', 'sortable'] },
        Dialog: { template: '<div v-if="$attrs.visible"><slot /></div>', props: ['visible', 'header', 'modal'] },
        InputText: true,
        Select: true,
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: { template: '<button @click="$emit(\'click\')">{{ $attrs.label }}</button>', props: ['label', 'icon', 'loading', 'severity', 'size', 'text'] },
      },
    },
  });
}

describe('WonLostReasons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: reasons });
    mockCreate.mockResolvedValue({ id: 'r3' });
  });

  it('loads reasons on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders the page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="won-lost-reasons-page"]').exists()).toBe(true);
  });

  it('has an add reason button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-reason-btn"]').exists()).toBe(true);
  });

  it('renders the title', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.text()).toContain('Won / Lost Reasons');
  });
});
