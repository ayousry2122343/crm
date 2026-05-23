<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import MultiSelect from 'primevue/multiselect';
import Checkbox from 'primevue/checkbox';
import Textarea from 'primevue/textarea';
import { savedReportsApi, type CreateReportDto } from '@/api/saved-reports';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const saving = ref(false);

const entityTypes = [
  { label: 'Person', value: 'Person' },
  { label: 'Deal', value: 'Deal' },
  { label: 'Ticket', value: 'Ticket' },
  { label: 'Activity', value: 'Activity' },
];

const reportTypes = [
  { label: 'Tabular', value: 'TABULAR' },
  { label: 'Grouped', value: 'GROUPED' },
  { label: 'Summary', value: 'SUMMARY' },
];

const chartTypes = [
  { label: 'Bar', value: 'BAR' },
  { label: 'Line', value: 'LINE' },
  { label: 'Pie', value: 'PIE' },
  { label: 'Doughnut', value: 'DOUGHNUT' },
];

const entityFieldMap: Record<string, string[]> = {
  Person: ['fullName', 'email', 'phone', 'company', 'status', 'source', 'createdAt'],
  Deal: ['name', 'amount', 'status', 'stage', 'probability', 'closeDate', 'createdAt'],
  Ticket: ['subject', 'status', 'priority', 'channel', 'createdAt', 'resolvedAt'],
  Activity: ['type', 'subject', 'dueDate', 'completed', 'createdAt'],
};

const aggFunctions = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'];

const form = ref<CreateReportDto>({
  name: '',
  description: '',
  entityType: '',
  reportType: 'TABULAR',
  columns: [],
  filters: {},
  groupBy: [],
  aggregations: [],
  sortBy: [],
  isShared: false,
});

const selectedColumns = ref<string[]>([]);
const selectedGroupBy = ref<string[]>([]);

function availableFields() {
  return entityFieldMap[form.value.entityType] || [];
}

async function save() {
  saving.value = true;
  try {
    form.value.columns = selectedColumns.value.map((f) => ({ fieldKey: f }));
    form.value.groupBy = selectedGroupBy.value;

    if (route.params.id) {
      await savedReportsApi.update(route.params.id as string, form.value);
    } else {
      await savedReportsApi.create(form.value);
    }
    router.push({ name: 'saved-reports' });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="p-6 max-w-3xl">
    <h1 class="text-2xl font-bold mb-6">{{ t('savedReports.builder') }}</h1>

    <form class="flex flex-col gap-5" @submit.prevent="save">
      <div class="flex flex-col gap-1">
        <label class="font-medium">{{ t('common.name') }}</label>
        <InputText v-model="form.name" required />
      </div>

      <div class="flex flex-col gap-1">
        <label class="font-medium">{{ t('savedReports.description') }}</label>
        <Textarea v-model="form.description" rows="2" />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="flex flex-col gap-1">
          <label class="font-medium">{{ t('savedReports.entity') }}</label>
          <Dropdown
            v-model="form.entityType"
            :options="entityTypes"
            optionLabel="label"
            optionValue="value"
            :placeholder="t('savedReports.selectEntity')"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label class="font-medium">{{ t('savedReports.type') }}</label>
          <Dropdown
            v-model="form.reportType"
            :options="reportTypes"
            optionLabel="label"
            optionValue="value"
          />
        </div>
      </div>

      <div v-if="form.entityType" class="flex flex-col gap-1">
        <label class="font-medium">{{ t('savedReports.columns') }}</label>
        <MultiSelect
          v-model="selectedColumns"
          :options="availableFields()"
          :placeholder="t('savedReports.selectColumns')"
        />
      </div>

      <div v-if="form.reportType !== 'TABULAR' && form.entityType" class="flex flex-col gap-1">
        <label class="font-medium">{{ t('savedReports.groupBy') }}</label>
        <MultiSelect
          v-model="selectedGroupBy"
          :options="availableFields()"
          :placeholder="t('savedReports.selectGroupBy')"
        />
      </div>

      <div v-if="form.reportType !== 'TABULAR'" class="flex flex-col gap-1">
        <label class="font-medium">{{ t('savedReports.chart') }}</label>
        <Dropdown
          v-model="form.chartType"
          :options="chartTypes"
          optionLabel="label"
          optionValue="value"
          :placeholder="t('savedReports.selectChart')"
          showClear
        />
      </div>

      <div class="flex items-center gap-2">
        <Checkbox v-model="form.isShared" :binary="true" inputId="shared" />
        <label for="shared">{{ t('savedReports.shareWithTeam') }}</label>
      </div>

      <div class="flex gap-2">
        <Button type="submit" :label="t('common.save')" :loading="saving" />
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          @click="router.back()"
        />
      </div>
    </form>
  </div>
</template>
