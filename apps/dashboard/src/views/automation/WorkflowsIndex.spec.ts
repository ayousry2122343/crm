import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import WorkflowsIndex from './WorkflowsIndex.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();

vi.mock('@/api/workflows', () => ({
  workflowsApi: {
    list: (...args: unknown[]) => mockList(...args),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(WorkflowsIndex, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: { template: '<div data-test="workflows-table"><slot /></div>', props: ['value', 'loading'] },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Tag: true,
        Button: { template: '<button @click="$emit(\'click\')">{{ $attrs.label }}</button>', props: ['label', 'icon', 'loading', 'severity', 'size', 'text'] },
        'router-link': { template: '<a><slot /></a>', props: ['to'] },
      },
    },
  });
}

describe('WorkflowsIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

  it('loads workflows on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders the page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="workflows-index-page"]').exists()).toBe(true);
  });

  it('has an add workflow button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-workflow-btn"]').exists()).toBe(true);
  });

  it('renders the title', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.text()).toContain('Workflows');
  });
});
