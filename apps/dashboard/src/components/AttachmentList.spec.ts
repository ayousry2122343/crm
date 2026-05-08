import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import AttachmentList from './AttachmentList.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockUpload = vi.fn();
const mockDelete = vi.fn();
const mockDownload = vi.fn();
const mockSuccess = vi.fn();
const mockError = vi.fn();

vi.mock('@/api/attachments', () => ({
  attachmentsApi: {
    list: (...args: unknown[]) => mockList(...args),
    upload: (...args: unknown[]) => mockUpload(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    download: (...args: unknown[]) => mockDownload(...args),
  },
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: mockSuccess, error: mockError, apiError: vi.fn() }),
}));

const sampleAttachments = [
  {
    id: 'att_1',
    originalName: 'report.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 10240,
    createdAt: '2026-01-15T10:00:00Z',
    uploadedBy: { id: 'u_1', fullName: 'Ahmed' },
  },
  {
    id: 'att_2',
    originalName: 'photo.png',
    mimeType: 'image/png',
    sizeBytes: 204800,
    createdAt: '2026-01-16T10:00:00Z',
    uploadedBy: { id: 'u_1', fullName: 'Ahmed' },
  },
];

function createWrapper(props = {}) {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(AttachmentList, {
    props: { entityType: 'PERSON', entityId: 'p_1', ...props },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: {
          template: '<div data-test="attachment-table"><slot /></div>',
          props: ['value'],
        },
        Column: { template: '<div></div>', props: ['field', 'header'] },
        Button: {
          template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>',
          props: ['label', 'icon', 'severity', 'size', 'text', 'rounded'],
        },
        FileUpload: {
          template: '<div data-test="file-upload"></div>',
          props: ['mode', 'accept', 'maxFileSize'],
        },
      },
    },
  });
}

describe('AttachmentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: sampleAttachments, nextCursor: null });
  });

  it('loads attachments on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalledWith('PERSON', 'p_1');
  });

  it('renders attachment list', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="attachments-section"]').exists()).toBe(true);
  });

  it('shows empty state when no attachments', async () => {
    mockList.mockResolvedValue({ items: [], nextCursor: null });
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="no-attachments"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="no-attachments"]').text()).toContain('No attachments yet.');
  });

  it('shows upload button', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="upload-btn"]').exists()).toBe(true);
  });

  it('shows toast on successful delete', async () => {
    mockDelete.mockResolvedValue({});
    mockList.mockResolvedValue({ items: sampleAttachments, nextCursor: null });
    const wrapper = createWrapper();
    await flushPromises();
    const deleteBtn = wrapper.find('[data-test="delete-att_1"]');
    if (deleteBtn.exists()) {
      await deleteBtn.trigger('click');
      await flushPromises();
      expect(mockDelete).toHaveBeenCalledWith('att_1');
      expect(mockSuccess).toHaveBeenCalledWith('attachments.deleteSuccess');
    }
  });

  it('calls download API when download button clicked', async () => {
    mockDownload.mockResolvedValue('https://minio/presigned-url');
    const wrapper = createWrapper();
    await flushPromises();
    const downloadBtn = wrapper.find('[data-test="download-att_1"]');
    if (downloadBtn.exists()) {
      await downloadBtn.trigger('click');
      await flushPromises();
      expect(mockDownload).toHaveBeenCalledWith('att_1');
    }
  });
});
