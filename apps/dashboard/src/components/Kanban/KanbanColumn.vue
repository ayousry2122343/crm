<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import KanbanCard from './KanbanCard.vue';
import type { Deal } from '@/api/deals';
import type { Stage } from '@/api/pipelines';

defineProps<{
  stage: Stage;
  deals: Deal[];
}>();

defineEmits<{
  (e: 'card-click', deal: Deal): void;
}>();

const { t } = useI18n();

function totalAmount(deals: Deal[]): number {
  return deals.reduce((sum, d) => sum + Number(d.amount), 0);
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
</script>

<template>
  <div
    class="flex flex-col min-w-[280px] max-w-[320px] bg-slate-50 rounded-lg"
    :data-test="`kanban-column-${stage.id}`"
  >
    <div class="p-3 border-b-2" :style="{ borderColor: stage.color }">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-sm">{{ stage.name }}</h3>
        <span class="text-xs bg-slate-200 rounded-full px-2 py-0.5">{{ deals.length }}</span>
      </div>
      <div class="text-xs text-slate-500 mt-1">
        {{ formatAmount(totalAmount(deals)) }}
      </div>
    </div>
    <div
      class="flex-1 p-2 flex flex-col gap-2 overflow-y-auto min-h-[200px]"
      :data-test="`column-cards-${stage.id}`"
    >
      <KanbanCard
        v-for="deal in deals"
        :key="deal.id"
        :deal="deal"
        @click="$emit('card-click', deal)"
      />
      <div
        v-if="deals.length === 0"
        class="text-xs text-slate-400 text-center py-4"
      >
        {{ t('common.noData') }}
      </div>
    </div>
  </div>
</template>
