<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { auditApi, type AuditLogEntry } from '@/api/audit';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import Message from 'primevue/message';

const { t } = useI18n();
const logs = ref<AuditLogEntry[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const nextCursor = ref<string | null>(null);

const filterEntityType = ref('');
const filterAction = ref('');
const filterUserId = ref('');

const actionOptions = [
  { label: t('audit.allActions'), value: '' },
  { label: 'Create', value: 'CREATE' },
  { label: 'Update', value: 'UPDATE' },
  { label: 'Delete', value: 'DELETE' },
  { label: 'Restore', value: 'RESTORE' },
];

const actionSeverity: Record<string, string> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  RESTORE: 'warn',
};

onMounted(load);

watch([filterEntityType, filterAction, filterUserId], () => {
  logs.value = [];
  nextCursor.value = null;
  load();
});

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = {};
    if (filterEntityType.value) params.entityType = filterEntityType.value;
    if (filterAction.value) params.action = filterAction.value;
    if (filterUserId.value) params.userId = filterUserId.value;
    if (nextCursor.value) params.cursor = nextCursor.value;

    const res = await auditApi.list(params);
    logs.value = [...logs.value, ...res.items];
    nextCursor.value = res.nextCursor;
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message;
  } finally {
    loading.value = false;
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleString();
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">{{ t('audit.title') }}</h1>

    <Message v-if="error" severity="error" class="mb-4">{{ error }}</Message>

    <div class="flex gap-4 mb-4">
      <InputText v-model="filterEntityType" :placeholder="t('audit.entityType')" class="w-48" data-test="audit-entity-filter" />
      <Select v-model="filterAction" :options="actionOptions" option-label="label" option-value="value" :placeholder="t('audit.action')" class="w-40" />
      <InputText v-model="filterUserId" :placeholder="t('audit.userId')" class="w-48" />
    </div>

    <DataTable :value="logs" :loading="loading" striped-rows data-test="audit-table">
      <Column :header="t('audit.timestamp')">
        <template #body="{ data }">{{ formatDate(data.createdAt) }}</template>
      </Column>
      <Column field="entityType" :header="t('audit.entityType')" sortable />
      <Column :header="t('audit.action')">
        <template #body="{ data }">
          <Tag :value="data.action" :severity="actionSeverity[data.action] as any" />
        </template>
      </Column>
      <Column field="fieldKey" :header="t('audit.field')" />
      <Column :header="t('audit.oldValue')">
        <template #body="{ data }">
          <span class="text-xs font-mono">{{ formatValue(data.oldValue) }}</span>
        </template>
      </Column>
      <Column :header="t('audit.newValue')">
        <template #body="{ data }">
          <span class="text-xs font-mono">{{ formatValue(data.newValue) }}</span>
        </template>
      </Column>
      <Column field="userId" :header="t('audit.userId')" />
      <template #empty>{{ t('common.noData') }}</template>
    </DataTable>

    <div v-if="nextCursor" class="mt-4 text-center">
      <Button :label="t('common.loadMore')" severity="secondary" @click="load" />
    </div>
  </div>
</template>
