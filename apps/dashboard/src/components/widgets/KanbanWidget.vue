<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { reportsApi } from '@/api/reports';
import type { Widget } from '@/api/dashboards';

const props = defineProps<{ widget: Widget }>();
const { locale } = useI18n();
const columns = ref<{ label: string; count: number; total: number }[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const result = await reportsApi.run(props.widget.reportId, props.widget.filters);
    columns.value = result.rows.map((r: Record<string, unknown>) => ({
      label: String(r.label ?? r.stage ?? r.name ?? ''),
      count: Number(r.count ?? 0),
      total: Number(r.total ?? r.amount ?? 0),
    }));
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="bg-white rounded-xl shadow p-4 flex flex-col h-full" data-test="kanban-widget">
    <p class="text-sm text-slate-500 mb-2 font-medium">{{ widget.title[locale as 'ar' | 'en'] || widget.title.en }}</p>
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <span class="text-slate-300 animate-pulse">Loading...</span>
    </div>
    <div v-else class="flex-1 flex gap-2 overflow-x-auto">
      <div
        v-for="col in columns"
        :key="col.label"
        class="flex-1 min-w-[120px] bg-slate-50 rounded-lg p-3 text-center"
      >
        <p class="text-xs text-slate-500 mb-1 truncate">{{ col.label }}</p>
        <p class="text-xl font-bold text-slate-800">{{ col.count }}</p>
        <p v-if="col.total" class="text-xs text-slate-400 mt-1">{{ col.total.toLocaleString() }}</p>
      </div>
    </div>
  </div>
</template>
