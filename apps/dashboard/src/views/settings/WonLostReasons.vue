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
import { wonLostReasonsApi, type WonLostReason, type WonLostKind } from '@/api/won-lost-reasons';

const { t } = useI18n();

const reasons = ref<WonLostReason[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const creating = ref(false);
const newLabel = ref('');
const newKind = ref<WonLostKind>('WON');
const editingId = ref<string | null>(null);
const editLabel = ref('');

const kindOptions = [
  { label: 'Won', value: 'WON' as const },
  { label: 'Lost', value: 'LOST' as const },
];

async function load() {
  loading.value = true;
  try {
    const res = await wonLostReasonsApi.list();
    reasons.value = res.items;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  if (!newLabel.value.trim()) return;
  creating.value = true;
  try {
    await wonLostReasonsApi.create({
      kind: newKind.value,
      label: newLabel.value.trim(),
      order: reasons.value.filter((r) => r.kind === newKind.value).length,
    });
    newLabel.value = '';
    newKind.value = 'WON';
    showCreate.value = false;
    await load();
  } finally {
    creating.value = false;
  }
}

function startEdit(reason: WonLostReason) {
  editingId.value = reason.id;
  editLabel.value = reason.label;
}

async function saveEdit(id: string) {
  if (!editLabel.value.trim()) return;
  await wonLostReasonsApi.update(id, { label: editLabel.value.trim() });
  editingId.value = null;
  await load();
}

async function handleDelete(id: string) {
  await wonLostReasonsApi.delete(id);
  await load();
}

onMounted(load);
</script>

<template>
  <div data-test="won-lost-reasons-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('wonLostReasons.title') }}</h1>
      <Button
        :label="t('wonLostReasons.addReason')"
        icon="pi pi-plus"
        data-test="add-reason-btn"
        @click="showCreate = true"
      />
    </div>

    <DataTable
      :value="reasons"
      :loading="loading"
      striped-rows
      data-test="reasons-table"
    >
      <template #empty>
        <div class="text-center py-4 text-slate-500">{{ t('wonLostReasons.noReasons') }}</div>
      </template>
      <Column field="kind" :header="t('wonLostReasons.kind')" sortable>
        <template #body="{ data }">
          <Tag
            :value="data.kind === 'WON' ? t('wonLostReasons.won') : t('wonLostReasons.lost')"
            :severity="data.kind === 'WON' ? 'success' : 'danger'"
          />
        </template>
      </Column>
      <Column field="label" :header="t('wonLostReasons.label')" sortable>
        <template #body="{ data }">
          <template v-if="editingId === data.id">
            <div class="flex gap-2 items-center">
              <InputText v-model="editLabel" class="w-full" size="small" />
              <Button icon="pi pi-check" severity="success" size="small" @click="saveEdit(data.id)" />
              <Button icon="pi pi-times" severity="secondary" size="small" @click="editingId = null" />
            </div>
          </template>
          <template v-else>
            {{ data.label }}
          </template>
        </template>
      </Column>
      <Column field="order" :header="t('wonLostReasons.order')" sortable style="width: 100px" />
      <Column :header="t('common.actions')" style="width: 120px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              size="small"
              text
              @click="startEdit(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              size="small"
              text
              @click="handleDelete(data.id)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="showCreate"
      :header="t('wonLostReasons.addReason')"
      modal
      class="w-full max-w-sm"
    >
      <div class="flex flex-col gap-4">
        <Select
          v-model="newKind"
          :options="kindOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          data-test="reason-kind-select"
        />
        <InputText
          v-model="newLabel"
          :placeholder="t('wonLostReasons.label')"
          class="w-full"
          data-test="reason-label-input"
        />
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showCreate = false" />
          <Button :label="t('common.save')" :loading="creating" @click="handleCreate" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
