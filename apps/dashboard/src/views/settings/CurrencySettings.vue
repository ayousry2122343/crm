<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputNumber from 'primevue/inputnumber';
import { useCurrency } from '@/composables/useCurrency';

const { t, locale } = useI18n();
const { rates, supported, loading, fetchRates, fetchSupported, saveRates } = useCurrency();

const editRates = ref<Record<string, number>>({});
const saving = ref(false);

function rateKey(from: string, to: string) {
  return `${from}:${to}`;
}

async function load() {
  await Promise.all([fetchRates(), fetchSupported()]);
  editRates.value = {};
  for (const r of rates.value) {
    editRates.value[rateKey(r.fromCurrency, r.toCurrency)] = Number(r.rate);
  }
}

function currencyLabel(code: string) {
  const c = supported.value.find((s) => s.code === code);
  if (!c) return code;
  return locale.value === 'ar' ? `${c.nameAr} (${c.symbol})` : `${c.name} (${c.symbol})`;
}

async function save() {
  saving.value = true;
  try {
    const updates = Object.entries(editRates.value).map(([key, rate]) => {
      const [from, to] = key.split(':');
      return { from, to, rate };
    });
    await saveRates(updates);
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">{{ t('currency.title') }}</h1>
      <Button :label="t('common.save')" icon="pi pi-check" :loading="saving" @click="save" />
    </div>

    <DataTable :value="rates" :loading="loading" stripedRows>
      <Column field="fromCurrency" :header="t('currency.from')">
        <template #body="{ data }">{{ currencyLabel(data.fromCurrency) }}</template>
      </Column>
      <Column field="toCurrency" :header="t('currency.to')">
        <template #body="{ data }">{{ currencyLabel(data.toCurrency) }}</template>
      </Column>
      <Column :header="t('currency.rate')">
        <template #body="{ data }">
          <InputNumber
            v-model="editRates[rateKey(data.fromCurrency, data.toCurrency)]"
            :minFractionDigits="2"
            :maxFractionDigits="8"
            mode="decimal"
            class="w-40"
          />
        </template>
      </Column>
      <Column field="effectiveDate" :header="t('currency.effectiveDate')">
        <template #body="{ data }">
          {{ new Date(data.effectiveDate).toLocaleDateString() }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>
