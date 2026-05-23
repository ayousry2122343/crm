<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { channelConfigsApi, type ChannelConfig, type CreateChannelConfigInput } from '@/api/channels';

const { t } = useI18n();

const configs = ref<ChannelConfig[]>([]);
const loading = ref(true);
const showCreate = ref(false);

const form = ref<CreateChannelConfigInput>({
  name: '',
  provider: 'TWILIO',
  credentials: { accountSid: '', authToken: '' },
  phoneNumber: '',
});

const providerOptions = [
  { label: 'Twilio SMS', value: 'TWILIO' },
  { label: 'WhatsApp Cloud', value: 'WHATSAPP_CLOUD' },
];

async function load() {
  loading.value = true;
  try {
    configs.value = await channelConfigsApi.list();
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  await channelConfigsApi.create(form.value);
  showCreate.value = false;
  form.value = { name: '', provider: 'TWILIO', credentials: { accountSid: '', authToken: '' }, phoneNumber: '' };
  load();
}

async function toggleActive(config: ChannelConfig) {
  await channelConfigsApi.update(config.id, { isActive: !config.isActive } as any);
  load();
}

onMounted(load);
</script>

<template>
  <div data-test="channel-settings-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('channels.title') }}</h1>
      <Button :label="t('channels.addChannel')" icon="pi pi-plus" @click="showCreate = true" />
    </div>

    <DataTable :value="configs" :loading="loading" striped-rows>
      <Column field="name" :header="t('channels.name')" />
      <Column field="provider" :header="t('channels.provider')">
        <template #body="{ data }">
          <Tag :value="data.provider" severity="info" />
        </template>
      </Column>
      <Column field="phoneNumber" :header="t('channels.phoneNumber')" />
      <Column :header="t('channels.status')">
        <template #body="{ data }">
          <Tag :value="data.isActive ? t('common.active') : t('common.inactive')" :severity="data.isActive ? 'success' : 'secondary'" />
        </template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <Button :label="data.isActive ? t('common.deactivate') : t('common.activate')" severity="secondary" text size="small" @click="toggleActive(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showCreate" :header="t('channels.addChannel')" modal class="w-full max-w-lg">
      <div class="flex flex-col gap-4">
        <div>
          <label class="block mb-1 font-medium">{{ t('channels.name') }}</label>
          <InputText v-model="form.name" class="w-full" />
        </div>
        <div>
          <label class="block mb-1 font-medium">{{ t('channels.provider') }}</label>
          <Select v-model="form.provider" :options="providerOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <div>
          <label class="block mb-1 font-medium">{{ t('channels.phoneNumber') }}</label>
          <InputText v-model="form.phoneNumber" placeholder="+15551234567" class="w-full" />
        </div>
        <div>
          <label class="block mb-1 font-medium">Account SID</label>
          <InputText v-model="(form.credentials as any).accountSid" class="w-full" />
        </div>
        <div>
          <label class="block mb-1 font-medium">Auth Token</label>
          <InputText v-model="(form.credentials as any).authToken" type="password" class="w-full" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" text @click="showCreate = false" />
        <Button :label="t('common.save')" @click="handleCreate" />
      </template>
    </Dialog>
  </div>
</template>
