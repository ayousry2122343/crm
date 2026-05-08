import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import CopilotSidebar from './CopilotSidebar.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockChat = vi.fn();

vi.mock('@/api/copilot', () => ({
  copilotApi: {
    chat: (...args: unknown[]) => mockChat(...args),
  },
}));

function createWrapper(props = {}) {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(CopilotSidebar, {
    props: { visible: true, ...props },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Sidebar: { template: '<div v-if="visible" data-test="copilot-sidebar"><slot name="header" /><slot /></div>', props: ['visible', 'position'] },
        Button: { template: '<button @click="$emit(\'click\')" :data-test="$attrs[\'data-test\']">{{ $attrs.label }}</button>', props: ['label', 'icon', 'severity', 'size', 'text', 'outlined', 'loading', 'title'] },
        InputText: { template: '<input :data-test="$attrs[\'data-test\']" />', props: ['modelValue', 'placeholder', 'size'] },
      },
    },
  });
}

describe('CopilotSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChat.mockResolvedValue({ reply: 'Hello from AI', suggestedPrompts: ['Next question'] });
  });

  it('renders the sidebar', () => {
    const w = createWrapper();
    expect(w.find('[data-test="copilot-sidebar"]').exists()).toBe(true);
  });

  it('shows suggested prompts initially', () => {
    const w = createWrapper();
    expect(w.find('[data-test="suggested-prompts"]').exists()).toBe(true);
  });

  it('has an input field and send button', () => {
    const w = createWrapper();
    expect(w.find('[data-test="copilot-input"]').exists()).toBe(true);
    expect(w.find('[data-test="copilot-send"]').exists()).toBe(true);
  });

  it('shows chat messages area', () => {
    const w = createWrapper();
    expect(w.find('[data-test="chat-messages"]').exists()).toBe(true);
  });
});
