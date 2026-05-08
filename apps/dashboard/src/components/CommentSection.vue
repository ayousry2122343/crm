<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { commentsApi, type Comment } from '@/api/comments';
import { useAppToast } from '@/composables/useAppToast';
import MentionInput from './MentionInput.vue';
import Button from 'primevue/button';

const props = defineProps<{
  entityType: string;
  entityId: string;
}>();

const { t } = useI18n();
const toast = useAppToast();

const comments = ref<Comment[]>([]);
const nextCursor = ref<string | null>(null);
const loading = ref(false);
const newBody = ref('');
const replyTo = ref<string | null>(null);
const replyBody = ref('');
const editId = ref<string | null>(null);
const editBody = ref('');

async function fetchComments(reset = false) {
  loading.value = true;
  try {
    const cursor = reset ? undefined : nextCursor.value ?? undefined;
    const result = await commentsApi.list(props.entityType, props.entityId, { cursor, limit: 20 });
    if (reset) {
      comments.value = result.items;
    } else {
      comments.value.push(...result.items);
    }
    nextCursor.value = result.nextCursor;
  } finally {
    loading.value = false;
  }
}

onMounted(() => fetchComments(true));

async function submitComment() {
  if (!newBody.value.trim()) return;
  try {
    const created = await commentsApi.create({
      entityType: props.entityType,
      entityId: props.entityId,
      body: newBody.value,
    });
    comments.value.unshift(created);
    newBody.value = '';
  } catch {
    toast.error(t('errors.unexpected'));
  }
}

async function submitReply(parentId: string) {
  if (!replyBody.value.trim()) return;
  try {
    const created = await commentsApi.create({
      entityType: props.entityType,
      entityId: props.entityId,
      body: replyBody.value,
      parentId,
    });
    const parent = comments.value.find((c) => c.id === parentId);
    if (parent) {
      parent.replies = [...(parent.replies ?? []), created];
    }
    replyTo.value = null;
    replyBody.value = '';
  } catch {
    toast.error(t('errors.unexpected'));
  }
}

async function startEdit(comment: Comment) {
  editId.value = comment.id;
  editBody.value = comment.body;
}

async function submitEdit() {
  if (!editId.value || !editBody.value.trim()) return;
  try {
    const updated = await commentsApi.update(editId.value, { body: editBody.value });
    const idx = comments.value.findIndex((c) => c.id === editId.value);
    if (idx >= 0) comments.value[idx] = { ...comments.value[idx], ...updated };
    editId.value = null;
    editBody.value = '';
  } catch {
    toast.error(t('errors.unexpected'));
  }
}

async function deleteComment(id: string) {
  try {
    await commentsApi.archive(id);
    comments.value = comments.value.filter((c) => c.id !== id);
    toast.success(t('common.deleted'));
  } catch {
    toast.error(t('errors.unexpected'));
  }
}

async function togglePin(comment: Comment) {
  try {
    if (comment.isPinned) {
      await commentsApi.unpin(comment.id);
      comment.isPinned = false;
    } else {
      await commentsApi.pin(comment.id);
      comment.isPinned = true;
    }
  } catch {
    toast.error(t('errors.unexpected'));
  }
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}
</script>

<template>
  <div data-test="comment-section">
    <h3 class="font-semibold mb-3">{{ t('comments.title') }}</h3>

    <!-- New Comment -->
    <div class="mb-4" data-test="new-comment-form">
      <MentionInput v-model="newBody" :placeholder="t('comments.placeholder')" @submit="submitComment" />
      <div class="mt-2 flex justify-end">
        <Button
          :label="t('comments.post')"
          size="small"
          :disabled="!newBody.trim()"
          data-test="post-comment-btn"
          @click="submitComment"
        />
      </div>
    </div>

    <!-- Comments List -->
    <div v-if="comments.length === 0 && !loading" class="text-sm text-gray-500" data-test="no-comments">
      {{ t('comments.noComments') }}
    </div>

    <div v-else class="flex flex-col gap-4" data-test="comments-list">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="border rounded p-3"
        :class="{ 'border-amber-300 bg-amber-50': comment.isPinned }"
        :data-test="`comment-${comment.id}`"
      >
        <!-- Comment Header -->
        <div class="flex items-center justify-between mb-1">
          <div class="flex items-center gap-2">
            <span class="text-sm font-medium">{{ comment.author?.fullName }}</span>
            <span class="text-xs text-gray-400">{{ formatTime(comment.createdAt) }}</span>
            <span v-if="comment.isPinned" class="text-xs text-amber-600">📌 {{ t('comments.pinned') }}</span>
          </div>
          <div class="flex gap-1">
            <Button
              icon="pi pi-thumbtack"
              size="small"
              text
              severity="secondary"
              :data-test="`pin-${comment.id}`"
              @click="togglePin(comment)"
            />
            <Button
              icon="pi pi-pencil"
              size="small"
              text
              severity="secondary"
              :data-test="`edit-${comment.id}`"
              @click="startEdit(comment)"
            />
            <Button
              icon="pi pi-reply"
              size="small"
              text
              severity="secondary"
              :data-test="`reply-${comment.id}`"
              @click="replyTo = comment.id"
            />
            <Button
              icon="pi pi-trash"
              size="small"
              text
              severity="danger"
              :data-test="`delete-${comment.id}`"
              @click="deleteComment(comment.id)"
            />
          </div>
        </div>

        <!-- Comment Body (edit mode or display) -->
        <div v-if="editId === comment.id" data-test="edit-form">
          <MentionInput v-model="editBody" @submit="submitEdit" />
          <div class="mt-1 flex gap-1 justify-end">
            <Button :label="t('common.cancel')" size="small" severity="secondary" @click="editId = null" />
            <Button :label="t('common.save')" size="small" @click="submitEdit" />
          </div>
        </div>
        <p v-else class="text-sm whitespace-pre-wrap" :data-test="`body-${comment.id}`">{{ comment.body }}</p>

        <!-- Replies -->
        <div v-if="comment.replies && comment.replies.length > 0" class="ms-6 mt-3 flex flex-col gap-2" data-test="replies">
          <div
            v-for="reply in comment.replies"
            :key="reply.id"
            class="border-s-2 border-slate-200 ps-3 py-1"
            :data-test="`reply-${reply.id}`"
          >
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-sm font-medium">{{ reply.author?.fullName }}</span>
              <span class="text-xs text-gray-400">{{ formatTime(reply.createdAt) }}</span>
            </div>
            <p class="text-sm whitespace-pre-wrap">{{ reply.body }}</p>
          </div>
        </div>

        <!-- Reply Form -->
        <div v-if="replyTo === comment.id" class="ms-6 mt-2" data-test="reply-form">
          <MentionInput v-model="replyBody" :placeholder="t('comments.replyPlaceholder')" @submit="submitReply(comment.id)" />
          <div class="mt-1 flex gap-1 justify-end">
            <Button :label="t('common.cancel')" size="small" severity="secondary" @click="replyTo = null" />
            <Button :label="t('comments.reply')" size="small" @click="submitReply(comment.id)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Load More -->
    <div v-if="nextCursor" class="mt-3 text-center">
      <Button
        :label="t('common.loadMore')"
        severity="secondary"
        size="small"
        :loading="loading"
        data-test="load-more-comments"
        @click="fetchComments(false)"
      />
    </div>
  </div>
</template>
