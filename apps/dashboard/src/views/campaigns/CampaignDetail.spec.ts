import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import CampaignDetail from './CampaignDetail.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockGet = vi.fn();
const mockRecipients = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/campaigns', () => ({
  campaignsApi: {
    get: (...args: unknown[]) => mockGet(...args),
    recipients: (...args: unknown[]) => mockRecipients(...args),
    send: vi.fn(),
    pause: vi.fn(),
    archive: vi.fn(),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: { id: 'c_1' }, query: {} }),
}));

const campaign = {
  id: 'c_1',
  name: 'Welcome Campaign',
  subject: 'Welcome!',
  status: 'DRAFT',
  totalRecipients: 100,
  delivered: 80,
  opened: 50,
  clicked: 20,
  bounced: 5,
  unsubscribed: 2,
  createdAt: '2025-01-01',
};

const recipients = [
  { id: 'r_1', email: 'test@example.com', status: 'SENT', sentAt: '2025-01-01', openedAt: null },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(CampaignDetail, {
    props: { id: 'c_1' },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="recipients-table"><slot /></div>',
          props: ['value'],
        },
        Column: { template: '<div></div>', props: ['field', 'header'] },
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: {
          template:
            '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'severity', 'size', 'text', 'rounded'],
        },
      },
    },
  });
}

describe('CampaignDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(campaign);
    mockRecipients.mockResolvedValue({ items: recipients });
  });

  it('loads campaign on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('c_1');
  });

  it('renders campaign detail page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="campaign-detail-page"]').exists()).toBe(true);
  });

  it('shows campaign name', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="campaign-name"]').text()).toBe('Welcome Campaign');
  });

  it('shows recipients table', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="recipients-table"]').exists()).toBe(true);
  });
});
