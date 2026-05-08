import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import CustomFields from './CustomFields.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockListFields = vi.fn();
const mockCreateField = vi.fn();
const mockUpdateField = vi.fn();
const mockArchiveField = vi.fn();

vi.mock('@/api/custom-fields', () => ({
  customFieldsApi: {
    list: (...args: unknown[]) => mockListFields(...args),
    create: (...args: unknown[]) => mockCreateField(...args),
    update: (...args: unknown[]) => mockUpdateField(...args),
    archive: (...args: unknown[]) => mockArchiveField(...args),
  },
}));

vi.mock('@/composables/useMetadata', () => ({
  invalidateMetadata: vi.fn(),
}));

const fakeFields = [
  { id: 'cf1', entityType: 'Person', key: 'industry', label: { ar: 'صناعة', en: 'Industry' }, type: 'TEXT', required: false, indexed: false },
  { id: 'cf2', entityType: 'Person', key: 'source', label: { ar: 'مصدر', en: 'Source' }, type: 'SELECT', required: true, indexed: true },
];

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(CustomFields, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Select: { template: '<select />', props: ['modelValue', 'options'] },
        DataTable: { template: '<div><slot /></div>', props: ['value', 'loading'] },
        Column: { template: '<div />' },
        Dialog: { template: '<div v-if="visible"><slot /></div>', props: ['visible'] },
        CustomFieldEditor: { template: '<div data-test="cf-editor-stub" />' },
      },
    },
  });
}

describe('CustomFields.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListFields.mockResolvedValue(fakeFields);
  });

  it('renders the page title', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Custom fields');
  });

  it('shows entity type selector', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="cf-entity-type"]').exists()).toBe(true);
  });

  it('has add custom field button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="add-custom-field"]').exists()).toBe(true);
  });

  it('loads fields on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockListFields).toHaveBeenCalledWith('Person');
  });
});
