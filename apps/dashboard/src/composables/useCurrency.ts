import { ref } from 'vue';
import { currencyApi, type CurrencyRate, type SupportedCurrency } from '@/api/currency';

const rates = ref<CurrencyRate[]>([]);
const supported = ref<SupportedCurrency[]>([]);
const loading = ref(false);

async function fetchRates(): Promise<void> {
  loading.value = true;
  try {
    rates.value = await currencyApi.getRates();
  } finally {
    loading.value = false;
  }
}

async function fetchSupported(): Promise<void> {
  if (supported.value.length) return;
  supported.value = await currencyApi.getSupportedCurrencies();
}

async function saveRates(updates: Array<{ from: string; to: string; rate: number }>) {
  await currencyApi.updateRates(updates);
  await fetchRates();
}

function formatCurrency(amount: number, code: string): string {
  const cur = supported.value.find((c) => c.code === code);
  return cur ? `${cur.symbol} ${amount.toLocaleString()}` : `${code} ${amount.toLocaleString()}`;
}

export function useCurrency() {
  return { rates, supported, loading, fetchRates, fetchSupported, saveRates, formatCurrency };
}
