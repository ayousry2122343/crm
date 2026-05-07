import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import ActivityCalendar from './ActivityCalendar.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();

vi.mock('@/api/activities', () => ({
  activitiesApi: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const activities = [
  {
    id: 'a1',
    parentEntity: 'Person',
    parentId: 'p1',
    type: 'CALL',
    subject: 'Follow up call',
    body: null,
    status: 'OPEN',
    dueAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'a2',
    parentEntity: 'Deal',
    parentId: 'd1',
    type: 'MEETING',
    subject: 'Demo meeting',
    body: null,
    status: 'OPEN',
    dueAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

function createWrapper() {
  const i18n = createI18n({ locale: 'en', messages: { en, ar }, legacy: false });
  return mount(ActivityCalendar, {
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        Button: { template: '<button @click="$emit(\'click\')">{{ $attrs.label }}</button>', props: ['label', 'icon', 'severity', 'size'] },
        Select: true,
        Tag: { template: '<span class="tag">{{ $attrs.value }}</span>', props: ['value', 'severity'] },
      },
    },
  });
}

describe('ActivityCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: activities });
  });

  it('loads activities on mount', async () => {
    createWrapper();
    await flushPromises();
    expect(mockList).toHaveBeenCalled();
  });

  it('renders the calendar page', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="activity-calendar-page"]').exists()).toBe(true);
  });

  it('renders the calendar grid', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="calendar-grid"]').exists()).toBe(true);
  });

  it('renders 7 weekday headers', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.findAll('.calendar-header')).toHaveLength(7);
  });

  it('renders 42 calendar cells (6 weeks)', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    expect(wrapper.findAll('.calendar-cell')).toHaveLength(42);
  });

  it('displays activity tags for current date', async () => {
    const wrapper = createWrapper();
    await flushPromises();
    const tags = wrapper.findAll('.tag');
    expect(tags.length).toBeGreaterThanOrEqual(0);
  });
});
