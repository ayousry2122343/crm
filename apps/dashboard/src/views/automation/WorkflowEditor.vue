<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import InputSwitch from 'primevue/inputswitch';
import Tag from 'primevue/tag';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import {
  workflowsApi,
  type Workflow,
  type WorkflowAction,
  type ConditionItem,
  type WorkflowRun,
} from '@/api/workflows';

const props = defineProps<{ id: string }>();

const { t } = useI18n();
const router = useRouter();

const isNew = computed(() => props.id === 'new');
const saving = ref(false);
const loading = ref(false);
const runs = ref<WorkflowRun[]>([]);

const name = ref('');
const entityType = ref('Person');
const enabled = ref(true);
const triggerEvent = ref<string>('CREATED');
const triggerFieldKey = ref('');
const cronExpression = ref('');
const conditions = ref<ConditionItem[]>([]);
const actions = ref<WorkflowAction[]>([]);

const entityTypes = [
  { label: 'Person', value: 'Person' },
  { label: 'Company', value: 'Company' },
  { label: 'Deal', value: 'Deal' },
  { label: 'Activity', value: 'Activity' },
];

const triggerOptions = [
  { label: t('workflow.triggerCreated'), value: 'CREATED' },
  { label: t('workflow.triggerUpdated'), value: 'UPDATED' },
  { label: t('workflow.triggerFieldChanged'), value: 'FIELD_CHANGED' },
  { label: t('workflow.triggerDeleted'), value: 'DELETED' },
  { label: t('workflow.triggerManual'), value: 'MANUAL' },
  { label: t('workflow.triggerScheduled'), value: 'SCHEDULED' },
];

const cronPresets = [
  { label: t('workflow.everyMinute'), value: '* * * * *' },
  { label: t('workflow.daily'), value: '0 9 * * *' },
  { label: t('workflow.weekly'), value: '0 9 * * 1' },
  { label: t('workflow.monthly'), value: '0 9 1 * *' },
];

const operatorOptions = [
  { label: '=', value: 'eq' },
  { label: '!=', value: 'neq' },
  { label: '>', value: 'gt' },
  { label: '>=', value: 'gte' },
  { label: '<', value: 'lt' },
  { label: '<=', value: 'lte' },
  { label: 'contains', value: 'contains' },
  { label: 'is null', value: 'isNull' },
  { label: 'is not null', value: 'isNotNull' },
];

const actionTypes = [
  { label: t('workflow.actionUpdateField'), value: 'UPDATE_FIELD' },
  { label: t('workflow.actionSendEmail'), value: 'SEND_EMAIL' },
  { label: t('workflow.actionCreateTask'), value: 'CREATE_TASK' },
  { label: t('workflow.actionCallWebhook'), value: 'CALL_WEBHOOK' },
  { label: t('workflow.actionNotifyUser'), value: 'NOTIFY_USER' },
  { label: t('workflow.actionAssign'), value: 'ASSIGN' },
];

function addCondition() {
  conditions.value.push({ field: '', op: 'eq', value: '' });
}

function removeCondition(idx: number) {
  conditions.value.splice(idx, 1);
}

function addAction() {
  actions.value.push({ type: 'UPDATE_FIELD', params: {} });
}

function removeAction(idx: number) {
  actions.value.splice(idx, 1);
}

async function save() {
  if (!name.value.trim()) return;
  saving.value = true;
  try {
    const data: Partial<Workflow> = {
      name: name.value.trim(),
      entityType: entityType.value,
      enabled: enabled.value,
      trigger: {
        event: triggerEvent.value as Workflow['trigger']['event'],
        ...(triggerEvent.value === 'FIELD_CHANGED' && triggerFieldKey.value
          ? { fieldKey: triggerFieldKey.value }
          : {}),
      },
      ...(triggerEvent.value === 'SCHEDULED' && cronExpression.value
        ? { cronExpression: cronExpression.value }
        : {}),
      conditions: { op: 'AND' as const, items: conditions.value },
      actions: actions.value,
    };
    if (isNew.value) {
      const wf = await workflowsApi.create(data);
      router.replace({ name: 'workflow-editor', params: { id: wf.id } });
    } else {
      await workflowsApi.update(props.id, data);
    }
  } finally {
    saving.value = false;
  }
}

