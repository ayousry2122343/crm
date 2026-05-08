<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { reportsApi } from '@/api/reports';
import type { Widget } from '@/api/dashboards';
import Chart from 'primevue/chart';

const props = defineProps<{ widget: Widget }>();
const { locale } = useI18n();
const chartData = ref<Record<string, unknown>>({});
const chartOptions = ref({ responsive: true, maintainAspectRatio: false });
const loading = ref(true);

function mapToChart(rows: Record<string, unknown>[], type: string) {
  const labels = rows.map((r) => String(r.label ?? r.name ?? r.stage ?? ''));
  const data = rows.map((r) => Number(r.count ?? r.total ?? r.value ?? 0));
  const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e0e7ff', '#818cf8', '#4f46e5'];
  if (type === 'pie' || type === 'donut') {
    return { labels, datasets: [{ data, backgroundColor: colors.slice(0, data.length) }] };
  }
  return {
    labels,
    datasets: [{ label: '', data, backgroundColor: '#6366f1', borderRadius: 4 }],
  };
}

onMounted(async () => {
  try {
    const result = await reportsApi.run(props.widget.reportId, props.widget.filters);
    chartData.value = mapToChart(result.rows, props.widget.chartType ?? 'bar');
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="bg-white rounded-xl shadow p-4 flex flex-col h-full" data-test="chart-widget">
    <p class="text-sm text-slate-500 mb-2 font-medium">{{ widget.title[locale as 'ar' | 'en'] || widget.title.en }}</p>
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <span class="text-slate-300 animate-pulse">Loading...</span>
    </div>
    <div v-else class="flex-1 min-h-0">
      <Chart :type="widget.chartType === 'donut' ? 'doughnut' : (widget.chartType ?? 'bar')" :data="chartData" :options="chartOptions" class="h-full" />
    </div>
  </div>
</template>
