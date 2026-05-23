<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { conversationsApi, type Conversation, type ConversationMessage } from '@/api/conversations';

const { t } = useI18n();

const conversations = ref<Conversation[]>([]);
const selectedConversation = ref<Conversation | null>(null);
const messages = ref<ConversationMessage[]>([]);
const loading = ref(true);
const messagesLoading = ref(false);
const filterTab = ref<string>('all');
const filterChannel = ref<string | undefined>();
const replyText = ref('');

const channelIcons: Record<string, string> = {
  EMAIL: 'pi pi-envelope',
  CHAT: 'pi pi-comments',
  WHATSAPP: 'pi pi-whatsapp',
  SMS: 'pi pi-mobile',
  WEB_FORM: 'pi pi-globe',
  PHONE: 'pi pi-phone',
};

const statusSeverity: Record<string, string> = {
  OPEN: 'warn',
  PENDING: 'info',
  SNOOZED: 'secondary',
  CLOSED: 'contrast',
};

const tabOptions = [
  { label: 'All', value: 'all' },
  { label: 'Mine', value: 'mine' },
  { label: 'Unassigned', value: 'unassigned' },
];

const channelOptions = [
  { label: 'All Channels', value: undefined },
  { label: 'Email', value: 'EMAIL' },
  { label: 'Chat', value: 'CHAT' },
  { label: 'WhatsApp', value: 'WHATSAPP' },
  { label: 'SMS', value: 'SMS' },
];

async function loadConversations() {
  loading.value = true;
  try {
    const params: Record<string, any> = {};
    if (filterChannel.value) params.channelType = filterChannel.value;
    if (filterTab.value === 'unassigned') params.assigneeId = '__null__';
    const res = await conversationsApi.list(params);
    conversations.value = res.items;
  } finally {
    loading.value = false;
  }
}

async function selectConversation(conv: Conversation) {
  selectedConversation.value = conv;
  messagesLoading.value = true;
  try {
    messages.value = await conversationsApi.getMessages(conv.id);
  } finally {
    messagesLoading.value = false;
  }
}

async function closeConversation() {
  if (!selectedConversation.value) return;
  await conversationsApi.close(selectedConversation.value.id);
  loadConversations();
  selectedConversation.value = null;
  messages.value = [];
}

onMounted(loadConversations);
</script>

<template>
  <div data-test="conversations-inbox" class="flex h-[calc(100vh-8rem)]">
    <!-- Left Panel: Conversation List -->
    <div class="w-96 border-r flex flex-col">
      <div class="p-3 border-b flex gap-2">
        <Select v-model="filterTab" :options="tabOptions" option-label="label" option-value="value" class="flex-1" @change="loadConversations" />
        <Select v-model="filterChannel" :options="channelOptions" option-label="label" option-value="value" class="flex-1" @change="loadConversations" />
      </div>
      <div class="flex-1 overflow-y-auto">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          :class="['p-3 border-b cursor-pointer hover:bg-surface-50', selectedConversation?.id === conv.id ? 'bg-primary-50' : '']"
          @click="selectConversation(conv)"
        >
          <div class="flex items-center gap-2 mb-1">
            <i :class="channelIcons[conv.channelType] ?? 'pi pi-circle'" class="text-xs" />
            <span class="font-medium text-sm truncate flex-1">{{ conv.person?.fullName ?? t('conversations.unknown') }}</span>
            <span class="text-xs text-surface-400">{{ new Date(conv.lastMessageAt).toLocaleDateString() }}</span>
          </div>
          <div class="flex items-center gap-2">
            <Tag :value="conv.status" :severity="statusSeverity[conv.status] ?? 'info'" class="text-xs" />
            <span v-if="conv.unreadCount > 0" class="bg-primary text-white text-xs rounded-full px-1.5">{{ conv.unreadCount }}</span>
          </div>
        </div>
        <p v-if="!loading && conversations.length === 0" class="text-center text-surface-400 py-8">{{ t('conversations.noConversations') }}</p>
      </div>
    </div>

    <!-- Right Panel: Message Thread -->
    <div class="flex-1 flex flex-col">
      <template v-if="selectedConversation">
        <div class="p-3 border-b flex items-center justify-between">
          <div>
            <h3 class="font-semibold">{{ selectedConversation.person?.fullName ?? t('conversations.unknown') }}</h3>
            <span class="text-xs text-surface-400">{{ selectedConversation.channelType }}</span>
          </div>
          <div class="flex gap-2">
            <Button :label="t('conversations.close')" severity="secondary" size="small" @click="closeConversation" />
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="[
              'max-w-[75%] p-3 rounded-lg text-sm',
              (msg.direction === 'OUT' || msg.senderType === 'agent') ? 'ml-auto bg-primary text-white' : 'mr-auto bg-surface-100',
            ]"
          >
            <p>{{ msg.content }}</p>
            <span class="text-xs opacity-70">{{ new Date(msg.createdAt).toLocaleTimeString() }}</span>
          </div>
        </div>

        <div class="border-t p-3 flex gap-2">
          <InputText v-model="replyText" :placeholder="t('conversations.typeReply')" class="flex-1" @keyup.enter="() => {}" />
          <Button icon="pi pi-send" />
        </div>
      </template>
      <div v-else class="flex-1 flex items-center justify-center text-surface-400">
        {{ t('conversations.selectConversation') }}
      </div>
    </div>
  </div>
</template>
