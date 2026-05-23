<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { channelMessagesApi, channelConfigsApi, type ChannelMessage, type ChannelConfig } from '@/api/channels';

const props = defineProps<{ personId: string }>();
const { t } = useI18n();

const messages = ref<ChannelMessage[]>([]);
const configs = ref<ChannelConfig[]>([]);
const loading = ref(true);
const newMessage = ref('');
const selectedConfigId = ref('');

async function load() {
  loading.value = true;
  try {
    const [msgRes, cfgRes] = await Promise.all([
      channelMessagesApi.list({ personId: props.personId }),
      channelConfigsApi.list(),
    ]);
    messages.value = msgRes.items.reverse();
    configs.value = cfgRes.filter((c) => c.isActive);
    if (configs.value.length > 0 && !selectedConfigId.value) {
      selectedConfigId.value = configs.value[0].id;
    }
  } finally {
    loading.value = false;
  }
}

async function sendMessage() {
  if (!newMessage.value.trim() || !selectedConfigId.value) return;
  await channelMessagesApi.send({
    channelConfigId: selectedConfigId.value,
    personId: props.personId,
    content: newMessage.value,
  });
  newMessage.value = '';
  load();
}

onMounted(load);
</script>

<template>
  <div data-test="person-messages" class="flex flex-col h-full">
    <div class="flex-1 overflow-y-auto p-3 space-y-2">
      <div
        v-for="msg in messages"
        :key="msg.id"
        :class="[
          'max-w-[75%] p-3 rounded-lg text-sm',
          msg.direction === 'OUT' ? 'ml-auto bg-primary text-white' : 'mr-auto bg-surface-100',
        ]"
      >
        <p>{{ msg.content }}</p>
        <span class="text-xs opacity-70">{{ new Date(msg.createdAt).toLocaleTimeString() }}</span>
      </div>
      <p v-if="!loading && messages.length === 0" class="text-center text-surface-400 py-8">
        {{ t('channels.noMessages') }}
      </p>
    </div>
    <div class="border-t p-3 flex gap-2">
      <Select
        v-model="selectedConfigId"
        :options="configs.map(c => ({ label: c.name, value: c.id }))"
        option-label="label"
        option-value="value"
        class="w-48"
        :placeholder="t('channels.selectChannel')"
      />
      <InputText
        v-model="newMessage"
        :placeholder="t('channels.typeMessage')"
        class="flex-1"
        @keyup.enter="sendMessage"
      />
      <Button icon="pi pi-send" @click="sendMessage" />
    </div>
  </div>
</template>
