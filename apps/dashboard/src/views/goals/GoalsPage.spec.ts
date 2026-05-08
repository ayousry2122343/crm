import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import GoalsPage from './GoalsPage.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/api/goals', () => ({
  goalsApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ params: {}, query: {} }),
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

const goals = [
  {
    id: 'g_1',
    name: 'Q2 Revenue',
    metric: 'REVENUE',
    targetValue: 100000,
    currentValue: 55000,
    period: '2026-Q2',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    owner: { id: 'u_1', fullName: 'Ahmed' },
    team: null,
    status: 'ON_TRACK',
    createdAt: '2026-04-01',
  },
  {
    id: 'g_2',
    name: 'Deal Count May',
    metric: 'DEAL_COUNT',
    targetValue: 50,
    currentValue: 10,
    period: '2026-05',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    owner: null,
    team: { id: 't_1', name: 'Sales' },
    status: 'BEHIND',
    createdAt: '2026-05-01',
  },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(GoalsPage, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Button: {
          template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'severity', 'size'],
        },
        Tag: { template: '<span data-test="goal-status">{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Dialog: {
          template: '<div v-if="visible" data-test="create-goal-dialog"><slot /></div>',
          props: ['visible', 'header', 'modal'],
        },
        InputText: { template: '<input :data-test="$attrs[\'data-test\']" />', props: ['modelValue', 'placeholder', 'type'] },
        InputNumber: { template: '<input :data-test="$attrs[\'data-test\']" />', props: ['modelValue', 'placeholder'] },
        Select: { template: '<select :data-test="$attrs[\'data-test\']"></select>', props: ['modelValue', 'options'] },
        ProgressBar: { template: '<div data-test="goal-progress"></div>', props: ['value'] },
      },
    },
  });
}

describe('GoalsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: goals });
  });

  it('renders the goals page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="goals-page"]').exists()).toBe(true);
  });

  it('loads goals on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders goal cards', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.findAll('[data-test="goal-card"]')).toHaveLength(2);
  });

  it('shows status filter tabs', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="status-tabs"]').exists()).toBe(true);
  });

  it('has create goal button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="create-goal-btn"]').exists()).toBe(true);
  });

  it('renders progress bars', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.findAll('[data-test="goal-progress"]')).toHaveLength(2);
  });

  it('renders status badges', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.findAll('[data-test="goal-status"]')).toHaveLength(2);
  });

  it('shows no goals message when empty', async () => {
    mockList.mockResolvedValue({ items: [] });
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="no-goals"]').exists()).toBe(true);
  });
});
