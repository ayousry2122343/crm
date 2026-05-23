import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import EmailToCaseAdmin from './EmailToCaseAdmin.vue';

vi.mock('@/api/email-to-case', () => ({
  emailToCaseApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: 'cfg-1',
        supportEmail: 'support@test.com',
        isActive: true,
        defaultPriority: 'MEDIUM',
        createdAt: '2026-01-01',
      },
    ]),
    create: vi.fn().mockResolvedValue({ id: 'cfg-new' }),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}));

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      emailToCase: {
        title: 'Email-to-Case',
        description: 'Automatically create support tickets from inbound emails.',
        addConfig: 'Add Support Email',
        supportEmail: 'Support Email',
        defaultPriority: 'Default Priority',
        status: 'Status',
        active: 'Active',
        inactive: 'Inactive',
        autoReply: 'Auto-reply to sender',
      },
      tickets: {
        priority: { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' },
      },
      common: { actions: 'Actions', cancel: 'Cancel', save: 'Save' },
    },
  },
});

describe('EmailToCaseAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title', () => {
    const wrapper = mount(EmailToCaseAdmin, {
      global: {
        plugins: [i18n, PrimeVue],
        stubs: { DataTable: true, Column: true, Dialog: true, InputSwitch: true, Dropdown: true, Tag: true },
      },
    });
    expect(wrapper.text()).toContain('Email-to-Case');
  });

  it('renders add button', () => {
    const wrapper = mount(EmailToCaseAdmin, {
      global: {
        plugins: [i18n, PrimeVue],
        stubs: { DataTable: true, Column: true, Dialog: true, InputSwitch: true, Dropdown: true, Tag: true },
      },
    });
    expect(wrapper.text()).toContain('Add Support Email');
  });

  it('shows description text', () => {
    const wrapper = mount(EmailToCaseAdmin, {
      global: {
        plugins: [i18n, PrimeVue],
        stubs: { DataTable: true, Column: true, Dialog: true, InputSwitch: true, Dropdown: true, Tag: true },
      },
    });
    expect(wrapper.text()).toContain('Automatically create support tickets');
  });
});
