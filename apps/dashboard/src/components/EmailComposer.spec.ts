import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import EmailComposer from './EmailComposer.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockTemplatesList = vi.fn();
const mockSend = vi.fn();
const mockComposeEmail = vi.fn();

vi.mock('@/api/email-templates', () => ({
  emailTemplatesApi: { list: (...args: unknown[]) => mockTemplatesList(...args) },
  emailApi: { send: (...args: unknown[]) => mockSend(...args) },
}));

vi.mock('@/api/ai', () => ({
  aiApi: { composeEmail: (...args: unknown[]) => mockComposeEmail(...args) },
}));

function createWrapper(props: Record<string, unknown> = {}) {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(EmailComposer, {
    props: { visible: true, ...props },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Dialog: { template: '<div><slot /></div>', props: ['visible'] },
        Select: { template: '<select />', props: ['modelValue', 'options'], inheritAttrs: true },
      },
    },
  });
}

describe('EmailComposer.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTemplatesList.mockResolvedValue([
      { id: 't1', name: 'Welcome', subject: 'Welcome!', body: 'Hello' },
    ]);
    mockSend.mockResolvedValue({});
  });

  it('renders the composer when visible', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="email-to"]').exists()).toBe(true);
  });

  it('renders to field', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="email-to"]').exists()).toBe(true);
  });

  it('renders subject field', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="email-subject"]').exists()).toBe(true);
  });

  it('renders body field', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="email-body"]').exists()).toBe(true);
  });

  it('has send button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="send-email-btn"]').exists()).toBe(true);
  });

  it('has AI draft button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="draft-ai-btn"]').exists()).toBe(true);
  });

  it('renders template selector', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="email-template-select"]').exists()).toBe(true);
  });

  it('loads templates on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockTemplatesList).toHaveBeenCalled();
  });
});
