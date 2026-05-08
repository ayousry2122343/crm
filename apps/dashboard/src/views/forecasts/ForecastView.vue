<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import InputNumber from 'primevue/inputnumber';
import InputText from 'primevue/inputtext';
import { forecastsApi, type ForecastPeriod, type ForecastEntry } from '@/api/forecasts';
import { useAppToast } from '@/composables/useAppToast';

const { t } = useI18n();
const toast = useAppToast();

const periodType = ref<'MONTHLY' | 'QUARTERLY'>('MONTHLY');
const dateValue = ref(currentPeriodDate());
const loading = ref(false);
const forecast = ref<ForecastPeriod | null>(null);
const repRows = ref<RepRow[]>([]);

const editingEntry = ref<string | null>(null);
const editAmount = ref<number | null>(null);
const editNote = ref('');

interface RepRow {
  userId: string;
  userName: string;
  pipeline: number;
  bestCase: number;
  commit: number;
  closedWon: number;
  total: number;
  entries: ForecastEntry[];
}

const periodTypeOptions = [
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Quarterly', value: 'QUARTERLY' },
];

function currentPeriodDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function buildRepRows(entries: ForecastEntry[]) {
  const map = new Map<string, RepRow>();
  for (const e of entries) {
    const key = e.userId;
    if (!map.has(key)) {
      map.set(key, {
        userId: key,
        userName: e.user?.fullName ?? key,
        pipeline: 0,
        bestCase: 0,
        commit: 0,
        closedWon: 0,
        total: 0,
        entries: [],
      });
    }
    const row = map.get(key)!;
    row.entries.push(e);
    const amt = Number(e.adjustedAmount ?? e.amount);
    if (e.category === 'PIPELINE') row.pipeline += amt;
    else if (e.category === 'BEST_CASE') row.bestCase += amt;
    else if (e.category === 'COMMIT') row.commit += amt;
    else if (e.category === 'CLOSED_WON') row.closedWon += amt;
    row.total += amt;
  }
  return Array.from(map.values());
}

async function loadForecast() {
  loading.value = true;
  try {
    const res = await forecastsApi.getByPeriod(periodType.value, dateValue.value);
    forecast.value = res;
    repRows.value = buildRepRows(res.entries);
  } catch {
    forecast.value = null;
    repRows.value = [];
  } finally {
    loading.value = false;
  }
}

async function takeSnapshot() {
  if (!forecast.value) return;
  await forecastsApi.takeSnapshot(forecast.value.id);
  toast.success(t('forecasts.snapshotTaken'));
}

function startEdit(entry: ForecastEntry) {
  editingEntry.value = entry.id;
  editAmount.value = entry.adjustedAmount != null ? Number(entry.adjustedAmount) : Number(entry.amount);
  editNote.value = entry.note ?? '';
}

async function saveEdit() {
  if (!editingEntry.value) return;
  await forecastsApi.updateEntry(editingEntry.value, {
    adjustedAmount: editAmount.value ?? undefined,
    note: editNote.value || undefined,
  });
  editingEntry.value = null;
  toast.success(t('forecasts.entryUpdated'));
  await loadForecast();
}

function summaryRow(): RepRow {
  const sum: RepRow = { userId: '', userName: t('forecasts.total'), pipeline: 0, bestCase: 0, commit: 0, closedWon: 0, total: 0, entries: [] };
  for (const r of repRows.value) {
    sum.pipeline += r.pipeline;
    sum.bestCase += r.bestCase;
    sum.commit += r.commit;
    sum.closedWon += r.closedWon;
    sum.total += r.total;
  }
  return sum;
}

watch([periodType, dateValue], loadForecast);
onMounted(loadForecast);
</script>

<template>
  <div data-test="forecast-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('forecasts.title') }}</h1>
      <div class="flex gap-2">
        <Select
          v-model="periodType"
          :options="periodTypeOptions"
          option-label="label"
          option-value="value"
          data-test="period-type-select"
        />
        <InputText
          v-model="dateValue"
          :placeholder="periodType === 'MONTHLY' ? 'YYYY-MM' : 'YYYY-QN'"
          data-test="date-input"
        />
        <Button
          :label="t('forecasts.takeSnapshot')"
          icon="pi pi-camera"
          severity="secondary"
          :disabled="!forecast"
          data-test="snapshot-btn"
          @click="takeSnapshot"
        />
      </div>
    </div>

    <div v-if="!loading && repRows.length === 0" class="text-slate-500" data-test="no-data">
      {{ t('forecasts.noData') }}
    </div>

    <DataTable
      v-if="repRows.length > 0"
      :value="[...repRows, summaryRow()]"
      :loading="loading"
      striped-rows
      data-test="forecast-table"
    >
      <Column field="userName" :header="t('forecasts.rep')" />
      <Column field="pipeline" :header="t('forecasts.pipeline')">
        <template #body="{ data }">
          {{ Number(data.pipeline).toLocaleString() }}
        </template>
      </Column>
      <Column field="bestCase" :header="t('forecasts.bestCase')">
        <template #body="{ data }">
          {{ Number(data.bestCase).toLocaleString() }}
        </template>
      </Column>
      <Column field="commit" :header="t('forecasts.commit')">
        <template #body="{ data }">
          {{ Number(data.commit).toLocaleString() }}
        </template>
      </Column>
      <Column field="closedWon" :header="t('forecasts.closedWon')">
        <template #body="{ data }">
          {{ Number(data.closedWon).toLocaleString() }}
        </template>
      </Column>
      <Column field="total" :header="t('forecasts.total')">
        <template #body="{ data }">
          <strong>{{ Number(data.total).toLocaleString() }}</strong>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
