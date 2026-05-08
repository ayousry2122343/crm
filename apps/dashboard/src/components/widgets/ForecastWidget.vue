<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { forecastsApi, type ForecastEntry } from '@/api/forecasts';

const { t } = useI18n();

const loading = ref(true);
const totals = ref({ pipeline: 0, bestCase: 0, commit: 0, closedWon: 0 });

function currentPeriodDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function sumByCategory(entries: ForecastEntry[]) {
  const result = { pipeline: 0, bestCase: 0, commit: 0, closedWon: 0 };
  for (const e of entries) {
    const amt = Number(e.adjustedAmount ?? e.amount);
    if (e.category === 'PIPELINE') result.pipeline += amt;
    else if (e.category === 'BEST_CASE') result.bestCase += amt;
    else if (e.category === 'COMMIT') result.commit += amt;
    else if (e.category === 'CLOSED_WON') result.closedWon += amt;
  }
  return result;
}

async function load() {
  loading.value = true;
  try {
    const res = await forecastsApi.getByPeriod('MONTHLY', currentPeriodDate());
    totals.value = sumByCategory(res.entries);
  } catch {
    totals.value = { pipeline: 0, bestCase: 0, commit: 0, closedWon: 0 };
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="bg-white rounded-lg border p-4" data-test="forecast-widget">
    <h3 class="font-semibold mb-3">{{ t('forecasts.title') }}</h3>
    <div v-if="loading" class="text-slate-400">Loading...</div>
    <div v-else class="grid grid-cols-2 gap-3">
      <div data-test="fw-pipeline">
        <p class="text-xs text-slate-400">{{ t('forecasts.pipeline') }}</p>
        <p class="text-lg font-bold">{{ totals.pipeline.toLocaleString() }}</p>
      </div>
      <div data-test="fw-bestcase">
        <p class="text-xs text-slate-400">{{ t('forecasts.bestCase') }}</p>
        <p class="text-lg font-bold">{{ totals.bestCase.toLocaleString() }}</p>
      </div>
      <div data-test="fw-commit">
        <p class="text-xs text-slate-400">{{ t('forecasts.commit') }}</p>
        <p class="text-lg font-bold">{{ totals.commit.toLocaleString() }}</p>
      </div>
      <div data-test="fw-closedwon">
        <p class="text-xs text-slate-400">{{ t('forecasts.closedWon') }}</p>
        <p class="text-lg font-bold">{{ totals.closedWon.toLocaleString() }}</p>
      </div>
    </div>
  </div>
</template>
