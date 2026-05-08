<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Sidebar from 'primevue/sidebar';
import { copilotApi, type CopilotMessage, type CopilotContext } from '@/api/copilot';

const props = defineProps<{
  visible: boolean;
  context?: CopilotContext;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
}>();

const { t } = useI18n();
const input = ref('');
const loading = ref(false);
const messages = ref<CopilotMessage[]>([]);

function getSuggestedPrompts(): string[] {
  switch (props.context?.entityType) {
    case 'Person': return [t('copilot.summarizeContact'), t('copilot.draftFollowUp'), t('copilot.contactHistory')];
    case 'Deal': return [t('copilot.summarizeDeal'), t('copilot.nextSteps'), t('copilot.dealRisk')];
    default: return [t('copilot.recentDeals'), t('copilot.pipelineSummary'), t('copilot.needsFollowUp')];
  }
}

const suggestedPrompts = ref<string[]>(getSuggestedPrompts());

watch(() => props.visible, (val) => {
  if (val && messages.value.length === 0) {
    suggestedPrompts.value = getSuggestedPrompts();
  }
});

async function send(text?: string) {
  const msg = text ?? input.value.trim();
  if (!msg) return;
  input.value = '';
  messages.value.push({ role: 'user', content: msg });
  loading.value = true;
  try {
    const res = await copilotApi.chat(msg, props.context, messages.value.slice(0, -1));
    messages.value.push({ role: 'assistant', content: res.reply });
    suggestedPrompts.value = res.suggestedPrompts;
  } catch {
    messages.value.push({ role: 'assistant', content: t('copilot.error') });
  } finally {
    loading.value = false;
  }
}

function clear() {
  messages.value = [];
  suggestedPrompts.value = getSuggestedPrompts();
}
</script>

<template>
  <Sidebar :visible="props.visible" position="right" class="w-[24rem]" @update:visible="emit('update:visible', $event)" data-test="copilot-sidebar">
    <template #header>
      <div class="flex items-center gap-2 w-full">
        <i class="pi pi-sparkles text-blue-500" />
        <span class="font-bold">{{ t('copilot.title') }}</span>
        <div class="flex-1" />
        <Button icon="pi pi-trash" severity="secondary" text size="small" @click="clear" :title="t('copilot.clearChat')" />
      </div>
    </template>

    <div class="flex flex-col h-full">
      <div class="flex-1 overflow-y-auto mb-3 space-y-3" data-test="chat-messages">
        <div v-if="messages.length === 0" class="text-sm text-slate-400 text-center mt-8">
          {{ t('copilot.startMessage') }}
        </div>
        <div v-for="(msg, idx) in messages" :key="idx"
          class="p-2 rounded-lg text-sm"
          :class="msg.role === 'user' ? 'bg-blue-50 ms-8' : 'bg-slate-50 me-8'"
        >
          <div class="whitespace-pre-wrap">{{ msg.content }}</div>
        </div>
        <div v-if="loading" class="text-sm text-slate-400 animate-pulse">{{ t('copilot.thinking') }}</div>
      </div>

      <div v-if="suggestedPrompts.length > 0 && messages.length === 0" class="flex flex-wrap gap-1 mb-3" data-test="suggested-prompts">
        <Button
          v-for="prompt in suggestedPrompts"
          :key="prompt"
          :label="prompt"
          size="small"
          severity="secondary"
          outlined
          @click="send(prompt)"
        />
      </div>

      <div class="flex gap-2">
        <InputText
          v-model="input"
          :placeholder="t('copilot.placeholder')"
          class="flex-1"
          size="small"
          data-test="copilot-input"
          @keyup.enter="send()"
        />
        <Button icon="pi pi-send" size="small" :loading="loading" @click="send()" data-test="copilot-send" />
      </div>
    </div>
  </Sidebar>
</template>
