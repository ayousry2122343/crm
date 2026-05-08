<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useNotificationStore } from '@/pinia/notification.store';
import { useSocket } from '@/composables/useSocket';
import Button from 'primevue/button';
import Badge from 'primevue/badge';
import OverlayPanel from 'primevue/overlaypanel';

const store = useNotificationStore();
const { connect } = useSocket();
const { t } = useI18n();
const router = useRouter();
const panelRef = ref();

onMounted(async () => {
  connect();
  await store.fetchUnreadCount();
  await store.fetchList(true);
});

function toggle(event: Event) {
  panelRef.value?.toggle(event);
}

async function handleClick(notif: (typeof store.items)[number]) {
  if (!notif.isRead) {
    await store.markRead(notif.id);
  }
  panelRef.value?.hide();
  if (notif.link) {
    router.push(notif.link);
  }
}

async function handleMarkAllRead() {
  await store.markAllRead();
}

function formatTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('notifications.justNow');
  if (mins < 60) return t('notifications.minutesAgo', { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t('notifications.hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  return t('notifications.daysAgo', { n: days });
}
</script>

<template>
  <div class="relative inline-flex" data-test="notification-bell">
    <Button
      icon="pi pi-bell"
      severity="secondary"
      size="small"
      data-test="notification-bell-btn"
      @click="toggle"
    />
    <Badge
      v-if="store.unreadCount > 0"
      :value="store.unreadCount > 99 ? '99+' : String(store.unreadCount)"
      severity="danger"
      class="absolute -top-1 -end-1"
      data-test="notification-badge"
    />
    <OverlayPanel ref="panelRef" class="w-96" data-test="notification-panel">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-semibold text-lg">{{ t('notifications.title') }}</h3>
        <Button
          v-if="store.unreadCount > 0"
          :label="t('notifications.markAllRead')"
          severity="secondary"
          size="small"
          text
          data-test="mark-all-read"
          @click="handleMarkAllRead"
        />
      </div>
      <div v-if="store.items.length === 0" class="text-center py-4 text-gray-500" data-test="no-notifications">
        {{ t('notifications.noNotifications') }}
      </div>
      <ul v-else class="max-h-80 overflow-y-auto divide-y" data-test="notification-list">
        <li
          v-for="notif in store.items.slice(0, 10)"
          :key="notif.id"
          class="py-2 px-1 cursor-pointer rounded hover:bg-slate-50 transition-colors"
          :class="{ 'bg-blue-50': !notif.isRead }"
          :data-test="`notification-item-${notif.id}`"
          @click="handleClick(notif)"
        >
          <div class="flex items-start gap-2">
            <span
              v-if="!notif.isRead"
              class="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"
              data-test="unread-dot"
            />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium truncate">{{ notif.title }}</p>
              <p v-if="notif.body" class="text-xs text-gray-500 truncate">{{ notif.body }}</p>
              <span class="text-xs text-gray-400">{{ formatTime(notif.createdAt) }}</span>
            </div>
          </div>
        </li>
      </ul>
      <div v-if="store.items.length > 10" class="mt-2 text-center">
        <Button
          :label="t('notifications.viewAll')"
          severity="secondary"
          size="small"
          text
          data-test="view-all-notifications"
          @click="panelRef?.hide(); router.push('/notifications')"
        />
      </div>
    </OverlayPanel>
  </div>
</template>
