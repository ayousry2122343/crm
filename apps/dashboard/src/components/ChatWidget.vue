<script setup lang="ts">
import { ref, nextTick, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { chatApi, type ChatMessage } from '@/api/chat';
import { io, type Socket } from 'socket.io-client';
import Button from 'primevue/button';

const props = defineProps<{
  workspaceId: string;
}>();

const { t } = useI18n();

const isOpen = ref(false);
const step = ref<'form' | 'chat'>('form');
const visitorName = ref('');
const visitorEmail = ref('');
const messageInput = ref('');
const messages = ref<ChatMessage[]>([]);
const sessionId = ref('');
const messagesEl = ref<HTMLElement | null>(null);
const typingIndicator = ref('');
let socket: Socket | null = null;
let typingTimeout: ReturnType<typeof setTimeout> | null = null;

function toggle() {
  isOpen.value = !isOpen.value;
}

async function startChat() {
  if (!visitorName.value.trim()) return;

  const session = await chatApi.startSession({
    workspaceId: props.workspaceId,
    visitorName: visitorName.value.trim(),
    visitorEmail: visitorEmail.value.trim() || undefined,
  });

  sessionId.value = session.id;
  step.value = 'chat';
  connectSocket();
}

async function sendMessage() {
  if (!messageInput.value.trim()) return;

  const content = messageInput.value.trim();
  messageInput.value = '';

  const msg = await chatApi.sendMessage(sessionId.value, {
    senderType: 'visitor',
    content,
    workspaceId: props.workspaceId,
  });

  messages.value.push(msg);

  if (socket) {
    socket.emit('chat:message', {
      sessionId: sessionId.value,
      senderType: 'visitor',
      content,
    });
  }

  await nextTick();
  scrollToBottom();
}

function scrollToBottom() {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
  }
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function emitTyping() {
  if (!socket) return;
  socket.emit('chat:typing', {
    sessionId: sessionId.value,
    senderType: 'visitor',
  });
}

function connectSocket() {
  socket = io('/chat', { transports: ['websocket'] });

  socket.on('connect', () => {
    socket!.emit('chat:join', { sessionId: sessionId.value });
  });

  socket.on('chat:message', (data: any) => {
    if (data.sessionId === sessionId.value && data.senderType !== 'visitor') {
      messages.value.push(data as ChatMessage);
      nextTick(scrollToBottom);
    }
  });

  socket.on('chat:typing', (data: any) => {
    if (data.sessionId === sessionId.value && data.senderType === 'agent') {
      typingIndicator.value = t('chat.typing');
      if (typingTimeout) clearTimeout(typingTimeout);
      typingTimeout = setTimeout(() => { typingIndicator.value = ''; }, 2000);
    }
  });

  socket.on('chat:ended', () => {
    step.value = 'form';
    messages.value = [];
    sessionId.value = '';
  });
}

onUnmounted(() => {
  if (socket) socket.disconnect();
  if (typingTimeout) clearTimeout(typingTimeout);
});
</script>

<template>
  <div class="fixed bottom-6 right-6 z-50">
    <!-- Toggle button -->
    <button
      v-if="!isOpen"
      class="w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors"
      data-test="chat-widget-toggle"
      @click="toggle"
    >
      <i class="pi pi-comments text-xl" />
    </button>

    <!-- Chat window -->
    <div
      v-if="isOpen"
      class="w-80 h-96 bg-white rounded-xl shadow-2xl border flex flex-col overflow-hidden"
      data-test="chat-widget-window"
    >
      <!-- Header -->
      <div class="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
        <span class="font-medium text-sm">{{ t('chat.title') }}</span>
        <button class="text-white/80 hover:text-white" @click="toggle">
          <i class="pi pi-times" />
        </button>
      </div>

      <!-- Form step -->
      <div v-if="step === 'form'" class="flex-1 p-4 flex flex-col gap-3 justify-center">
        <input
          v-model="visitorName"
          type="text"
          class="border rounded px-3 py-2 text-sm w-full"
          :placeholder="t('chat.visitorName')"
          data-test="visitor-name-input"
        />
        <input
          v-model="visitorEmail"
          type="email"
          class="border rounded px-3 py-2 text-sm w-full"
          :placeholder="t('chat.visitorEmail')"
          data-test="visitor-email-input"
        />
        <Button
          :label="t('chat.startChat')"
          size="small"
          class="w-full"
          data-test="start-chat-btn"
          :disabled="!visitorName.trim()"
          @click="startChat"
        />
      </div>

      <!-- Chat step -->
      <template v-if="step === 'chat'">
        <div ref="messagesEl" class="flex-1 overflow-y-auto p-3 space-y-2">
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="flex"
            :class="{ 'justify-end': msg.senderType === 'visitor', 'justify-start': msg.senderType !== 'visitor' }"
          >
            <div
              class="max-w-[200px] px-3 py-1.5 rounded-lg text-sm"
              :class="{
                'bg-blue-500 text-white': msg.senderType === 'visitor',
                'bg-slate-100 text-slate-800': msg.senderType !== 'visitor',
              }"
            >
              {{ msg.content }}
            </div>
          </div>
          <div v-if="typingIndicator" class="text-xs text-slate-400 italic">
            {{ typingIndicator }}
          </div>
        </div>
        <div class="p-2 border-t">
          <div class="flex gap-2">
            <input
              v-model="messageInput"
              type="text"
              class="flex-1 border rounded px-2 py-1.5 text-sm"
              :placeholder="t('chat.typeMessage')"
              data-test="widget-message-input"
              @keydown="handleKeydown"
              @input="emitTyping"
            />
            <Button icon="pi pi-send" size="small" data-test="widget-send-btn" @click="sendMessage" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
