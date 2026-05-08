<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Calendar from 'primevue/calendar';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { quotesApi, type LineItemInput } from '@/api/quotes';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();

const dealId = (route.query.dealId as string) || '';
const saving = ref(false);

const form = ref({
  dealId,
  contactId: '',
  currency: 'EGP',
  validUntil: null as Date | null,
  discountPct: 0,
  taxPct: 0,
  notes: '',
});

const lineItems = ref<(LineItemInput & { key: number })[]>([
  { key: Date.now(), description: '', quantity: 1, unitPrice: 0, discountPct: 0 },
]);

let nextKey = Date.now() + 1;

function addLine() {
  lineItems.value.push({ key: nextKey++, description: '', quantity: 1, unitPrice: 0, discountPct: 0 });
}

function removeLine(index: number) {
  if (lineItems.value.length > 1) lineItems.value.splice(index, 1);
}

const subtotal = computed(() =>
  lineItems.value.reduce((sum, li) => {
    const disc = li.discountPct ?? 0;
    return sum + li.quantity * li.unitPrice * (1 - disc / 100);
  }, 0),
);

const discountAmt = computed(() => subtotal.value * (form.value.discountPct / 100));
const afterDiscount = computed(() => subtotal.value - discountAmt.value);
const taxAmt = computed(() => afterDiscount.value * (form.value.taxPct / 100));
const total = computed(() => afterDiscount.value + taxAmt.value);

async function handleSave() {
  if (!lineItems.value.some((li) => li.description.trim())) return;
  saving.value = true;
  try {
    const quote = await quotesApi.create({
      dealId: form.value.dealId || undefined,
      contactId: form.value.contactId || undefined,
      currency: form.value.currency,
      validUntil: form.value.validUntil?.toISOString(),
      discountPct: form.value.discountPct,
      taxPct: form.value.taxPct,
      notes: form.value.notes || undefined,
      lineItems: lineItems.value
        .filter((li) => li.description.trim())
        .map(({ description, quantity, unitPrice, discountPct, productId }) => ({
          description,
          quantity,
          unitPrice,
          discountPct,
          productId,
        })),
    });
    router.push({ name: 'quote-detail', params: { id: quote.id } });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div data-test="quote-builder-page">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ t('quotes.addQuote') }}</h1>
      <Button
        :label="t('common.back')"
        icon="pi pi-arrow-left"
        severity="secondary"
        @click="router.back()"
      />
    </div>

    <div class="grid grid-cols-3 gap-4 mb-6">
      <div v-if="!dealId">
        <label class="text-sm text-slate-500">{{ t('quotes.deal') }}</label>
        <InputText v-model="form.dealId" :placeholder="t('quotes.dealId')" class="w-full" />
      </div>
      <div>
        <label class="text-sm text-slate-500">{{ t('common.currency') }}</label>
        <InputText v-model="form.currency" class="w-full" />
      </div>
      <div>
        <label class="text-sm text-slate-500">{{ t('quotes.validUntil') }}</label>
        <Calendar v-model="form.validUntil" date-format="yy-mm-dd" class="w-full" />
      </div>
    </div>

    <!-- Line Items -->
    <h2 class="text-lg font-semibold mb-3">{{ t('quotes.lineItems') }}</h2>
    <DataTable :value="lineItems" data-test="line-items-table">
      <Column :header="t('quotes.description')">
        <template #body="{ data, index }">
          <InputText v-model="data.description" class="w-full" :data-test="`li-desc-${index}`" />
        </template>
      </Column>
      <Column :header="t('quotes.quantity')">
        <template #body="{ data }">
          <InputNumber v-model="data.quantity" :min="1" class="w-24" />
        </template>
      </Column>
      <Column :header="t('products.unitPrice')">
        <template #body="{ data }">
          <InputNumber v-model="data.unitPrice" :min-fraction-digits="2" class="w-32" />
        </template>
      </Column>
      <Column :header="t('quotes.discount')">
        <template #body="{ data }">
          <InputNumber v-model="data.discountPct" suffix="%" :max="100" class="w-24" />
        </template>
      </Column>
      <Column :header="t('quotes.lineTotal')">
        <template #body="{ data }">
          {{ (data.quantity * data.unitPrice * (1 - (data.discountPct ?? 0) / 100)).toLocaleString() }}
        </template>
      </Column>
      <Column>
        <template #body="{ index }">
          <Button icon="pi pi-trash" severity="danger" size="small" text @click="removeLine(index)" />
        </template>
      </Column>
    </DataTable>

    <Button
      :label="t('quotes.addLine')"
      icon="pi pi-plus"
      severity="secondary"
      size="small"
      class="mt-2"
      data-test="add-line-btn"
      @click="addLine"
    />

    <!-- Totals -->
    <div class="mt-6 border-t pt-4 max-w-sm ms-auto">
      <div class="flex justify-between mb-2">
        <span>{{ t('quotes.subtotal') }}</span>
        <span>{{ subtotal.toLocaleString() }} {{ form.currency }}</span>
      </div>
      <div class="flex items-center justify-between mb-2 gap-2">
        <span>{{ t('quotes.discount') }} (%)</span>
        <InputNumber v-model="form.discountPct" suffix="%" :max="100" class="w-24" />
        <span>-{{ discountAmt.toLocaleString() }}</span>
      </div>
      <div class="flex items-center justify-between mb-2 gap-2">
        <span>{{ t('quotes.tax') }} (%)</span>
        <InputNumber v-model="form.taxPct" suffix="%" class="w-24" />
        <span>+{{ taxAmt.toLocaleString() }}</span>
      </div>
      <div class="flex justify-between font-bold text-lg border-t pt-2">
        <span>{{ t('quotes.total') }}</span>
        <span data-test="quote-total">{{ total.toLocaleString() }} {{ form.currency }}</span>
      </div>
    </div>

    <!-- Notes -->
    <div class="mt-6">
      <label class="text-sm text-slate-500">{{ t('quotes.notes') }}</label>
      <Textarea v-model="form.notes" rows="3" class="w-full" />
    </div>

    <div class="flex gap-2 justify-end mt-6">
      <Button :label="t('common.cancel')" severity="secondary" @click="router.back()" />
      <Button :label="t('common.save')" :loading="saving" data-test="save-quote-btn" @click="handleSave" />
    </div>
  </div>
</template>
