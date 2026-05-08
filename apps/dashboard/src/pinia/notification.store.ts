import { defineStore } from 'pinia';
import { ref } from 'vue';
import { notificationApi, type Notification } from '@/api/notifications';

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<Notification[]>([]);
  const unreadCount = ref(0);
  const nextCursor = ref<string | null>(null);
  const loading = ref(false);

  async function fetchList(reset = false) {
    loading.value = true;
    try {
      const cursor = reset ? undefined : nextCursor.value ?? undefined;
      const result = await notificationApi.list({ cursor, limit: 20 });
      if (reset) {
        items.value = result.items;
      } else {
        items.value.push(...result.items);
      }
      nextCursor.value = result.nextCursor;
    } finally {
      loading.value = false;
    }
  }

  async function fetchUnreadCount() {
    const result = await notificationApi.unreadCount();
    unreadCount.value = result.count;
  }

  async function markRead(id: string) {
    await notificationApi.markRead(id);
    const item = items.value.find((n) => n.id === id);
    if (item && !item.isRead) {
      item.isRead = true;
      item.readAt = new Date().toISOString();
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  }

  async function markAllRead() {
    await notificationApi.markAllRead();
    items.value.forEach((n) => {
      n.isRead = true;
      n.readAt = n.readAt ?? new Date().toISOString();
    });
    unreadCount.value = 0;
  }

  function addFromSocket(notification: Notification) {
    items.value.unshift(notification);
    if (!notification.isRead) {
      unreadCount.value++;
    }
  }

  return {
    items,
    unreadCount,
    nextCursor,
    loading,
    fetchList,
    fetchUnreadCount,
    markRead,
    markAllRead,
    addFromSocket,
  };
});
