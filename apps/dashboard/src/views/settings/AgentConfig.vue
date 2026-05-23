<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import Tag from 'primevue/tag';
import InputSwitch from 'primevue/inputswitch';
import { agentConfigsApi, type AgentConfig } from '@/api/agent';

const { t } = useI18n();

const configs = ref<AgentConfig[]>([]);
const loading = ref(true);
const showCreate = ref(false);

const form = ref({
  name: '',
  type: 'SERVICE',
  provider: 'ollama',
  model: 'llama3.1:8b',
  systemPrompt: 'You are a helpful customer service agent. Answer questions using the knowledge base. If you cannot help, escalate to a human agent.',
  tools: ['searchKB', 'getTicketDetails', 'getPersonProfile', 'escalateToHuman', 'resolveTicket', 'suggestArticle'],
  enabled: false,
  queueIds: [] as string[],
  maxTurnsBeforeEscalation: 5,
  confidenceThreshold: 0.7,
  responseLanguage: 'auto',
});

const typeOptions = [
  { label: 'Service Agent', value: 'SERVICE' },
  { label: 'Sales Agent', value: 'SALES' },
];

const providerOptions = [
  { label: 'Ollama (Free)', value: 'ollama' },
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
];

async function load() {
  loading.value = true;
  try {
    configs.value = await agentConfigsApi.list();
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  await agentConfigsApi.create(form.value);
  showCreate.value = false;
  load();
}

async function toggleEnabled(config: AgentConfig) {
  await agentConfigsApi.update(config.id, { enabled: !config.enabled });
  load();
}

onMounted(load);
</script>

<template>
  <div data-test="agent-config-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('agent.title') }}</h1>
      <Button :label="t('agent.createAgent')" icon="pi pi-plus" @click="showCreate = true" />
    </div>

    <DataTable :value="configs" :loading="loading" striped-rows>
      <Column field="name" :header="t('agent.name')" />
      <Column field="type" :header="t('agent.type')">
        <template #body="{ data }">
          <Tag :value="data.type" severity="info" />
        </template>
      </Column>
      <Column field="provider" :header="t('agent.provider')" />
      <Column field="model" :header="t('agent.model')" />
      <Column :header="t('channels.status')">
        <template #body="{ data }">
          <InputSwitch :model-value="data.enabled" @update:model-value="toggleEnabled(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showCreate" :header="t('agent.createAgent')" modal class="w-full max-w-2xl">
      <div class="flex flex-col gap-4">
        <div>
          <label class="block mb-1 font-medium">{{ t('agent.name') }}</label>
          <InputText v-model="form.name" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">{{ t('agent.type') }}</label>
            <Select v-model="form.type" :options="typeOptions" option-label="label" option-value="value" class="w-full" />
          </div>
          <div>
            <label class="block mb-1 font-medium">{{ t('agent.provider') }}</label>
            <Select v-model="form.provider" :options="providerOptions" option-label="label" option-value="value" class="w-full" />
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium">{{ t('agent.systemPrompt') }}</label>
          <Textarea v-model="form.systemPrompt" rows="5" class="w-full" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">{{ t('agent.maxTurns') }}</label>
            <InputNumber v-model="form.maxTurnsBeforeEscalation" :min="1" :max="20" class="w-full" />
          </div>
          <div>
            <label class="block mb-1 font-medium">{{ t('agent.confidenceThreshold') }}</label>
            <InputNumber v-model="form.confidenceThreshold" :min="0" :max="1" :step="0.1" mode="decimal" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" text @click="showCreate = false" />
        <Button :label="t('common.save')" @click="handleCreate" />
      </template>
    </Dialog>
  </div>
</template>
