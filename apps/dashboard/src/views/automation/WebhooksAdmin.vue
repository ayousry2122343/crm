<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import MultiSelect from 'primevue/multiselect';
import { webhooksApi, type Webhook } from '@/api/webhooks';

const { t } = useI18n();

const webhooks = ref<Webhook[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const creating = ref(false);
const newUrl = ref('');
const newEvents = ref<string[]>([]);

const eventOptions = [
  'person.created', 'person.updated', 'person.deleted',
  'deal.created', 'deal.updated', 'deal.deleted',
  'deal.won', 'deal.lost', 'deal.stage_changed',
  'activity.created', 'activity.completed',
  'form.submitted',
].map((e) => ({ label: e, value: e }));

async function load() {
  loading.value = true;
  try {
    webhooks.value = await webhooksApi.list();
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  if (!newUrl.value.trim() || newEvents.value.length === 0) return;
  creating.value = true;
  try {
    await webhooksApi.create({ url: newUrl.value.trim(), events: newEvents.value });
    newUrl.value = '';
    newEvents.value = [];
    showCreate.value = false;
    await load();
  } finally {
    creating.value = false;
  }
}

async function toggleEnabled(wh: Webhook) {
  await webhooksApi.update(wh.id, { enabled: !wh.enabled });
  await load();
}

async function handleDelete(id: string) {
  await webhooksApi.delete(id);
  await load();
}

onMounted(load);
</script>

<template>
  <div data-test="webhooks-admin-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('webhook.title') }}</h1>
      <Button :label="t('webhook.addWebhook')" icon="pi pi-plus" data-test="add-webhook-btn" @click="showCreate = true" />
    </div>

    <DataTable :value="webhooks" :loading="loading" striped-rows data-test="webhooks-table">
      <template #empty>
        <div class="text-center py-4 text-slate-500">{{ t('webhook.noWebhooks') }}</div>
      </template>
      <Column field="url" :header="t('webhook.url')" sortable />
      <Column :header="t('webhook.events')">
        <template #body="{ data }">
          <div class="flex gap-1 flex-wrap">
            <Tag v-for="ev in data.events" :key="ev" :value="ev" severity="info" class="text-xs" />
          </div>
        </template>
      </Column>
      <Column :header="t('workflow.status')">
        <template #body="{ data }">
          <Tag :value="data.enabled ? t('workflow.enabled') : t('workflow.disabled')" :severity="data.enabled ? 'success' : 'secondary'" />
        </template>
      </Column>
      <Column :header="t('common.actions')" style="width: 120px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button :icon="data.enabled ? 'pi pi-pause' : 'pi pi-play'" severity="secondary" size="small" text @click="toggleEnabled(data)" />
            <Button icon="pi pi-trash" severity="danger" size="small" text @click="handleDelete(data.id)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showCreate" :header="t('webhook.addWebhook')" modal class="w-full max-w-md">
      <div class="flex flex-col gap-4">
        <InputText v-model="newUrl" placeholder="https://..." class="w-full" data-test="webhook-url-input" />
        <MultiSelect
          v-model="newEvents"
          :options="eventOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('webhook.selectEvents')"
          class="w-full"
          data-test="webhook-events-select"
        />
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showCreate = false" />
          <Button :label="t('common.save')" :loading="creating" @click="handleCreate" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
