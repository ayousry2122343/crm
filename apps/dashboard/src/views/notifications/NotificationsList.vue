<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useNotificationStore } from '@/pinia/notification.store';
import Button from 'primevue/button';

const store = useNotificationStore();
const router = useRouter();
const { t } = useI18n();

onMounted(() => {
  store.fetchList(true);
});

async function handleClick(notif: (typeof store.items)[number]) {
  if (!notif.isRead) {
    await store.markRead(notif.id);
  }
  if (notif.link) {
    router.push(notif.link);
  }
}

function loadMore() {
  store.fetchList(false);
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString();
}
</script>

<template>
  <div data-test="notifications-list-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('notifications.title') }}</h1>
      <Button
        v-if="store.unreadCount > 0"
        :label="t('notifications.markAllRead')"
        severity="secondary"
        size="small"
        data-test="mark-all-read-page"
        @click="store.markAllRead()"
      />
    </div>

    <div v-if="store.items.length === 0 && !store.loading" class="text-center py-8 text-gray-500" data-test="no-notifications-page">
      {{ t('notifications.noNotifications') }}
    </div>

    <ul v-else class="divide-y" data-test="notifications-full-list">
      <li
        v-for="notif in store.items"
        :key="notif.id"
        class="py-3 px-3 cursor-pointer rounded hover:bg-slate-50 transition-colors"
        :class="{ 'bg-blue-50': !notif.isRead }"
        :data-test="`notif-row-${notif.id}`"
        @click="handleClick(notif)"
      >
        <div class="flex items-start gap-3">
          <span
            v-if="!notif.isRead"
            class="mt-2 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium">{{ notif.title }}</p>
            <p v-if="notif.body" class="text-sm text-gray-600 mt-0.5">{{ notif.body }}</p>
            <span class="text-xs text-gray-400">{{ formatTime(notif.createdAt) }}</span>
          </div>
          <span class="text-xs text-gray-400 whitespace-nowrap">{{ notif.type }}</span>
        </div>
      </li>
    </ul>

    <div v-if="store.nextCursor" class="mt-4 text-center">
      <Button
        :label="t('common.loadMore')"
        severity="secondary"
        :loading="store.loading"
        data-test="load-more"
        @click="loadMore"
      />
    </div>
  </div>
</template>
