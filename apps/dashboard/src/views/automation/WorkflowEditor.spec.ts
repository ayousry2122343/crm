import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import WorkflowEditor from './WorkflowEditor.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRuns = vi.fn();
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock('@/api/workflows', () => ({
  workflowsApi: {
    get: (...args: unknown[]) => mockGet(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    runs: (...args: unknown[]) => mockRuns(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

const workflow = {
  id: 'wf_1',
  name: 'Daily Cleanup',
  entityType: 'Deal',
  enabled: true,
  trigger: { event: 'SCHEDULED' },
  cronExpression: '0 9 * * *',
  lastRunAt: '2026-05-07T09:00:00Z',
  conditions: { op: 'AND', items: [] },
  actions: [{ type: 'UPDATE_FIELD', params: { field: 'status', value: 'STALE' } }],
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

function createWrapper(id = 'wf_1') {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(WorkflowEditor, {
    props: { id },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: { template: '<div data-test="runs-table"><slot /></div>', props: ['value'] },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: {
          template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'severity', 'size', 'text', 'loading'],
        },
        Select: { template: '<select></select>', props: ['modelValue', 'options'] },
        InputText: { template: '<input :data-test="$attrs[\'data-test\']" />', props: ['modelValue'] },
        InputSwitch: { template: '<input type="checkbox" />', props: ['modelValue'] },
      },
    },
  });
}

describe('WorkflowEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(workflow);
    mockRuns.mockResolvedValue([]);
  });

  it('loads workflow on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('wf_1');
  });

  it('renders the editor page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="workflow-editor-page"]').exists()).toBe(true);
  });

  it('renders cron expression input for scheduled workflows', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="cron-expression"]').exists()).toBe(true);
  });

  it('renders save button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="save-workflow-btn"]').exists()).toBe(true);
  });

  it('shows workflow name in heading for existing workflow', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.text()).toContain('Daily Cleanup');
  });

  it('skips load for new workflow', async () => {
    createWrapper('new');
    await flushPromises();
    expect(mockGet).not.toHaveBeenCalled();
  });
});