async function load() {
  if (isNew.value) return;
  loading.value = true;
  try {
    const wf = await workflowsApi.get(props.id);
    name.value = wf.name;
    entityType.value = wf.entityType;
    enabled.value = wf.enabled;
    triggerEvent.value = wf.trigger.event;
    triggerFieldKey.value = wf.trigger.fieldKey ?? '';
    cronExpression.value = wf.cronExpression ?? '';
    conditions.value = (wf.conditions as { items: ConditionItem[] }).items ?? [];
    actions.value = wf.actions;
    runs.value = await workflowsApi.runs(props.id);
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div data-test="workflow-editor-page">
    <div class="flex items-center gap-2 mb-4">
      <Button icon="pi pi-arrow-left" severity="secondary" size="small" @click="router.push({ name: 'workflows' })" />
      <h1 class="text-2xl font-bold">{{ isNew ? t('workflow.addWorkflow') : name }}</h1>
      <div class="flex-1" />
      <label class="flex items-center gap-2 text-sm">
        <InputSwitch v-model="enabled" />
        {{ enabled ? t('workflow.enabled') : t('workflow.disabled') }}
      </label>
      <Button :label="t('common.save')" :loading="saving" @click="save" data-test="save-workflow-btn" />
    </div>

    <div class="grid grid-cols-1 gap-6">
      <!-- Basic Info -->
      <div class="bg-white rounded-lg border p-4">
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="text-sm font-medium mb-1 block">{{ t('workflow.workflowName') }}</label>
            <InputText v-model="name" class="w-full" data-test="workflow-name" />
          </div>
          <div>
            <label class="text-sm font-medium mb-1 block">{{ t('workflow.entityType') }}</label>
            <Select v-model="entityType" :options="entityTypes" option-label="label" option-value="value" class="w-full" />
          </div>
          <div>
            <label class="text-sm font-medium mb-1 block">{{ t('workflow.trigger') }}</label>
            <Select v-model="triggerEvent" :options="triggerOptions" option-label="label" option-value="value" class="w-full" />
          </div>
        </div>
        <div v-if="triggerEvent === 'FIELD_CHANGED'" class="mt-3">
          <label class="text-sm font-medium mb-1 block">{{ t('workflow.fieldKey') }}</label>
          <InputText v-model="triggerFieldKey" class="w-64" placeholder="e.g. lifecycleStage" />
        </div>
        <div v-if="triggerEvent === 'SCHEDULED'" class="mt-3 grid grid-cols-2 gap-4">
          <div>
            <label class="text-sm font-medium mb-1 block">{{ t('workflow.cronExpression') }}</label>
            <InputText v-model="cronExpression" class="w-full" placeholder="* * * * *" data-test="cron-expression" />
          </div>
          <div>
            <label class="text-sm font-medium mb-1 block">{{ t('workflow.cronPreset') }}</label>
            <Select v-model="cronExpression" :options="cronPresets" option-label="label" option-value="value" class="w-full" :placeholder="t('workflow.selectPreset')" />
          </div>
        </div>
      </div>

      <!-- Conditions (IF) -->
      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">{{ t('workflow.conditions') }} (IF)</h2>
          <Button :label="t('workflow.addCondition')" icon="pi pi-plus" size="small" severity="secondary" @click="addCondition" />
        </div>
        <div v-if="conditions.length === 0" class="text-sm text-slate-400">{{ t('workflow.noConditions') }}</div>
        <div v-for="(cond, idx) in conditions" :key="idx" class="flex gap-2 mb-2 items-center">
          <InputText v-model="cond.field" placeholder="field" class="w-40" size="small" />
          <Select v-model="cond.op" :options="operatorOptions" option-label="label" option-value="value" class="w-32" size="small" />
          <InputText v-if="cond.op !== 'isNull' && cond.op !== 'isNotNull'" :model-value="String(cond.value ?? '')" @update:model-value="cond.value = $event" placeholder="value" class="w-40" size="small" />
          <Button icon="pi pi-trash" severity="danger" size="small" text @click="removeCondition(idx)" />
        </div>
      </div>

      <!-- Actions (DO) -->
      <div class="bg-white rounded-lg border p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold">{{ t('workflow.actions') }} (DO)</h2>
          <Button :label="t('workflow.addAction')" icon="pi pi-plus" size="small" severity="secondary" @click="addAction" />
        </div>
        <div v-if="actions.length === 0" class="text-sm text-slate-400">{{ t('workflow.noActions') }}</div>
        <div v-for="(action, idx) in actions" :key="idx" class="border rounded-lg p-3 mb-2">
          <div class="flex gap-2 items-center mb-2">
            <Select v-model="action.type" :options="actionTypes" option-label="label" option-value="value" class="w-48" size="small" />
            <div class="flex-1" />
            <Button icon="pi pi-trash" severity="danger" size="small" text @click="removeAction(idx)" />
          </div>
          <!-- Action params -->
          <div v-if="action.type === 'UPDATE_FIELD'" class="grid grid-cols-2 gap-2">
            <InputText :model-value="String(action.params.field ?? '')" @update:model-value="action.params.field = $event" placeholder="field key" size="small" />
            <InputText :model-value="String(action.params.value ?? '')" @update:model-value="action.params.value = $event" placeholder="new value" size="small" />
          </div>
          <div v-else-if="action.type === 'SEND_EMAIL'" class="grid grid-cols-2 gap-2">
            <InputText :model-value="String(action.params.to ?? '')" @update:model-value="action.params.to = $event" placeholder="to (email or {{ field }})" size="small" />
            <InputText :model-value="String(action.params.templateId ?? '')" @update:model-value="action.params.templateId = $event" placeholder="template ID" size="small" />
          </div>
          <div v-else-if="action.type === 'CREATE_TASK'" class="grid grid-cols-2 gap-2">
            <InputText :model-value="String(action.params.subject ?? '')" @update:model-value="action.params.subject = $event" placeholder="task subject" size="small" />
            <InputText :model-value="String(action.params.assignTo ?? '')" @update:model-value="action.params.assignTo = $event" placeholder="assign to user ID" size="small" />
          </div>
          <div v-else-if="action.type === 'CALL_WEBHOOK'">
            <InputText :model-value="String(action.params.url ?? '')" @update:model-value="action.params.url = $event" placeholder="webhook URL" size="small" class="w-full" />
          </div>
          <div v-else-if="action.type === 'ASSIGN'">
            <InputText :model-value="String(action.params.userId ?? '')" @update:model-value="action.params.userId = $event" placeholder="user ID to assign" size="small" class="w-64" />
          </div>
          <div v-else-if="action.type === 'NOTIFY_USER'">
            <InputText :model-value="String(action.params.message ?? '')" @update:model-value="action.params.message = $event" placeholder="notification message" size="small" class="w-full" />
          </div>
        </div>
      </div>

      <!-- Run History -->
      <div v-if="!isNew" class="bg-white rounded-lg border p-4">
        <h2 class="font-semibold mb-3">{{ t('workflow.runHistory') }}</h2>
        <DataTable :value="runs" striped-rows>
          <template #empty>
            <div class="text-sm text-slate-400">{{ t('workflow.noRuns') }}</div>
          </template>
          <Column field="triggeredAt" :header="t('workflow.triggeredAt')" sortable />
          <Column :header="t('workflow.status')">
            <template #body="{ data }">
              <Tag
                :value="data.status"
                :severity="data.status === 'SUCCESS' ? 'success' : data.status === 'FAILED' ? 'danger' : 'info'"
              />
            </template>
          </Column>
          <Column field="triggeredByEntity" :header="t('workflow.entityType')" />
          <Column field="error" :header="t('workflow.error')" />
        </DataTable>
      </div>
    </div>
  </div>
</template>
