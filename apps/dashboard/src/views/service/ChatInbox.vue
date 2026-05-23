<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';
import { chatApi, type ChatSession, type ChatMessage } from '@/api/chat';
import { useAuth } from '@/composables/useAuth';
import { io, type Socket } from 'socket.io-client';
import Button from 'primevue/button';

const { t } = useI18n();
const auth = useAuth();

const sessions = ref<ChatSession[]>([]);
const activeSession = ref<ChatSession | null>(null);
const messageInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const loading = ref(false);
const typingIndicator = ref('');
let socket: Socket | null = null;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;

const sortedSessions = computed(() => {
  const order = { WAITING: 0, ACTIVE: 1, ENDED: 2 };
  return [...sessions.value].sort(
    (a, b) => order[a.status] - order[b.status] || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
});

async function loadSessions() {
  loading.value = true;
  try {
    sessions.value = await chatApi.list();
  } finally {
    loading.value = false;
  }
}

async function selectSession(session: ChatSession) {
  const full = await chatApi.get(session.id);
  activeSession.value = full;

  if (socket) {
    socket.emit('chat:join', { sessionId: session.id });
  }

  await nextTick();
  scrollToBottom();
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
}

async function sendMessage() {
  if (!messageInput.value.trim() || !activeSession.value) return;

  const content = messageInput.value.trim();
  messageInput.value = '';

  const msg = await chatApi.sendMessage(activeSession.value.id, {
    senderType: 'agent',
    senderId: auth.user.value?.id,
    content,
  });

  if (activeSession.value.messages) {
    activeSession.value.messages.push(msg);
  }

  if (socket) {
    socket.emit('chat:message', {
      sessionId: activeSession.value.id,
      senderType: 'agent',
      senderId: auth.user.value?.id,
      content,
    });
  }

  await nextTick();
  scrollToBottom();
}

async function assignToMe() {
  if (!activeSession.value) return;
  const updated = await chatApi.assign(activeSession.value.id, auth.user.value!.id);
  activeSession.value.status = updated.status;
  activeSession.value.assigneeId = updated.assigneeId;
  activeSession.value.assignee = updated.assignee;
  const idx = sessions.value.findIndex((s) => s.id === updated.id);
  if (idx >= 0) sessions.value[idx] = { ...sessions.value[idx], ...updated };
}

async function endChat() {
  if (!activeSession.value) return;
  const updated = await chatApi.end(activeSession.value.id);
  activeSession.value.status = updated.status;
  activeSession.value.endedAt = updated.endedAt;
  const idx = sessions.value.findIndex((s) => s.id === updated.id);
  if (idx >= 0) sessions.value[idx] = { ...sessions.value[idx], ...updated };
}

async function convertToTicket() {
  if (!activeSession.value) return;
  const ticket = await chatApi.convertToTicket(activeSession.value.id);
  activeSession.value.ticketId = ticket.id;
  activeSession.value.status = 'ENDED';
  const idx = sessions.value.findIndex((s) => s.id === activeSession.value!.id);
  if (idx >= 0) sessions.value[idx].status = 'ENDED';
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function emitTyping() {
  if (!socket || !activeSession.value) return;
  socket.emit('chat:typing', {
    sessionId: activeSession.value.id,
    senderType: 'agent',
  });
}

function connectSocket() {
  const token = localStorage.getItem('accessToken');
  socket = io('/chat', {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('chat:message', (data: any) => {
    if (activeSession.value && data.sessionId === activeSession.value.id && data.senderType !== 'agent') {
      if (!activeSession.value.messages) activeSession.value.messages = [];
      activeSession.value.messages.push(data as ChatMessage);
      nextTick(scrollToBottom);
    }
  });

  socket.on('chat:typing', (data: any) => {
    if (activeSession.value && data.sessionId === activeSession.value.id && data.senderType === 'visitor') {
      typingIndicator.value = t('chat.typing');
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => { typingIndicator.value = ''; }, 2000);
    }
  });

  socket.on('chat:ended', (data: any) => {
    if (activeSession.value && data.sessionId === activeSession.value.id) {
      activeSession.value.status = 'ENDED';
    }
    const idx = sessions.value.findIndex((s) => s.id === data.sessionId);
    if (idx >= 0) sessions.value[idx].status = 'ENDED';
  });
}

onMounted(() => {
  loadSessions();
  connectSocket();
});

onUnmounted(() => {
  if (socket) socket.disconnect();
  if (typingTimeout) clearTimeout(typingTimeout);
});
</script>

<template>
  <div class="flex flex-col h-[calc(100vh-120px)]">
    <h1 class="text-2xl font-bold mb-4" data-test="chat-title">{{ t('chat.title') }}</h1>

    <div class="flex flex-1 border rounded-lg overflow-hidden bg-white">
      <!-- Left panel: session list -->
      <div class="w-80 border-r flex flex-col">
        <div class="p-3 border-b font-medium text-sm text-slate-600">
          {{ t('chat.inbox') }}
        </div>
        <div class="flex-1 overflow-y-auto" data-test="session-list">
          <div
            v-if="sortedSessions.length === 0 && !loading"
            class="p-4 text-sm text-slate-400 text-center"
            data-test="empty-state"
          >
            {{ t('chat.noSessions') }}
          </div>
          <div
            v-for="session in sortedSessions"
            :key="session.id"
            class="p-3 border-b cursor-pointer hover:bg-slate-50 transition-colors"
            :class="{ 'bg-blue-50': activeSession?.id === session.id, 'bg-yellow-50': session.status === 'WAITING' }"
            @click="selectSession(session)"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium text-sm">{{ session.visitorName }}</span>
              <span
                class="text-xs px-2 py-0.5 rounded-full"
                :class="{
                  'bg-yellow-100 text-yellow-800': session.status === 'WAITING',
                  'bg-green-100 text-green-800': session.status === 'ACTIVE',
                  'bg-slate-100 text-slate-600': session.status === 'ENDED',
                }"
              >
                {{ t(`chat.${session.status.toLowerCase()}`) }}
              </span>
            </div>
            <div v-if="session.assignee" class="text-xs text-slate-400 mt-1">
              {{ session.assignee.fullName }}
            </div>
          </div>
        </div>
      </div>

      <!-- Right panel: active conversation -->
      <div class="flex-1 flex flex-col">
        <template v-if="activeSession">
          <!-- Header -->
          <div class="p-3 border-b flex items-center justify-between">
            <div>
              <span class="font-medium">{{ activeSession.visitorName }}</span>
              <span v-if="activeSession.visitorEmail" class="text-sm text-slate-400 ml-2">
                {{ activeSession.visitorEmail }}
              </span>
            </div>
            <div class="flex gap-2">
              <Button
                v-if="activeSession.status === 'WAITING'"
                :label="t('chat.assignToMe')"
                size="small"
                severity="info"
                data-test="assign-btn"
                @click="assignToMe"
              />
              <Button
                v-if="activeSession.status !== 'ENDED'"
                :label="t('chat.endChat')"
                size="small"
                severity="warning"
                data-test="end-btn"
                @click="endChat"
              />
              <Button
                v-if="!activeSession.ticketId"
                :label="t('chat.convertToTicket')"
                size="small"
                severity="secondary"
                data-test="convert-btn"
                @click="convertToTicket"
              />
            </div>
          </div>

          <!-- Messages -->
          <div ref="messagesContainer" class="flex-1 overflow-y-auto p-4 space-y-3">
            <div
              v-for="msg in activeSession.messages"
              :key="msg.id"
              class="flex"
              :class="{ 'justify-end': msg.senderType === 'agent', 'justify-start': msg.senderType !== 'agent' }"
            >
              <div
                class="max-w-xs px-3 py-2 rounded-lg text-sm"
                :class="{
                  'bg-blue-500 text-white': msg.senderType === 'agent',
                  'bg-slate-100 text-slate-800': msg.senderType === 'visitor',
                  'bg-yellow-50 text-yellow-800 italic': msg.senderType === 'system',
                }"
              >
                {{ msg.content }}
              </div>
            </div>
            <div v-if="typingIndicator" class="text-xs text-slate-400 italic">
              {{ typingIndicator }}
            </div>
          </div>

          <!-- Input -->
          <div v-if="activeSession.status !== 'ENDED'" class="p-3 border-t">
            <div class="flex gap-2">
              <input
                v-model="messageInput"
                type="text"
                class="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                :placeholder="t('chat.typeMessage')"
                data-test="message-input"
                @keydown="handleKeydown"
                @input="emitTyping"
              />
              <Button
                icon="pi pi-send"
                size="small"
                data-test="send-btn"
                @click="sendMessage"
              />
            </div>
          </div>
          <div v-else class="p-3 border-t text-center text-sm text-slate-400">
            {{ t('chat.ended') }}
          </div>
        </template>

        <template v-else>
          <div class="flex-1 flex items-center justify-center text-slate-400">
            {{ t('chat.noSessions') }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
