import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import ImportDialog from './ImportDialog.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockPreview = vi.fn();
const mockImportPeople = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();

vi.mock('@/api/import-export', () => ({
  importExportApi: {
    preview: (...args: unknown[]) => mockPreview(...args),
    importPeople: (...args: unknown[]) => mockImportPeople(...args),
    exportPeople: vi.fn(),
    exportDeals: vi.fn(),
  },
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: mockSuccess, error: mockError, apiError: vi.fn(), warn: vi.fn() }),
}));

const previewResult = {
  headers: ['First Name', 'Last Name', 'Email', 'Phone'],
  rows: [
    { 'First Name': 'Alice', 'Last Name': 'Smith', 'Email': 'alice@example.com', 'Phone': '555-0001' },
    { 'First Name': 'Bob', 'Last Name': 'Jones', 'Email': 'bob@example.com', 'Phone': '555-0002' },
  ],
};

const importResult = {
  totalRows: 2,
  successCount: 2,
  errorCount: 0,
  errors: [],
};

function makeWrapper(visible = true) {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, ar } });
  return mount(ImportDialog, {
    props: { visible },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        teleport: true,
        Dialog: {
          template: '<div v-if="visible" data-test="dialog-wrapper"><slot /></div>',
          props: ['visible', 'header', 'modal', 'closable'],
          emits: ['update:visible', 'hide'],
        },
        Select: {
          template: '<select :data-test="$attrs[\'data-test\']" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="o in options" :key="o.value" :value="o.value">{{ o.label }}</option></select>',
          props: ['modelValue', 'options', 'optionLabel', 'optionValue', 'placeholder'],
          emits: ['update:modelValue'],
        },
        ProgressBar: { template: '<div data-test="progress-bar" />' },
      },
    },
  });
}

describe('ImportDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPreview.mockResolvedValue(previewResult);
    mockImportPeople.mockResolvedValue(importResult);
  });

  it('shows upload step when opened', () => {
    const w = makeWrapper();
    expect(w.find('[data-test="step-upload"]').exists()).toBe(true);
    expect(w.find('[data-test="step-mapping"]').exists()).toBe(false);
  });

  it('next button is disabled when no file selected', () => {
    const w = makeWrapper();
    const btn = w.find('[data-test="next-btn"]');
    expect(btn.attributes('disabled')).toBeDefined();
  });

  it('advances to mapping step after file upload', async () => {
    const w = makeWrapper();

    const input = w.find('[data-test="file-input"]');
    const testFile = new File(['a,b\n1,2'], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(input.element, 'files', { value: [testFile] });
    await input.trigger('change');

    expect(w.find('[data-test="file-name"]').text()).toBe('test.csv');

    await w.find('[data-test="next-btn"]').trigger('click');
    await flushPromises();

    expect(mockPreview).toHaveBeenCalledWith(testFile);
    expect(w.find('[data-test="step-mapping"]').exists()).toBe(true);
    expect(w.find('[data-test="preview-table"]').exists()).toBe(true);
  });

  it('auto-maps columns with matching names', async () => {
    const w = makeWrapper();
    const input = w.find('[data-test="file-input"]');
    const testFile = new File(['x'], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(input.element, 'files', { value: [testFile] });
    await input.trigger('change');
    await w.find('[data-test="next-btn"]').trigger('click');
    await flushPromises();

    const emailSelect = w.find('[data-test="select-email"]');
    expect(emailSelect.exists()).toBe(true);
  });

  it('runs import and shows results', async () => {
    const w = makeWrapper();

    const input = w.find('[data-test="file-input"]');
    const testFile = new File(['x'], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(input.element, 'files', { value: [testFile] });
    await input.trigger('change');
    await w.find('[data-test="next-btn"]').trigger('click');
    await flushPromises();

    await w.find('[data-test="import-btn"]').trigger('click');
    await flushPromises();

    expect(mockImportPeople).toHaveBeenCalled();
    expect(w.find('[data-test="step-result"]').exists()).toBe(true);
    expect(w.find('[data-test="no-errors"]').exists()).toBe(true);
  });

  it('shows error table when import has errors', async () => {
    mockImportPeople.mockResolvedValue({
      totalRows: 3,
      successCount: 1,
      errorCount: 2,
      errors: [
        { row: 2, message: 'Invalid email' },
        { row: 3, message: 'Duplicate' },
      ],
    });

    const w = makeWrapper();
    const input = w.find('[data-test="file-input"]');
    const testFile = new File(['x'], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(input.element, 'files', { value: [testFile] });
    await input.trigger('change');
    await w.find('[data-test="next-btn"]').trigger('click');
    await flushPromises();

    await w.find('[data-test="import-btn"]').trigger('click');
    await flushPromises();

    expect(w.find('[data-test="error-table"]').exists()).toBe(true);
    expect(w.find('[data-test="no-errors"]').exists()).toBe(false);
  });

  it('emits imported event on successful import', async () => {
    const w = makeWrapper();
    const input = w.find('[data-test="file-input"]');
    const testFile = new File(['x'], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(input.element, 'files', { value: [testFile] });
    await input.trigger('change');
    await w.find('[data-test="next-btn"]').trigger('click');
    await flushPromises();

    await w.find('[data-test="import-btn"]').trigger('click');
    await flushPromises();

    expect(w.emitted('imported')).toBeTruthy();
  });

  it('resets to upload step when import another is clicked', async () => {
    const w = makeWrapper();
    const input = w.find('[data-test="file-input"]');
    const testFile = new File(['x'], 'test.csv', { type: 'text/csv' });
    Object.defineProperty(input.element, 'files', { value: [testFile] });
    await input.trigger('change');
    await w.find('[data-test="next-btn"]').trigger('click');
    await flushPromises();
    await w.find('[data-test="import-btn"]').trigger('click');
    await flushPromises();

    await w.find('[data-test="import-another-btn"]').trigger('click');
    await flushPromises();

    expect(w.find('[data-test="step-upload"]').exists()).toBe(true);
  });
});
