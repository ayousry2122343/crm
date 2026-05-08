import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import MentionInput from './MentionInput.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockUsersList = vi.fn();

vi.mock('@/api/users', () => ({
  usersApi: {
    list: (...args: unknown[]) => mockUsersList(...args),
  },
}));

function createWrapper(props: Record<string, unknown> = {}) {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(MentionInput, {
    props: { modelValue: '', ...props },
    global: { plugins: [i18n, PrimeVue] },
  });
}

describe('MentionInput.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersList.mockResolvedValue({
      members: [
        { id: 'u1', fullName: 'Ahmed Yousry', email: 'ahmed@test.com' },
        { id: 'u2', fullName: 'Sara Mohamed', email: 'sara@test.com' },
      ],
    });
  });

  it('renders the mention input container', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="mention-input"]').exists()).toBe(true);
  });

  it('renders a textarea', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="comment-textarea"]').exists()).toBe(true);
  });

  it('emits update:modelValue on input', async () => {
    const w = createWrapper();
    await flushPromises();
    const textarea = w.find('textarea');
    await textarea.setValue('Hello');
    expect(w.emitted('update:modelValue')).toBeTruthy();
  });

  it('loads users on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockUsersList).toHaveBeenCalled();
  });
});
