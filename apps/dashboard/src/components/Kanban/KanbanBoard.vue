<script setup lang="ts">
import { computed } from 'vue';
import KanbanColumn from './KanbanColumn.vue';
import type { Deal } from '@/api/deals';
import type { Pipeline, Stage } from '@/api/pipelines';

const props = defineProps<{
  pipeline: Pipeline;
  deals: Deal[];
}>();

defineEmits<{
  (e: 'card-click', deal: Deal): void;
  (e: 'card-move', dealId: string, toStageId: string): void;
}>();

const sortedStages = computed(() =>
  [...(props.pipeline?.stages ?? [])].sort((a, b) => a.order - b.order),
);

function dealsByStage(stageId: string): Deal[] {
  return props.deals.filter((d) => d.stageId === stageId);
}
</script>

<template>
  <div
    class="flex gap-4 overflow-x-auto pb-4"
    data-test="kanban-board"
  >
    <KanbanColumn
      v-for="stage in sortedStages"
      :key="stage.id"
      :stage="stage"
      :deals="dealsByStage(stage.id)"
      @card-click="$emit('card-click', $event)"
    />
  </div>
</template>
