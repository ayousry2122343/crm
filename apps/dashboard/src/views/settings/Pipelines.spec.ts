import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import Pipelines from './Pipelines.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/api/pipelines', () => ({
  pipelinesApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

const pipelines = [
  {
    id: 'p1',
    name: 'Sales',
    entityType: 'Deal',
    isDefault: true,
    stages: [
      { id: 's1', name: 'Lead', order: 0, probability: 10, color: '#3b82f6' },
      { id: 's2', name: 'Won', order: 1, probability: 100, color: '#22c55e', isWon: true },
    ],
  },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(Pipelines, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="pipelines-table"><slot /></div>',
          props: ['value', 'loading'],
        },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Dialog: { template: '<div v-if="$attrs.visible"><slot /></div>', props: ['visible', 'header', 'modal'] },
        InputText: true,
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: { template: '<button @click="$emit(\'click\')">{{ $attrs.label }}</button>', props: ['label', 'icon', 'loading', 'severity', 'size'] },
      },
    },
  });
}

describe('Pipelines', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: pipelines });
    mockCreate.mockResolvedValue({ id: 'p2' });
  });

  it('loads pipelines on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalledWith('Deal');
  });

  it('renders pipelines page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="pipelines-admin-page"]').exists()).toBe(true);
  });

  it('has an add pipeline button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-pipeline-btn"]').exists()).toBe(true);
  });
});
