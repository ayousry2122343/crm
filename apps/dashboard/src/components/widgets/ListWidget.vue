<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { reportsApi } from '@/api/reports';
import type { Widget } from '@/api/dashboards';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

const props = defineProps<{ widget: Widget }>();
const { locale } = useI18n();
const rows = ref<Record<string, unknown>[]>([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const result = await reportsApi.run(props.widget.reportId, props.widget.filters);
    rows.value = result.rows.slice(0, 10);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="bg-white rounded-xl shadow p-4 flex flex-col h-full" data-test="list-widget">
    <p class="text-sm text-slate-500 mb-2 font-medium">{{ widget.title[locale as 'ar' | 'en'] || widget.title.en }}</p>
    <DataTable :value="rows" :loading="loading" size="small" class="flex-1">
      <Column v-for="key in Object.keys(rows[0] ?? {})" :key="key" :field="key" :header="key" />
    </DataTable>
  </div>
</template>
