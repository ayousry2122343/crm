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
import { emailSyncApi, type EmailAccount, type EmailProvider } from '@/api/email-sync';

const { t } = useI18n();

const accounts = ref<EmailAccount[]>([]);
const showDialog = ref(false);
const provider = ref<EmailProvider>('GMAIL');
const emailAddress = ref('');
const accessToken = ref('');

const providerOptions = [
  { label: 'Gmail', value: 'GMAIL' as const },
  { label: 'Outlook', value: 'OUTLOOK' as const },
];

async function load() {
  accounts.value = await emailSyncApi.listAccounts();
}

async function connect() {
  if (!emailAddress.value.trim() || !accessToken.value.trim()) return;
  await emailSyncApi.connectAccount({
    provider: provider.value,
    emailAddress: emailAddress.value.trim(),
    accessToken: accessToken.value.trim(),
  });
  showDialog.value = false;
  emailAddress.value = '';
  accessToken.value = '';
  await load();
}

async function disconnect(id: string) {
  await emailSyncApi.disconnectAccount(id);
  await load();
}

onMounted(load);
</script>

<template>
  <div data-test="email-accounts-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('emailSync.title') }}</h1>
      <Button :label="t('emailSync.connectAccount')" icon="pi pi-plus" @click="showDialog = true" data-test="connect-btn" />
    </div>

    <DataTable :value="accounts" striped-rows data-test="accounts-table">
      <template #empty>
        <div class="text-sm text-slate-400 p-4">{{ t('emailSync.noAccounts') }}</div>
      </template>
      <Column field="emailAddress" :header="t('emailSync.email')" />
      <Column field="provider" :header="t('emailSync.provider')">
        <template #body="{ data }">
          <Tag :value="data.provider" :severity="data.provider === 'GMAIL' ? 'danger' : 'info'" />
        </template>
      </Column>
      <Column :header="t('emailSync.syncState')">
        <template #body="{ data }">
          <Tag
            :value="data.syncState"
            :severity="data.syncState === 'IDLE' ? 'success' : data.syncState === 'ERROR' ? 'danger' : 'warn'"
          />
        </template>
      </Column>
      <Column field="lastSyncAt" :header="t('emailSync.lastSync')" />
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <Button icon="pi pi-trash" severity="danger" size="small" text @click="disconnect(data.id)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showDialog" :header="t('emailSync.connectAccount')" modal class="w-[28rem]">
      <div class="flex flex-col gap-3">
        <div>
          <label class="text-sm font-medium mb-1 block">{{ t('emailSync.provider') }}</label>
          <Select v-model="provider" :options="providerOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <div>
          <label class="text-sm font-medium mb-1 block">{{ t('emailSync.email') }}</label>
          <InputText v-model="emailAddress" class="w-full" placeholder="you@example.com" />
        </div>
        <div>
          <label class="text-sm font-medium mb-1 block">{{ t('emailSync.accessToken') }}</label>
          <InputText v-model="accessToken" class="w-full" :placeholder="t('emailSync.tokenHint')" />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" @click="showDialog = false" />
        <Button :label="t('emailSync.connect')" @click="connect" />
      </template>
    </Dialog>
  </div>
</template>
