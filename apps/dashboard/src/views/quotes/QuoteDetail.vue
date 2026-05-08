<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { quotesApi, type Quote } from '@/api/quotes';

const props = defineProps<{ id: string }>();
const { t } = useI18n();
const router = useRouter();

const quote = ref<Quote | null>(null);
const loading = ref(true);

const statusSeverity: Record<string, string> = {
  DRAFT: 'secondary',
  SENT: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'warn',
};

const timeline = computed(() => {
  if (!quote.value) return [];
  const events: { label: string; date: string; icon: string }[] = [];
  events.push({ label: t('quotes.created'), date: quote.value.createdAt, icon: 'pi-file' });
  if (quote.value.sentAt) events.push({ label: t('quotes.sent'), date: quote.value.sentAt, icon: 'pi-send' });
  if (quote.value.acceptedAt) events.push({ label: t('quotes.accepted'), date: quote.value.acceptedAt, icon: 'pi-check-circle' });
  if (quote.value.rejectedAt) events.push({ label: t('quotes.rejected'), date: quote.value.rejectedAt, icon: 'pi-times-circle' });
  return events;
});

async function load() {
  loading.value = true;
  try {
    quote.value = await quotesApi.get(props.id);
  } finally {
    loading.value = false;
  }
}

async function handleSend() {
  if (!quote.value) return;
  quote.value = await quotesApi.send(props.id);
}

async function handleAccept() {
  if (!quote.value) return;
  quote.value = await quotesApi.accept(props.id);
}

async function handleReject() {
  if (!quote.value) return;
  quote.value = await quotesApi.reject(props.id);
}

onMounted(load);
</script>

<template>
  <div data-test="quote-detail-page">
    <div v-if="loading" class="text-slate-500">{{ t('common.loading') }}</div>
    <template v-else-if="quote">
      <div class="flex items-center gap-4 mb-6" data-test="quote-header">
        <Button icon="pi pi-arrow-left" severity="secondary" text rounded @click="router.push({ name: 'quotes' })" />
        <div class="flex-1">
          <h1 class="text-2xl font-bold" data-test="quote-number">{{ quote.number }}</h1>
          <div class="flex gap-3 items-center mt-1">
            <Tag :value="quote.status" :severity="statusSeverity[quote.status] ?? 'info'" />
            <span v-if="quote.deal" class="text-sm text-slate-500">{{ quote.deal.name }}</span>
            <span v-if="quote.contact" class="text-sm text-slate-500">{{ quote.contact.fullName }}</span>
          </div>
        </div>
        <div class="text-2xl font-bold text-blue-700" data-test="quote-total">
          {{ Number(quote.total).toLocaleString() }} {{ quote.currency }}
        </div>
      </div>

      <!-- Status Actions -->
      <div class="flex gap-2 mb-6" data-test="quote-actions">
        <Button
          v-if="quote.status === 'DRAFT'"
          :label="t('quotes.send')"
          icon="pi pi-send"
          data-test="send-quote-btn"
          @click="handleSend"
        />
        <Button
          v-if="quote.status === 'SENT'"
          :label="t('quotes.accept')"
          icon="pi pi-check"
          severity="success"
          data-test="accept-quote-btn"
          @click="handleAccept"
        />
        <Button
          v-if="quote.status === 'SENT'"
          :label="t('quotes.reject')"
          icon="pi pi-times"
          severity="danger"
          data-test="reject-quote-btn"
          @click="handleReject"
        />
      </div>

      <!-- Timeline -->
      <div class="flex gap-6 mb-6 text-sm" data-test="quote-timeline">
        <div v-for="event in timeline" :key="event.label" class="flex items-center gap-1">
          <i :class="`pi ${event.icon} text-slate-400`" />
          <span class="font-medium">{{ event.label }}</span>
          <span class="text-slate-400">{{ new Date(event.date).toLocaleDateString() }}</span>
        </div>
      </div>

      <!-- Line Items -->
      <h2 class="text-lg font-semibold mb-3">{{ t('quotes.lineItems') }}</h2>
      <DataTable :value="quote.lineItems" striped-rows data-test="line-items-detail">
        <Column :header="t('quotes.description')">
          <template #body="{ data }">
            {{ data.description }}
            <span v-if="data.product" class="text-xs text-slate-400 ms-1">({{ data.product.sku ?? data.product.name }})</span>
          </template>
        </Column>
        <Column field="quantity" :header="t('quotes.quantity')" />
        <Column :header="t('products.unitPrice')">
          <template #body="{ data }">{{ Number(data.unitPrice).toLocaleString() }}</template>
        </Column>
        <Column :header="t('quotes.discount')">
          <template #body="{ data }">{{ Number(data.discountPct) }}%</template>
        </Column>
        <Column :header="t('quotes.lineTotal')">
          <template #body="{ data }">{{ Number(data.total).toLocaleString() }}</template>
        </Column>
      </DataTable>

      <!-- Totals -->
      <div class="mt-4 border-t pt-4 max-w-sm ms-auto">
        <div class="flex justify-between mb-1">
          <span>{{ t('quotes.subtotal') }}</span>
          <span>{{ Number(quote.subtotal).toLocaleString() }}</span>
        </div>
        <div v-if="Number(quote.discountPct) > 0" class="flex justify-between mb-1 text-red-600">
          <span>{{ t('quotes.discount') }} ({{ Number(quote.discountPct) }}%)</span>
          <span>-{{ Number(quote.discountAmt).toLocaleString() }}</span>
        </div>
        <div v-if="Number(quote.taxPct) > 0" class="flex justify-between mb-1">
          <span>{{ t('quotes.tax') }} ({{ Number(quote.taxPct) }}%)</span>
          <span>+{{ Number(quote.taxAmt).toLocaleString() }}</span>
        </div>
        <div class="flex justify-between font-bold text-lg border-t pt-2">
          <span>{{ t('quotes.total') }}</span>
          <span>{{ Number(quote.total).toLocaleString() }} {{ quote.currency }}</span>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="quote.notes" class="mt-6">
        <h3 class="font-semibold mb-1">{{ t('quotes.notes') }}</h3>
        <p class="text-slate-600 whitespace-pre-wrap">{{ quote.notes }}</p>
      </div>
    </template>
  </div>
</template>
