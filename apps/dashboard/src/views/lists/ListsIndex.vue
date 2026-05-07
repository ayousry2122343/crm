<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { listsApi, type CrmList } from '@/api/lists';

const { t } = useI18n();
const router = useRouter();

const lists = ref<CrmList[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const creating = ref(false);
const newName = ref('');
const newEntityType = ref('Person');

const entityTypes = [
  { label: 'Person', value: 'Person' },
  { label: 'Company', value: 'Company' },
  { label: 'Deal', value: 'Deal' },
];

async function load() {
  loading.value = true;
  try {
    const res = await listsApi.list();
    lists.value = res.items;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    await listsApi.create({
      name: newName.value.trim(),
      entityType: newEntityType.value,
      isActive: true,
      query: { filters: [] },
    });
    newName.value = '';
    showCreate.value = false;
    await load();
  } finally {
    creating.value = false;
  }
}

function onRowClick(row: { data: CrmList }) {
  router.push({ name: 'list-detail', params: { id: row.data.id } });
}

onMounted(load);
</script>

<template>
  <div data-test="lists-index-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('lists.title') }}</h1>
      <Button
        :label="t('lists.addList')"
        icon="pi pi-plus"
        data-test="add-list-btn"
        @click="showCreate = true"
      />
    </div>

    <DataTable
      :value="lists"
      :loading="loading"
      striped-rows
      data-test="lists-table"
      @row-click="onRowClick"
    >
      <Column field="name" :header="t('lists.name')" sortable />
      <Column field="entityType" :header="t('lists.entityType')" sortable />
      <Column :header="t('lists.members')">
        <template #body="{ data }">
          {{ data.isActive ? '—' : data.memberIds?.length ?? 0 }}
        </template>
      </Column>
      <Column>
        <template #body="{ data }">
          <Tag
            :value="data.isActive ? t('lists.active') : t('lists.static')"
            :severity="data.isActive ? 'success' : 'info'"
          />
        </template>
      </Column>
      <template #empty>
        <p class="text-center text-slate-500 py-8">{{ t('lists.noLists') }}</p>
      </template>
    </DataTable>

    <Dialog
      v-model:visible="showCreate"
      :header="t('lists.addList')"
      modal
      class="w-full max-w-sm"
      data-test="create-list-dialog"
    >
      <div class="flex flex-col gap-4">
        <label>
          {{ t('lists.name') }}
          <InputText v-model="newName" class="w-full mt-1" data-test="list-name-input" />
        </label>
        <label>
          {{ t('lists.entityType') }}
          <Select
            v-model="newEntityType"
            :options="entityTypes"
            option-label="label"
            option-value="value"
            class="w-full mt-1"
            data-test="list-entity-select"
          />
        </label>
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showCreate = false" />
          <Button
            :label="t('common.save')"
            :loading="creating"
            data-test="save-list-btn"
            @click="handleCreate"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>
