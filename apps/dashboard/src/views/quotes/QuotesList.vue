<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { quotesApi, type Quote } from '@/api/quotes';

const { t } = useI18n();
const router = useRouter();

const quotes = ref<Quote[]>([]);
const loading = ref(true);

const statusSeverity: Record<string, string> = {
  DRAFT: 'secondary',
  SENT: 'info',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  EXPIRED: 'warn',
};

async function load() {
  loading.value = true;
  try {
    const res = await quotesApi.list();
    quotes.value = res.items;
  } finally {
    loading.value = false;
  }
}

function goToDetail(q: Quote) {
  router.push({ name: 'quote-detail', params: { id: q.id } });
}

function goToCreate() {
  router.push({ name: 'quote-builder' });
}

onMounted(load);
</script>

<template>
  <div data-test="quotes-list-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('quotes.title') }}</h1>
      <Button
        :label="t('quotes.addQuote')"
        icon="pi pi-plus"
        data-test="add-quote-btn"
        @click="goToCreate"
      />
    </div>

    <DataTable
      :value="quotes"
      :loading="loading"
      striped-rows
      data-test="quotes-table"
      @row-click="(e: any) => goToDetail(e.data)"
    >
      <Column field="number" :header="t('quotes.number')" sortable />
      <Column :header="t('quotes.deal')">
        <template #body="{ data }">
          {{ data.deal?.name ?? '—' }}
        </template>
      </Column>
      <Column :header="t('quotes.contact')">
        <template #body="{ data }">
          {{ data.contact?.fullName ?? '—' }}
        </template>
      </Column>
      <Column field="total" :header="t('quotes.total')" sortable>
        <template #body="{ data }">
          {{ Number(data.total).toLocaleString() }} {{ data.currency }}
        </template>
      </Column>
      <Column :header="t('quotes.status')">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="statusSeverity[data.status] ?? 'info'" />
        </template>
      </Column>
      <Column field="createdAt" :header="t('people.createdAt')" sortable>
        <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleDateString() }}
        </template>
      </Column>
    </DataTable>
  </div>
</template>
