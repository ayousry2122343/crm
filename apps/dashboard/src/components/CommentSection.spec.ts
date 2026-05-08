import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import PrimeVue from 'primevue/config';
import CommentSection from './CommentSection.vue';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockArchive = vi.fn();
const mockPin = vi.fn();
const mockUnpin = vi.fn();

vi.mock('@/api/comments', () => ({
  commentsApi: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    archive: (...args: unknown[]) => mockArchive(...args),
    pin: (...args: unknown[]) => mockPin(...args),
    unpin: (...args: unknown[]) => mockUnpin(...args),
    follow: vi.fn(),
    unfollow: vi.fn(),
    listFollowers: vi.fn(),
  },
}));

vi.mock('@/api/users', () => ({
  usersApi: {
    list: vi.fn().mockResolvedValue({ members: [], invites: [] }),
  },
}));

vi.mock('@/composables/useAppToast', () => ({
  useAppToast: () => ({ success: vi.fn(), error: vi.fn(), apiError: vi.fn(), warn: vi.fn() }),
}));

function makeWrapper() {
  const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, ar } });
  return mount(CommentSection, {
    props: { entityType: 'DEAL', entityId: 'd_1' },
    global: {
      plugins: [i18n, PrimeVue],
      stubs: {
        teleport: true,
        Textarea: {
          template: '<textarea :data-test="$attrs[\'data-test\']" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: ['modelValue'],
          emits: ['update:modelValue'],
        },
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockList.mockResolvedValue({ items: [], nextCursor: null });
  mockCreate.mockResolvedValue({
    id: 'c_new',
    body: 'New comment',
    author: { id: 'u_1', fullName: 'Ahmed', email: 'a@b.com' },
    mentions: [],
    replies: [],
    isPinned: false,
    createdAt: new Date().toISOString(),
  });
});

describe('CommentSection', () => {
  it('renders the comment section with title', async () => {
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="comment-section"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Comments');
  });

  it('shows empty state when no comments', async () => {
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="no-comments"]').exists()).toBe(true);
  });

  it('renders comments from API', async () => {
    mockList.mockResolvedValue({
      items: [
        {
          id: 'c_1',
          body: 'Great work!',
          author: { id: 'u_1', fullName: 'Ahmed', email: 'a@b.com' },
          mentions: [],
          replies: [],
          isPinned: false,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'c_2',
          body: 'I agree',
          author: { id: 'u_2', fullName: 'Sara', email: 's@b.com' },
          mentions: [],
          replies: [],
          isPinned: false,
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: null,
    });
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="comment-c_1"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="comment-c_2"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="body-c_1"]').text()).toBe('Great work!');
  });

  it('creates a new comment on submit', async () => {
    const wrapper = makeWrapper();
    await flushPromises();

    const textarea = wrapper.find('[data-test="comment-textarea"]');
    await textarea.setValue('New comment');
    await wrapper.find('[data-test="post-comment-btn"]').trigger('click');
    await flushPromises();

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'DEAL',
        entityId: 'd_1',
        body: 'New comment',
      }),
    );
  });

  it('renders replies nested under parent', async () => {
    mockList.mockResolvedValue({
      items: [
        {
          id: 'c_1',
          body: 'Parent',
          author: { id: 'u_1', fullName: 'Ahmed', email: 'a@b.com' },
          mentions: [],
          replies: [
            {
              id: 'r_1',
              body: 'Reply',
              author: { id: 'u_2', fullName: 'Sara', email: 's@b.com' },
              mentions: [],
              isPinned: false,
              createdAt: new Date().toISOString(),
            },
          ],
          isPinned: false,
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: null,
    });
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="replies"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="reply-r_1"]').exists()).toBe(true);
  });

  it('shows pinned indicator on pinned comments', async () => {
    mockList.mockResolvedValue({
      items: [
        {
          id: 'c_1',
          body: 'Pinned comment',
          author: { id: 'u_1', fullName: 'Ahmed', email: 'a@b.com' },
          mentions: [],
          replies: [],
          isPinned: true,
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: null,
    });
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.text()).toContain('Pinned');
  });

  it('shows load more when nextCursor exists', async () => {
    mockList.mockResolvedValue({
      items: [
        {
          id: 'c_1',
          body: 'First',
          author: { id: 'u_1', fullName: 'Ahmed', email: 'a@b.com' },
          mentions: [],
          replies: [],
          isPinned: false,
          createdAt: new Date().toISOString(),
        },
      ],
      nextCursor: 'c_1',
    });
    const wrapper = makeWrapper();
    await flushPromises();
    expect(wrapper.find('[data-test="load-more-comments"]').exists()).toBe(true);
  });
});
