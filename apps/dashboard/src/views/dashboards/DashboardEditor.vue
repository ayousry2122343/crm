<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { dashboardsApi, type Dashboard, type Widget } from '@/api/dashboards';
import { reportsApi, type ReportDef } from '@/api/reports';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import NumberWidget from '@/components/widgets/NumberWidget.vue';
import ChartWidget from '@/components/widgets/ChartWidget.vue';
import ListWidget from '@/components/widgets/ListWidget.vue';
import KanbanWidget from '@/components/widgets/KanbanWidget.vue';

const props = defineProps<{ id: string }>();
const { t, locale } = useI18n();
const router = useRouter();

const dashboard = ref<Dashboard | null>(null);
const reports = ref<ReportDef[]>([]);
const loading = ref(false);
const saving = ref(false);
const showAddWidget = ref(false);

const widgetTypes = [
  { label: 'Number', value: 'NUMBER' },
  { label: 'Chart', value: 'CHART' },
  { label: 'List', value: 'LIST' },
  { label: 'Kanban', value: 'KANBAN' },
];

const chartTypes = [
  { label: 'Bar', value: 'bar' },
  { label: 'Line', value: 'line' },
  { label: 'Pie', value: 'pie' },
  { label: 'Donut', value: 'donut' },
];

const newWidget = ref({
  titleEn: '',
  titleAr: '',
  type: 'NUMBER' as Widget['type'],
  reportId: '',
  chartType: 'bar' as string,
});

const widgets = computed(() => dashboard.value?.layout?.widgets ?? []);

const widgetComponent = (type: string) => {
  const map: Record<string, unknown> = { NUMBER: NumberWidget, CHART: ChartWidget, LIST: ListWidget, KANBAN: KanbanWidget };
  return map[type] ?? NumberWidget;
};

function addWidget() {
  if (!dashboard.value || !newWidget.value.reportId) return;
  const w: Widget = {
    id: crypto.randomUUID(),
    type: newWidget.value.type,
    title: { en: newWidget.value.titleEn, ar: newWidget.value.titleAr || newWidget.value.titleEn },
    reportId: newWidget.value.reportId,
    chartType: newWidget.value.type === 'CHART' ? (newWidget.value.chartType as Widget['chartType']) : undefined,
    grid: { x: 0, y: widgets.value.length * 4, w: 6, h: 4 },
  };
  dashboard.value.layout.widgets.push(w);
  showAddWidget.value = false;
  newWidget.value = { titleEn: '', titleAr: '', type: 'NUMBER', reportId: '', chartType: 'bar' };
}

function removeWidget(id: string) {
  if (!dashboard.value) return;
  dashboard.value.layout.widgets = dashboard.value.layout.widgets.filter((w) => w.id !== id);
}

async function save() {
  if (!dashboard.value) return;
  saving.value = true;
  try {
    await dashboardsApi.update(dashboard.value.id, {
      name: dashboard.value.name,
      layout: dashboard.value.layout,
    });
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loading.value = true;
  try {
    const [d, r] = await Promise.all([dashboardsApi.get(props.id), reportsApi.list()]);
    dashboard.value = d;
    reports.value = r;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div data-test="dashboard-editor-page">
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <Button icon="pi pi-arrow-left" text severity="secondary" @click="router.push({ name: 'dashboards' })" />
        <InputText v-if="dashboard" v-model="dashboard.name" class="text-xl font-bold" data-test="dashboard-name" />
      </div>
      <div class="flex gap-2">
        <Button :label="t('dashboards.addWidget')" icon="pi pi-plus" severity="secondary" data-test="add-widget-btn" @click="showAddWidget = true" />
        <Button :label="t('common.save')" icon="pi pi-check" :loading="saving" data-test="save-dashboard-btn" @click="save" />
      </div>
    </div>

    <div v-if="loading" class="text-center py-12 text-slate-400">{{ t('common.loading') }}</div>

    <div v-else class="grid grid-cols-12 gap-4">
      <div
        v-for="w in widgets"
        :key="w.id"
        class="relative"
        :class="`col-span-${w.grid.w}`"
        :style="{ minHeight: `${w.grid.h * 40}px` }"
      >
        <Button
          icon="pi pi-times"
          severity="danger"
          text
          size="small"
          class="absolute top-1 end-1 z-10"
          @click="removeWidget(w.id)"
        />
        <component :is="widgetComponent(w.type)" :widget="w" />
      </div>
    </div>

    <div v-if="!loading && widgets.length === 0" class="text-center py-12 text-slate-400">
      {{ t('dashboards.noWidgets') }}
    </div>

    <Dialog v-model:visible="showAddWidget" :header="t('dashboards.addWidget')" modal class="w-[450px]">
      <div class="flex flex-col gap-3 py-2">
        <InputText v-model="newWidget.titleEn" placeholder="Title (EN)" data-test="widget-title-en" class="w-full" />
        <InputText v-model="newWidget.titleAr" placeholder="العنوان (AR)" data-test="widget-title-ar" class="w-full" />
        <Select v-model="newWidget.type" :options="widgetTypes" optionLabel="label" optionValue="value" placeholder="Widget type" data-test="widget-type" class="w-full" />
        <Select v-model="newWidget.reportId" :options="reports" :optionLabel="(r: ReportDef) => r[`label${locale === 'ar' ? 'Ar' : 'En'}` as keyof ReportDef] as string" optionValue="id" placeholder="Report" data-test="widget-report" class="w-full" />
        <Select v-if="newWidget.type === 'CHART'" v-model="newWidget.chartType" :options="chartTypes" optionLabel="label" optionValue="value" placeholder="Chart type" class="w-full" />
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" text @click="showAddWidget = false" />
        <Button :label="t('common.save')" @click="addWidget" />
      </template>
    </Dialog>
  </div>
</template>
