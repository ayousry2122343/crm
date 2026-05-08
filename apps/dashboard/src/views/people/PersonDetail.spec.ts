import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import PersonDetail from './PersonDetail.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockGet = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/api/people', () => ({
  peopleApi: {
    get: (...args: unknown[]) => mockGet(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock('@/api/email-sync', () => ({
  emailSyncApi: {
    threadsForPerson: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/api/attachments', () => ({
  attachmentsApi: {
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn(), apiError: vi.fn() }),
}));

vi.mock('@/composables/useMetadata', () => ({
  useMetadata: () => ({
    data: { value: { entityType: 'Person', fields: [] } },
    loading: { value: false },
    error: { value: null },
    refetch: vi.fn(),
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const fakePerson = {
  id: 'p1',
  fullName: 'Ahmed Yousry',
  companyName: null,
  email: 'ahmed@test.com',
  phone: '+201234567890',
  lifecycleStage: 'LEAD',
  isCompany: false,
  industry: null,
  customFields: { favorite_color: 'blue' },
  createdAt: '2026-01-01T00:00:00.000Z',
};

function createWrapper(props = {}) {
  const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: { ar, en },
  });

  return mount(PersonDetail, {
    props: { id: 'p1', ...props },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DynamicForm: { template: '<div data-test="dynamic-form-stub" />' },
        Dialog: {
          template: '<div v-if="visible"><slot /></div>',
          props: ['visible'],
        },
        TabView: { template: '<div data-test="tabs"><slot /></div>' },
        TabPanel: {
          template: '<div><slot /></div>',
          props: ['header', 'value'],
        },
      },
    },
  });
}

describe('PersonDetail.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(fakePerson);
    mockUpdate.mockResolvedValue({ ...fakePerson, fullName: 'Updated' });
  });

  it('loads person on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('p1');
  });

  it('displays person name in header', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="display-name"]').text()).toBe('Ahmed Yousry');
  });

  it('displays initials in avatar', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="avatar"]').text()).toBe('AY');
  });

  it('shows email and phone in header', async () => {
    const w = createWrapper();
    await flushPromises();
    const header = w.find('[data-test="record-header"]');
    expect(header.text()).toContain('ahmed@test.com');
    expect(header.text()).toContain('+201234567890');
  });

  it('renders overview tab with person fields', async () => {
    const w = createWrapper();
    await flushPromises();
    const overview = w.find('[data-test="overview-tab"]');
    expect(overview.exists()).toBe(true);
    expect(overview.text()).toContain('Ahmed Yousry');
    expect(overview.text()).toContain('LEAD');
  });

  it('shows custom fields in overview', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('favorite_color');
    expect(w.text()).toContain('blue');
  });

  it('renders activities placeholder tab', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="activities-tab"]').text()).toContain('No activities yet');
  });

  it('shows employees tab for companies', async () => {
    mockGet.mockResolvedValue({
      ...fakePerson,
      isCompany: true,
      companyName: 'Acme Corp',
    });
    const w = createWrapper({ isCompany: true });
    await flushPromises();
    expect(w.find('[data-test="employees-tab"]').exists()).toBe(true);
  });

  it('shows back button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="back-btn"]').exists()).toBe(true);
  });

  it('shows edit button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="edit-btn"]').exists()).toBe(true);
  });
});
