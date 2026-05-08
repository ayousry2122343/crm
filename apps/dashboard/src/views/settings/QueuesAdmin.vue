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
import Tag from 'primevue/tag';
import { queuesApi, type Queue, type CreateQueueInput } from '@/api/queues';
import { useAppToast } from '@/composables/useAppToast';

const { t } = useI18n();
const toast = useAppToast();

const queues = ref<Queue[]>([]);
const loading = ref(true);
const showDialog = ref(false);
const editing = ref<Queue | null>(null);
const saving = ref(false);

const form = ref<CreateQueueInput>({
  name: '',
  description: '',
  assignmentMode: 'MANUAL',
  members: [],
});

const modeOptions = [
  { label: t('queues.modes.manual'), value: 'MANUAL' },
  { label: t('queues.modes.roundRobin'), value: 'ROUND_ROBIN' },
  { label: t('queues.modes.leastActive'), value: 'LEAST_ACTIVE' },
];

const modeSeverity: Record<string, string> = {
  MANUAL: 'secondary',
  ROUND_ROBIN: 'info',
  LEAST_ACTIVE: 'success',
};

async function fetch() {
  loading.value = true;
  try {
    const res = await queuesApi.list();
    queues.value = res.items;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.value = { name: '', description: '', assignmentMode: 'MANUAL', members: [] };
  showDialog.value = true;
}

function openEdit(queue: Queue) {
  editing.value = queue;
  form.value = {
    name: queue.name,
    description: queue.description ?? '',
    assignmentMode: queue.assignmentMode,
    members: [...queue.members],
  };
  showDialog.value = true;
}

async function save() {
  saving.value = true;
  try {
    if (editing.value) {
      await queuesApi.update(editing.value.id, form.value);
      toast.success(t('queues.updated'));
    } else {
      await queuesApi.create(form.value);
      toast.success(t('queues.created'));
    }
    showDialog.value = false;
    await fetch();
  } finally {
    saving.value = false;
  }
}

async function archive(queue: Queue) {
  await queuesApi.archive(queue.id);
  toast.success(t('queues.archived'));
  await fetch();
}

function modeLabel(mode: string): string {
  const map: Record<string, string> = {
    MANUAL: t('queues.modes.manual'),
    ROUND_ROBIN: t('queues.modes.roundRobin'),
    LEAST_ACTIVE: t('queues.modes.leastActive'),
  };
  return map[mode] ?? mode;
}

onMounted(fetch);
</script>

<template>
  <div data-test="queues-admin-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('queues.title') }}</h1>
      <Button
        :label="t('queues.create')"
        icon="pi pi-plus"
        data-test="create-queue-btn"
        @click="openCreate"
      />
    </div>

    <DataTable
      :value="queues"
      :loading="loading"
      data-test="queues-table"
    >
      <Column field="name" :header="t('queues.name')" />
      <Column field="description" :header="t('queues.description')" />
      <Column :header="t('queues.assignmentMode')">
        <template #body="{ data }">
          <Tag
            :value="modeLabel(data.assignmentMode)"
            :severity="modeSeverity[data.assignmentMode] ?? 'info'"
            data-test="mode-tag"
          />
        </template>
      </Column>
      <Column :header="t('queues.memberCount')">
        <template #body="{ data }">{{ data.members?.length ?? 0 }}</template>
      </Column>
      <Column :header="t('queues.createdAt') || t('tickets.createdAt')">
        <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleDateString() }}
        </template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              size="small"
              data-test="edit-queue-btn"
              @click="openEdit(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              data-test="delete-queue-btn"
              @click="archive(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="showDialog"
      :header="editing ? t('queues.edit') : t('queues.create')"
      modal
      class="w-full max-w-lg"
      data-test="queue-dialog"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('queues.name') }}</label>
          <InputText v-model="form.name" class="w-full" data-test="queue-name-input" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('queues.description') }}</label>
          <Textarea v-model="form.description" rows="2" class="w-full" data-test="queue-desc-input" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('queues.assignmentMode') }}</label>
          <Select
            v-model="form.assignmentMode"
            :options="modeOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            data-test="queue-mode-select"
          />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" @click="showDialog = false" />
        <Button :label="t('common.save')" :loading="saving" data-test="save-queue-btn" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
