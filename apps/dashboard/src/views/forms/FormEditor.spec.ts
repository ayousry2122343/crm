import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import FormEditor from './FormEditor.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockGet = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/api/forms', () => ({
  formsApi: {
    get: (...args: unknown[]) => mockGet(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const fakeForm = {
  id: 'f1',
  name: 'Contact Us',
  slug: 'contact-us',
  isPublic: true,
  redirectUrl: '',
  fields: [
    { key: 'name', label: { ar: 'الاسم', en: 'Name' }, type: 'text', required: true },
    { key: 'email', label: { ar: 'البريد', en: 'Email' }, type: 'email', required: true },
  ],
};

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(FormEditor, {
    props: { id: 'f1' },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Select: { template: '<select />', props: ['modelValue', 'options'] },
        InputSwitch: { template: '<input type="checkbox" />', props: ['modelValue'] },
        Tag: { template: '<span>{{ value }}</span>', props: ['value'] },
      },
    },
  });
}

describe('FormEditor.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue(JSON.parse(JSON.stringify(fakeForm)));
    mockUpdate.mockResolvedValue({});
  });

  it('renders the page', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="form-editor-page"]').exists()).toBe(true);
  });

  it('loads form and renders field rows', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(mockGet).toHaveBeenCalledWith('f1');
    const fieldRows = w.findAll('[data-test="form-field-row"]');
    expect(fieldRows.length).toBe(2);
  });

  it('has add field button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="add-field-btn"]').exists()).toBe(true);
  });

  it('has save button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="save-form-btn"]').exists()).toBe(true);
  });

  it('shows form name', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Contact Us');
  });

  it('shows field type tags for each field', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('text');
    expect(w.text()).toContain('email');
  });
});
