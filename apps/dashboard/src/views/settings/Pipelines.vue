<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import { pipelinesApi, type Pipeline } from '@/api/pipelines';

const { t } = useI18n();

const pipelines = ref<Pipeline[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const creating = ref(false);
const newName = ref('');
const editPipeline = ref<Pipeline | null>(null);

async function load() {
  loading.value = true;
  try {
    const res = await pipelinesApi.list('Deal');
    pipelines.value = res.items;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    const pipeline = await pipelinesApi.create({ name: newName.value.trim(), entityType: 'Deal' });
    const defaultStages = [
      { name: 'Lead', order: 0, probability: 10, color: '#3b82f6' },
      { name: 'Qualified', order: 1, probability: 30, color: '#8b5cf6' },
      { name: 'Proposal', order: 2, probability: 60, color: '#f59e0b' },
      { name: 'Won', order: 3, probability: 100, color: '#22c55e', isWon: true },
      { name: 'Lost', order: 4, probability: 0, color: '#ef4444', isLost: true },
    ];
    for (const s of defaultStages) {
      await pipelinesApi.createStage(pipeline.id, s);
    }
    newName.value = '';
    showCreate.value = false;
    await load();
  } finally {
    creating.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div data-test="pipelines-admin-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('deals.pipelinesAdmin') }}</h1>
      <Button
        :label="t('deals.addPipeline')"
        icon="pi pi-plus"
        data-test="add-pipeline-btn"
        @click="showCreate = true"
      />
    </div>

    <DataTable :value="pipelines" :loading="loading" striped-rows data-test="pipelines-table">
      <Column field="name" :header="t('deals.pipelineName')" sortable />
      <Column :header="t('deals.stages')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Tag
              v-for="stage in data.stages.sort((a: any, b: any) => a.order - b.order)"
              :key="stage.id"
              :value="stage.name"
              :style="{ backgroundColor: stage.color, color: 'white' }"
              class="text-xs"
            />
          </div>
        </template>
      </Column>
      <Column>
        <template #body="{ data }">
          <Tag v-if="data.isDefault" value="Default" severity="success" />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="showCreate"
      :header="t('deals.addPipeline')"
      modal
      class="w-full max-w-sm"
    >
      <div class="flex flex-col gap-4">
        <InputText v-model="newName" :placeholder="t('deals.pipelineName')" class="w-full" />
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showCreate = false" />
          <Button :label="t('common.save')" :loading="creating" @click="handleCreate" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
