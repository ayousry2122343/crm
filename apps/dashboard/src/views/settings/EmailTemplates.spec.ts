import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import EmailTemplates from './EmailTemplates.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/api/email-templates', () => ({
  emailTemplatesApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: vi.fn(),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

const templates = [
  { id: 't1', name: 'Welcome', subject: 'Hello {{ name }}', body: 'Body', category: 'onboarding' },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(EmailTemplates, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: { template: '<div data-test="templates-table"><slot /></div>', props: ['value', 'loading'] },
        Column: { template: '<div></div>', props: ['field', 'header', 'sortable'] },
        Dialog: { template: '<div v-if="$attrs.visible"><slot /></div>', props: ['visible', 'header', 'modal'] },
        InputText: true,
        Textarea: true,
        Button: { template: '<button @click="$emit(\'click\')">{{ $attrs.label }}</button>', props: ['label', 'icon', 'loading', 'severity', 'size', 'text'] },
      },
    },
  });
}

describe('EmailTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(templates);
  });

  it('loads templates on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders the page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="email-templates-page"]').exists()).toBe(true);
  });

  it('has an add template button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="add-template-btn"]').exists()).toBe(true);
  });
});
