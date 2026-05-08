import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import Users from './Users.vue';
import ar from '@/i18n/ar.json';
import en from '@/i18n/en.json';

const mockList = vi.fn();
const mockInvite = vi.fn();

vi.mock('@/api/users', () => ({
  usersApi: {
    list: (...args: unknown[]) => mockList(...args),
    invite: (...args: unknown[]) => mockInvite(...args),
  },
}));

function createWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { ar, en } });
  return mount(Users, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        DataTable: { template: '<div><slot /><slot name="empty" /></div>', props: ['value'] },
        Column: { template: '<div />' },
        Dialog: { template: '<div v-if="visible"><slot /></div>', props: ['visible'] },
      },
    },
  });
}

describe('Users.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({
      members: [{ id: 'u1', fullName: 'Ahmed', email: 'a@test.com', status: 'active', lastLoginAt: null }],
      invites: [],
    });
    mockInvite.mockResolvedValue({});
  });

  it('renders the page', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Users');
  });

  it('loads users on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('has invite user button', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.find('[data-test="invite-user"]').exists()).toBe(true);
  });

  it('shows pending invites section', async () => {
    const w = createWrapper();
    await flushPromises();
    expect(w.text()).toContain('Pending');
  });
});
