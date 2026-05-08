import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import CampaignsIndex from './CampaignsIndex.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/campaigns', () => ({
  campaignsApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: {}, query: {} }),
}));

const campaigns = [
  {
    id: 'c_1',
    name: 'Welcome Campaign',
    subject: 'Welcome!',
    status: 'DRAFT',
    totalRecipients: 100,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    unsubscribed: 0,
    createdAt: '2025-01-01',
  },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(CampaignsIndex, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="campaigns-table"><slot /></div>',
          props: ['value', 'loading'],
        },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Dialog: {
          template: '<div v-if="$attrs.visible"><slot /></div>',
          props: ['visible', 'header', 'modal'],
        },
        InputText: { template: '<input />', props: ['modelValue', 'placeholder'] },
        Button: {
          template:
            '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'loading', 'severity', 'size'],
        },
      },
    },
  });
}

describe('CampaignsIndex', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: campaigns });
  });

  it('loads campaigns on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders campaigns list page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="campaigns-list-page"]').exists()).toBe(true);
  });

  it('has add campaign button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-campaign-btn"]').exists()).toBe(true);
  });

  it('renders the campaigns table', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="campaigns-table"]').exists()).toBe(true);
  });
});
