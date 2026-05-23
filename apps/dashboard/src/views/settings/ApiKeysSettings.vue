<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import MultiSelect from 'primevue/multiselect';
import Message from 'primevue/message';
import { apiKeysApi, type ApiKey } from '@/api/api-keys';

const { t } = useI18n();
const keys = ref<ApiKey[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const showRawKey = ref(false);
const rawKey = ref('');
const copied = ref(false);
const form = ref({ name: '', scopes: [] as string[], expiresAt: '' });

const availableScopes = [
  'ticket:read', 'ticket:write', 'person:read', 'person:write',
  'deal:read', 'deal:write', 'activity:read', 'activity:write',
  'report:read', 'kb:read',
];

async function load() {
  loading.value = true;
  try {
    keys.value = await apiKeysApi.list();
  } finally {
    loading.value = false;
  }
}

async function create() {
  const result = await apiKeysApi.create({
    name: form.value.name,
    scopes: form.value.scopes,
    ...(form.value.expiresAt ? { expiresAt: form.value.expiresAt } : {}),
  });
  rawKey.value = result.rawKey;
  showCreate.value = false;
  showRawKey.value = true;
  form.value = { name: '', scopes: [], expiresAt: '' };
  await load();
}

async function revoke(id: string) {
  await apiKeysApi.revoke(id);
  await load();
}

function copyKey() {
  navigator.clipboard.writeText(rawKey.value);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

onMounted(load);
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">{{ t('apiKeys.title') }}</h1>
      <Button :label="t('apiKeys.create')" icon="pi pi-plus" @click="showCreate = true" />
    </div>

    <DataTable :value="keys" :loading="loading" stripedRows>
      <Column field="name" :header="t('common.name')" />
      <Column field="prefix" :header="t('apiKeys.prefix')" />
      <Column field="scopes" :header="t('apiKeys.scopes')">
        <template #body="{ data }">{{ data.scopes.join(', ') }}</template>
      </Column>
      <Column field="lastUsedAt" :header="t('apiKeys.lastUsed')">
        <template #body="{ data }">
          {{ data.lastUsedAt ? new Date(data.lastUsedAt).toLocaleDateString() : t('common.never') }}
        </template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <Button :label="t('apiKeys.revoke')" severity="danger" text @click="revoke(data.id)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showCreate" :header="t('apiKeys.create')" modal class="w-[500px]">
      <form class="flex flex-col gap-4" @submit.prevent="create">
        <InputText v-model="form.name" :placeholder="t('apiKeys.nameHint')" required />
        <MultiSelect
          v-model="form.scopes"
          :options="availableScopes"
          :placeholder="t('apiKeys.selectScopes')"
        />
        <Button type="submit" :label="t('apiKeys.generate')" />
      </form>
    </Dialog>

    <Dialog v-model:visible="showRawKey" :header="t('apiKeys.keyCreated')" modal :closable="false" class="w-[500px]">
      <div class="flex flex-col gap-4">
        <Message severity="warn" :closable="false">{{ t('apiKeys.copyWarning') }}</Message>
        <code class="bg-gray-100 p-3 rounded break-all select-all text-sm">{{ rawKey }}</code>
        <div class="flex gap-2">
          <Button :label="copied ? t('apiKeys.copied') : t('common.copy')" @click="copyKey" />
          <Button :label="t('common.done')" severity="secondary" @click="showRawKey = false" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
