<script setup lang="ts">
import Tag from 'primevue/tag';
import type { Deal } from '@/api/deals';

defineProps<{
  deal: Deal;
}>();

defineEmits<{
  (e: 'click', deal: Deal): void;
}>();

function formatAmount(amount: number, currency: string): string {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currency || 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
</script>

<template>
  <div
    class="bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
    :data-test="`kanban-card-${deal.id}`"
    @click="$emit('click', deal)"
  >
    <div class="font-medium text-sm mb-1 truncate">{{ deal.name }}</div>
    <div class="text-lg font-bold text-blue-700">
      {{ formatAmount(Number(deal.amount), deal.currency) }}
    </div>
    <div class="flex items-center gap-2 mt-2">
      <Tag
        v-if="deal.isRotting"
        value="Rotting"
        severity="danger"
        class="text-xs"
        data-test="rotting-flag"
      />
      <span v-if="deal.expectedCloseDate" class="text-xs text-slate-400">
        {{ new Date(deal.expectedCloseDate).toLocaleDateString() }}
      </span>
    </div>
  </div>
</template>
