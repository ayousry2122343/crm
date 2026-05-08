<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { reportsApi, type ReportDef, type ReportResult } from '@/api/reports';
import Button from 'primevue/button';
import Select from 'primevue/select';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Chart from 'primevue/chart';

const { t, locale } = useI18n();
const reports = ref<ReportDef[]>([]);
const selectedReport = ref<ReportDef | null>(null);
const result = ref<ReportResult | null>(null);
const loading = ref(false);
const running = ref(false);

const chartData = ref<Record<string, unknown>>({});
const chartOptions = { responsive: true, maintainAspectRatio: false };

function buildChart(rows: Record<string, unknown>[]) {
  const labels = rows.map((r) => String(r.label ?? r.name ?? r.stage ?? ''));
  const data = rows.map((r) => Number(r.count ?? r.total ?? r.value ?? 0));
  const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e0e7ff', '#818cf8', '#4f46e5', '#312e81'];
  chartData.value = { labels, datasets: [{ data, backgroundColor: colors.slice(0, data.length), borderRadius: 4 }] };
}

async function runReport() {
  if (!selectedReport.value) return;
  running.value = true;
  try {
    const res = await reportsApi.run(selectedReport.value.id);
    result.value = res;
    buildChart(res.rows);
  } finally {
    running.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    reports.value = await reportsApi.list();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div data-test="reports-index-page">
    <h1 class="text-2xl font-bold mb-4">{{ t('reports.title') }}</h1>

    <div class="flex items-center gap-3 mb-6">
      <Select
        v-model="selectedReport"
        :options="reports"
        :optionLabel="(r: ReportDef) => (locale === 'ar' ? r.labelAr : r.labelEn)"
        :placeholder="t('reports.selectReport')"
        class="w-72"
        data-test="report-select"
      />
      <Button :label="t('reports.run')" icon="pi pi-play" :loading="running" :disabled="!selectedReport" data-test="run-report-btn" @click="runReport" />
    </div>

    <div v-if="result" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="bg-white rounded-xl shadow p-4" style="height: 320px" data-test="report-chart">
        <Chart type="bar" :data="chartData" :options="chartOptions" class="h-full" />
      </div>
      <div class="bg-white rounded-xl shadow p-4" data-test="report-table">
        <DataTable :value="result.rows" size="small" scrollable scrollHeight="280px">
          <Column v-for="key in Object.keys(result.rows[0] ?? {})" :key="key" :field="key" :header="key" sortable />
        </DataTable>
      </div>

      <div v-if="result.summary && Object.keys(result.summary).length" class="col-span-full bg-white rounded-xl shadow p-4" data-test="report-summary">
        <h3 class="font-medium mb-2">{{ t('reports.summary') }}</h3>
        <div class="flex gap-6">
          <div v-for="(val, key) in result.summary" :key="String(key)" class="text-center">
            <p class="text-xs text-slate-500">{{ key }}</p>
            <p class="text-xl font-bold text-indigo-600">{{ val }}</p>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="text-center py-12 text-slate-400">
      {{ t('reports.noReport') }}
    </div>
  </div>
</template>
