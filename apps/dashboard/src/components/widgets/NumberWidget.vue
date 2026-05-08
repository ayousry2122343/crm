<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { reportsApi } from '@/api/reports';
import type { Widget } from '@/api/dashboards';

const props = defineProps<{ widget: Widget }>();
const { locale } = useI18n();
const value = ref<string | number>('—');
const loading = ref(true);

onMounted(async () => {
  try {
    const result = await reportsApi.run(props.widget.reportId, props.widget.filters);
    const raw = result.summary?.total ?? result.rows?.[0]?.count;
    value.value = raw != null ? String(raw) : '—';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center h-full" data-test="number-widget">
    <p class="text-sm text-slate-500 mb-2">{{ widget.title[locale as 'ar' | 'en'] || widget.title.en }}</p>
    <p v-if="loading" class="text-3xl font-bold text-slate-300 animate-pulse">...</p>
    <p v-else class="text-3xl font-bold text-indigo-600">{{ value }}</p>
  </div>
</template>
