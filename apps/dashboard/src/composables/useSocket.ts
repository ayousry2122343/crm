import { ref, onUnmounted } from 'vue';
import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from '@/api/client';
import { useNotificationStore } from '@/pinia/notification.store';

let socket: Socket | null = null;
const connected = ref(false);

export function useSocket() {
  function connect() {
    if (socket?.connected) return;

    const token = getAccessToken();
    if (!token) return;

    socket = io('/notifications', {
      auth: { token },
      transports: ['websocket'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      connected.value = true;
    });

    socket.on('disconnect', () => {
      connected.value = false;
    });

    socket.on('notification', (notification) => {
      const store = useNotificationStore();
      store.addFromSocket(notification);
    });
  }

  function disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
      connected.value = false;
    }
  }

  onUnmounted(() => {
    // Socket stays alive — managed by AppLayout
  });

  return { connected, connect, disconnect };
}
