<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import {
  slaPolicyApi,
  businessHoursApi,
  type SLAPolicy,
  type BusinessHours,
  type CreateSLAPolicyInput,
  type SLARule,
} from '@/api/sla';
import { useAppToast } from '@/composables/useAppToast';

const { t } = useI18n();
const toast = useAppToast();

const policies = ref<SLAPolicy[]>([]);
const bhList = ref<BusinessHours[]>([]);
const loading = ref(true);
const showDialog = ref(false);
const editing = ref<SLAPolicy | null>(null);
const saving = ref(false);

const priorities: SLARule['priority'][] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const breachActionOptions = [
  { label: t('sla.actions.notify'), value: 'NOTIFY' },
  { label: t('sla.actions.escalate'), value: 'ESCALATE' },
  { label: t('sla.actions.reassign'), value: 'REASSIGN' },
];

function defaultRules(): SLARule[] {
  return [
    { priority: 'LOW', firstResponseMinutes: 480, resolutionMinutes: 2880, breachAction: 'NOTIFY' },
    { priority: 'MEDIUM', firstResponseMinutes: 240, resolutionMinutes: 1440, breachAction: 'NOTIFY' },
    { priority: 'HIGH', firstResponseMinutes: 60, resolutionMinutes: 480, breachAction: 'ESCALATE' },
    { priority: 'URGENT', firstResponseMinutes: 30, resolutionMinutes: 240, breachAction: 'ESCALATE' },
  ];
}

const form = ref<CreateSLAPolicyInput>({
  name: '',
  description: '',
  businessHoursId: '',
  isDefault: false,
  rules: defaultRules(),
});

async function fetch() {
  loading.value = true;
  try {
    const [pRes, bhRes] = await Promise.all([slaPolicyApi.list(), businessHoursApi.list()]);
    policies.value = pRes.items;
    bhList.value = bhRes.items;
  } finally {
    loading.value = false;
  }
}

function bhName(id: string): string {
  return bhList.value.find((b) => b.id === id)?.name ?? '—';
}

function openCreate() {
  editing.value = null;
  form.value = { name: '', description: '', businessHoursId: '', isDefault: false, rules: defaultRules() };
  showDialog.value = true;
}

function openEdit(policy: SLAPolicy) {
  editing.value = policy;
  form.value = {
    name: policy.name,
    description: policy.description ?? '',
    businessHoursId: policy.businessHoursId,
    isDefault: policy.isDefault,
    rules: policy.rules.map((r) => ({ ...r })),
  };
  showDialog.value = true;
}

async function save() {
  saving.value = true;
  try {
    if (editing.value) {
      await slaPolicyApi.update(editing.value.id, form.value);
      toast.success(t('common.saved') || 'Saved');
    } else {
      await slaPolicyApi.create(form.value as CreateSLAPolicyInput);
      toast.success(t('common.saved') || 'Saved');
    }
    showDialog.value = false;
    await fetch();
  } finally {
    saving.value = false;
  }
}

async function archive(policy: SLAPolicy) {
  await slaPolicyApi.archive(policy.id);
  toast.success(t('common.deleted') || 'Deleted');
  await fetch();
}

onMounted(fetch);
</script>

<template>
  <div data-test="sla-policies-admin-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('sla.title') }}</h1>
      <Button
        :label="t('sla.create')"
        icon="pi pi-plus"
        data-test="create-sla-btn"
        @click="openCreate"
      />
    </div>

    <DataTable
      :value="policies"
      :loading="loading"
      data-test="sla-table"
    >
      <Column field="name" :header="t('sla.name')" />
      <Column field="description" :header="t('sla.description')" />
      <Column :header="t('sla.businessHours')">
        <template #body="{ data }">{{ bhName(data.businessHoursId) }}</template>
      </Column>
      <Column :header="t('sla.isDefault')">
        <template #body="{ data }">
          <Tag v-if="data.isDefault" value="Default" severity="success" />
        </template>
      </Column>
      <Column :header="t('sla.rulesCount')">
        <template #body="{ data }">{{ (data.rules ?? []).length }}</template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              size="small"
              data-test="edit-sla-btn"
              @click="openEdit(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              data-test="delete-sla-btn"
              @click="archive(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="showDialog"
      :header="editing ? t('sla.edit') : t('sla.create')"
      modal
      class="w-full max-w-3xl"
      data-test="sla-dialog"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('sla.name') }}</label>
          <InputText v-model="form.name" class="w-full" data-test="sla-name-input" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('sla.description') }}</label>
          <Textarea v-model="form.description" rows="2" class="w-full" data-test="sla-desc-input" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('sla.businessHours') }}</label>
          <Select
            v-model="form.businessHoursId"
            :options="bhList.map(b => ({ label: b.name, value: b.id }))"
            option-label="label"
            option-value="value"
            class="w-full"
            data-test="sla-bh-select"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('sla.rules') }}</label>
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr class="border-b">
                <th class="text-start p-2">{{ t('sla.priority') }}</th>
                <th class="text-start p-2">{{ t('sla.firstResponse') }} ({{ t('sla.minutes') }})</th>
                <th class="text-start p-2">{{ t('sla.resolution') }} ({{ t('sla.minutes') }})</th>
                <th class="text-start p-2">{{ t('sla.breachAction') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(rule, idx) in form.rules" :key="rule.priority" class="border-b">
                <td class="p-2 font-medium">{{ rule.priority }}</td>
                <td class="p-2">
                  <InputText
                    v-model.number="rule.firstResponseMinutes"
                    type="number"
                    class="w-24"
                    :data-test="`rule-${idx}-fr`"
                  />
                </td>
                <td class="p-2">
                  <InputText
                    v-model.number="rule.resolutionMinutes"
                    type="number"
                    class="w-24"
                    :data-test="`rule-${idx}-res`"
                  />
                </td>
                <td class="p-2">
                  <Select
                    v-model="rule.breachAction"
                    :options="breachActionOptions"
                    option-label="label"
                    option-value="value"
                    class="w-36"
                    :data-test="`rule-${idx}-action`"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" @click="showDialog = false" />
        <Button :label="t('common.save')" :loading="saving" data-test="save-sla-btn" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
