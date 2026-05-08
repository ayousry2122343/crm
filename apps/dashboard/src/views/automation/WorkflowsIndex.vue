<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { workflowsApi, type Workflow } from '@/api/workflows';

const { t } = useI18n();
const router = useRouter();

const workflows = ref<Workflow[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    workflows.value = await workflowsApi.list();
  } finally {
    loading.value = false;
  }
}

function create() {
  router.push({ name: 'workflow-editor', params: { id: 'new' } });
}

async function toggleEnabled(wf: Workflow) {
  await workflowsApi.update(wf.id, { enabled: !wf.enabled });
  await load();
}

async function handleDelete(id: string) {
  await workflowsApi.delete(id);
  await load();
}

const triggerLabel = (trigger: Workflow['trigger']) => {
  const labels: Record<string, string> = {
    CREATED: t('workflow.triggerCreated'),
    UPDATED: t('workflow.triggerUpdated'),
    DELETED: t('workflow.triggerDeleted'),
    FIELD_CHANGED: t('workflow.triggerFieldChanged'),
    MANUAL: t('workflow.triggerManual'),
    SCHEDULED: t('workflow.triggerScheduled'),
  };
  return labels[trigger.event] ?? trigger.event;
};

onMounted(load);
</script>

<template>
  <div data-test="workflows-index-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('workflow.title') }}</h1>
      <Button
        :label="t('workflow.addWorkflow')"
        icon="pi pi-plus"
        data-test="add-workflow-btn"
        @click="create"
      />
    </div>

    <DataTable :value="workflows" :loading="loading" striped-rows data-test="workflows-table">
      <template #empty>
        <div class="text-center py-4 text-slate-500">{{ t('workflow.noWorkflows') }}</div>
      </template>
      <Column field="name" :header="t('workflow.workflowName')" sortable>
        <template #body="{ data }">
          <router-link :to="{ name: 'workflow-editor', params: { id: data.id } }" class="text-blue-600 hover:underline">
            {{ data.name }}
          </router-link>
        </template>
      </Column>
      <Column field="entityType" :header="t('workflow.entityType')" sortable />
      <Column :header="t('workflow.trigger')">
        <template #body="{ data }">
          <Tag :value="triggerLabel(data.trigger)" severity="info" />
        </template>
      </Column>
      <Column :header="t('workflow.status')">
        <template #body="{ data }">
          <Tag :value="data.enabled ? t('workflow.enabled') : t('workflow.disabled')" :severity="data.enabled ? 'success' : 'secondary'" />
        </template>
      </Column>
      <Column field="cronExpression" :header="t('workflow.cronExpression')">
        <template #body="{ data }">
          <code v-if="data.cronExpression" class="text-xs bg-slate-100 px-2 py-1 rounded">{{ data.cronExpression }}</code>
        </template>
      </Column>
      <Column field="lastRunAt" :header="t('workflow.lastRunAt')">
        <template #body="{ data }">
          <span v-if="data.lastRunAt" class="text-sm">{{ new Date(data.lastRunAt).toLocaleString() }}</span>
        </template>
      </Column>
      <Column :header="t('common.actions')" style="width: 120px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              :icon="data.enabled ? 'pi pi-pause' : 'pi pi-play'"
              severity="secondary"
              size="small"
              text
              @click="toggleEnabled(data)"
            />
            <Button icon="pi pi-trash" severity="danger" size="small" text @click="handleDelete(data.id)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
