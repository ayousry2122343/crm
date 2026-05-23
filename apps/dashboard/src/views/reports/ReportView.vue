<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import { savedReportsApi, type SavedReport, type ReportResult } from '@/api/saved-reports';

const { t } = useI18n();
const route = useRoute();
const id = route.params.id as string;
const report = ref<SavedReport | null>(null);
const result = ref<ReportResult | null>(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    report.value = await savedReportsApi.get(id);
    result.value = await savedReportsApi.run(id);
  } finally {
    loading.value = false;
  }
}

async function exportCSV() {
  const blob = await savedReportsApi.export(id, 'csv');
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.value?.name || 'report'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(load);
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <div>
        <h1 class="text-2xl font-bold">{{ report?.name }}</h1>
        <p v-if="report?.description" class="text-gray-500 mt-1">{{ report.description }}</p>
      </div>
      <Button :label="t('savedReports.exportCSV')" icon="pi pi-download" @click="exportCSV" />
    </div>

    <DataTable v-if="result" :value="result.rows" :loading="loading" stripedRows paginator :rows="50">
      <Column
        v-for="col in report?.columns"
        :key="col.fieldKey"
        :field="col.fieldKey"
        :header="col.label || col.fieldKey"
      />
    </DataTable>

    <p v-if="result" class="text-sm text-gray-500 mt-2">
      {{ t('savedReports.totalRows', { count: result.total }) }}
    </p>
  </div>
</template>
