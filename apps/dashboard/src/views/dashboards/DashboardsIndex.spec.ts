import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import DashboardsIndex from './DashboardsIndex.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/api/dashboards', () => ({
  dashboardsApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    delete: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(DashboardsIndex, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: { template: '<div data-test="dashboards-table"><slot /></div>', props: ['value', 'loading'] },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Dialog: { template: '<div v-if="$attrs.visible"><slot /></div>', props: ['visible', 'header', 'modal'] },
        InputText: true,
        Button: { template: '<button @click="$emit(\'click\')">{{ $attrs.label }}</button>', props: ['label', 'icon', 'loading', 'severity', 'size', 'text'] },
        'router-link': { template: '<a><slot /></a>', props: ['to'] },
      },
    },
  });
}

describe('DashboardsIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([]);
  });

  it('loads dashboards on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders the page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="dashboards-index-page"]').exists()).toBe(true);
  });

  it('has an add dashboard button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-dashboard-btn"]').exists()).toBe(true);
  });

  it('renders the title', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.text()).toContain('Dashboards');
  });
});
