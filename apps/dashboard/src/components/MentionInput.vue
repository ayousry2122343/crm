<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { usersApi, type UserSummary } from '@/api/users';
import Textarea from 'primevue/textarea';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'submit'): void;
}>();

const { t } = useI18n();
const users = ref<UserSummary[]>([]);
const showDropdown = ref(false);
const mentionQuery = ref('');
const cursorPos = ref(0);
const inputRef = ref<HTMLTextAreaElement | null>(null);

const filteredUsers = computed(() => {
  if (!mentionQuery.value) return users.value.slice(0, 5);
  const q = mentionQuery.value.toLowerCase();
  return users.value
    .filter((u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
    .slice(0, 5);
});

async function loadUsers() {
  try {
    const data = await usersApi.list();
    users.value = data.members;
  } catch {
    // silent — fallback to empty
  }
}
loadUsers();

function onInput(event: Event) {
  const target = event.target as HTMLTextAreaElement;
  const val = target.value;
  emit('update:modelValue', val);
  cursorPos.value = target.selectionStart ?? 0;

  const beforeCursor = val.slice(0, cursorPos.value);
  const atMatch = beforeCursor.match(/@(\w*)$/);
  if (atMatch) {
    mentionQuery.value = atMatch[1];
    showDropdown.value = true;
  } else {
    showDropdown.value = false;
  }
}

function selectUser(user: UserSummary) {
  const val = props.modelValue;
  const beforeCursor = val.slice(0, cursorPos.value);
  const atIdx = beforeCursor.lastIndexOf('@');
  const after = val.slice(cursorPos.value);
  const mention = `@[${user.fullName}](${user.id})`;
  const newVal = val.slice(0, atIdx) + mention + ' ' + after;
  emit('update:modelValue', newVal);
  showDropdown.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    emit('submit');
  }
  if (event.key === 'Escape') {
    showDropdown.value = false;
  }
}
</script>

<template>
  <div class="relative" data-test="mention-input">
    <Textarea
      ref="inputRef"
      :modelValue="modelValue"
      :placeholder="placeholder ?? t('comments.placeholder')"
      class="w-full"
      rows="2"
      autoResize
      data-test="comment-textarea"
      @input="onInput"
      @keydown="onKeydown"
    />
    <div
      v-if="showDropdown && filteredUsers.length > 0"
      class="absolute z-50 bg-white border rounded shadow-lg mt-1 w-64 max-h-40 overflow-y-auto"
      data-test="mention-dropdown"
    >
      <button
        v-for="user in filteredUsers"
        :key="user.id"
        class="w-full text-start px-3 py-2 hover:bg-slate-100 text-sm flex items-center gap-2"
        :data-test="`mention-user-${user.id}`"
        @mousedown.prevent="selectUser(user)"
      >
        <span class="font-medium">{{ user.fullName }}</span>
        <span class="text-xs text-gray-400">{{ user.email }}</span>
      </button>
    </div>
  </div>
</template>
