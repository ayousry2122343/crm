import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import EmailAccounts from './EmailAccounts.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

vi.mock('@/api/email-sync', () => ({
  emailSyncApi: {
    listAccounts: (...args: unknown[]) => mockList(...args),
    connectAccount: (...args: unknown[]) => mockConnect(...args),
    disconnectAccount: (...args: unknown[]) => mockDisconnect(...args),
  },
}));

const accounts = [
  { id: 'ea_1', emailAddress: 'test@gmail.com', provider: 'GMAIL', syncState: 'IDLE', lastSyncAt: null },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(EmailAccounts, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: { template: '<div data-test="accounts-table"><slot /></div>', props: ['value'] },
        Column: { template: '<div></div>', props: ['field', 'header'] },
        Dialog: { template: '<div v-if="$attrs.visible"><slot /><slot name="footer" /></div>', props: ['visible', 'header', 'modal'] },
        InputText: true,
        Select: true,
        Tag: { template: '<span>{{ $attrs.value }}</span>', props: ['value', 'severity'] },
        Button: { template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>', props: ['label', 'icon', 'severity', 'size', 'text'] },
      },
    },
  });
}

describe('EmailAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(accounts);
  });

  it('loads accounts on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders the page', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="email-accounts-page"]').exists()).toBe(true);
  });

  it('has a connect button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="connect-btn"]').exists()).toBe(true);
  });

  it('renders the accounts table', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="accounts-table"]').exists()).toBe(true);
  });
});
