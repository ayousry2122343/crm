<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import ListView, { type ColumnDef } from '@/components/lists/ListView.vue';
import FilterBar, { type FilterOption } from '@/components/lists/FilterBar.vue';
import { dealsApi, type Deal } from '@/api/deals';

const { t } = useI18n();
const router = useRouter();

const items = ref<Deal[]>([]);
const loading = ref(true);
const nextCursor = ref<string | undefined>();
const filters = ref<Record<string, unknown>>({});

const columns = computed<ColumnDef[]>(() => [
  { field: 'name', header: t('deals.name'), sortable: true },
  { field: 'amount', header: t('deals.amount'), sortable: true },
  { field: 'status', header: t('deals.status'), type: 'tag', sortable: true },
  { field: 'createdAt', header: t('people.createdAt'), type: 'date', sortable: true },
]);

const filterOptions = computed<FilterOption[]>(() => [
  {
    key: 'status',
    label: t('deals.status'),
    type: 'select' as const,
    options: [
      { label: 'Open', value: 'OPEN' },
      { label: 'Won', value: 'WON' },
      { label: 'Lost', value: 'LOST' },
    ],
  },
]);

async function fetch(append = false) {
  loading.value = true;
  try {
    const params: Record<string, unknown> = { limit: 50, ...filters.value };
    if (append && nextCursor.value) params.cursor = nextCursor.value;
    const res = await dealsApi.list(params);
    items.value = append ? [...items.value, ...res.items] : res.items;
    nextCursor.value = res.nextCursor;
  } finally {
    loading.value = false;
  }
}

function onRowClick(row: unknown) {
  router.push({ name: 'deal-detail', params: { id: (row as Deal).id } });
}

onMounted(() => fetch());
</script>

<template>
  <div data-test="deals-list-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('deals.deals') }}</h1>
      <div class="flex gap-2">
        <Button
          :label="t('deals.kanban')"
          icon="pi pi-th-large"
          severity="secondary"
          @click="router.push({ name: 'deals-kanban' })"
        />
      </div>
    </div>

    <FilterBar
      :filters="filterOptions"
      :model-value="filters"
      @update:model-value="filters = $event; fetch()"
      @search="filters.search = $event; fetch()"
    />

    <ListView
      :items="items"
      :columns="columns"
      :loading="loading"
      :has-more="!!nextCursor"
      row-click
      @row-click="onRowClick"
      @load-more="fetch(true)"
    />
  </div>
</template>
