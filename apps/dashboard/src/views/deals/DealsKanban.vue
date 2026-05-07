<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import KanbanBoard from '@/components/Kanban/KanbanBoard.vue';
import DynamicForm from '@/components/DynamicForm/DynamicForm.vue';
import { pipelinesApi, type Pipeline } from '@/api/pipelines';
import { dealsApi, type Deal } from '@/api/deals';

const { t } = useI18n();
const router = useRouter();

const pipelines = ref<Pipeline[]>([]);
const selectedPipelineId = ref<string | null>(null);
const deals = ref<Deal[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const creating = ref(false);

const selectedPipeline = computed(() =>
  pipelines.value.find((p) => p.id === selectedPipelineId.value) ?? null,
);

const pipelineOptions = computed(() =>
  pipelines.value.map((p) => ({ label: p.name, value: p.id })),
);

async function loadPipelines() {
  const res = await pipelinesApi.list('Deal');
  pipelines.value = res.items;
  if (res.items.length > 0) {
    const def = res.items.find((p) => p.isDefault) ?? res.items[0];
    selectedPipelineId.value = def.id;
  }
}

async function loadDeals() {
  if (!selectedPipelineId.value) return;
  loading.value = true;
  try {
    const res = await dealsApi.list({
      pipelineId: selectedPipelineId.value,
      limit: 200,
    });
    deals.value = res.items;
  } finally {
    loading.value = false;
  }
}

function onCardClick(deal: Deal) {
  router.push({ name: 'deal-detail', params: { id: deal.id } });
}

async function onCardMove(dealId: string, toStageId: string) {
  try {
    await dealsApi.moveStage(dealId, { stageId: toStageId });
    await loadDeals();
  } catch {
    await loadDeals();
  }
}

async function handleCreate(data: Record<string, unknown>) {
  if (!selectedPipelineId.value || !selectedPipeline.value) return;
  creating.value = true;
  try {
    const firstStage = selectedPipeline.value.stages
      .sort((a, b) => a.order - b.order)[0];
    await dealsApi.create({
      ...data,
      pipelineId: selectedPipelineId.value,
      stageId: firstStage?.id,
    } as Partial<Deal>);
    showCreate.value = false;
    await loadDeals();
  } finally {
    creating.value = false;
  }
}

watch(selectedPipelineId, () => loadDeals());

onMounted(async () => {
  await loadPipelines();
  await loadDeals();
});
</script>

<template>
  <div data-test="deals-kanban-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('deals.kanban') }}</h1>
      <div class="flex gap-2 items-center">
        <Select
          v-model="selectedPipelineId"
          :options="pipelineOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('deals.selectPipeline')"
          class="w-48"
          data-test="pipeline-switcher"
        />
        <Button
          :label="t('deals.addDeal')"
          icon="pi pi-plus"
          data-test="add-deal-btn"
          @click="showCreate = true"
        />
      </div>
    </div>

    <div v-if="loading" class="text-slate-500">{{ t('common.loading') }}</div>
    <KanbanBoard
      v-else-if="selectedPipeline"
      :pipeline="selectedPipeline"
      :deals="deals"
      @card-click="onCardClick"
      @card-move="onCardMove"
    />

    <Dialog
      v-model:visible="showCreate"
      :header="t('deals.addDeal')"
      modal
      class="w-full max-w-xl"
      data-test="create-deal-dialog"
    >
      <DynamicForm
        entity-type="Deal"
        :loading="creating"
        @submit="handleCreate"
        @cancel="showCreate = false"
      />
    </Dialog>
  </div>
</template>
