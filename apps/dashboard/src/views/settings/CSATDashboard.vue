<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { csatApi, type SatisfactionRating, type CSATStats } from '@/api/csat';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Message from 'primevue/message';

const { t } = useI18n();
const ratings = ref<SatisfactionRating[]>([]);
const stats = ref<CSATStats | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const nextCursor = ref<string | null>(null);

onMounted(async () => {
  await Promise.all([loadRatings(), loadStats()]);
});

async function loadRatings() {
  loading.value = true;
  try {
    const params: Record<string, any> = {};
    if (nextCursor.value) params.cursor = nextCursor.value;
    const res = await csatApi.list(params);
    ratings.value = [...ratings.value, ...res.items];
    nextCursor.value = res.nextCursor;
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message;
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  try {
    stats.value = await csatApi.stats();
  } catch {}
}

function ratingStars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

function ratingSeverity(n: number): string {
  if (n >= 4) return 'success';
  if (n >= 3) return 'warn';
  return 'danger';
}

const responseRate = computed(() => {
  if (!stats.value || stats.value.total === 0) return '0%';
  return Math.round((stats.value.responded / stats.value.total) * 100) + '%';
});
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">{{ t('csat.title') }}</h1>

    <Message v-if="error" severity="error" class="mb-4">{{ error }}</Message>

    <div v-if="stats" class="grid grid-cols-4 gap-4 mb-6">
      <div class="bg-white border rounded p-4">
        <div class="text-sm text-slate-500">{{ t('csat.totalSent') }}</div>
        <div class="text-2xl font-bold">{{ stats.total }}</div>
      </div>
      <div class="bg-white border rounded p-4">
        <div class="text-sm text-slate-500">{{ t('csat.responded') }}</div>
        <div class="text-2xl font-bold">{{ stats.responded }}</div>
      </div>
      <div class="bg-white border rounded p-4">
        <div class="text-sm text-slate-500">{{ t('csat.responseRate') }}</div>
        <div class="text-2xl font-bold">{{ responseRate }}</div>
      </div>
      <div class="bg-white border rounded p-4">
        <div class="text-sm text-slate-500">{{ t('csat.avgRating') }}</div>
        <div class="text-2xl font-bold">{{ stats.averageRating }}/5</div>
      </div>
    </div>

    <div v-if="stats && stats.responded > 0" class="bg-white border rounded p-4 mb-6">
      <h3 class="text-sm font-medium text-slate-500 mb-2">{{ t('csat.distribution') }}</h3>
      <div class="flex gap-4 items-end h-24">
        <div v-for="n in 5" :key="n" class="flex flex-col items-center flex-1">
          <div
            class="w-full bg-blue-500 rounded-t"
            :style="{ height: stats.responded ? ((stats.distribution[n] || 0) / stats.responded * 100) + '%' : '0%', minHeight: '2px' }"
          />
          <div class="text-xs mt-1">{{ n }} {{ '★' }}</div>
          <div class="text-xs text-slate-400">{{ stats.distribution[n] || 0 }}</div>
        </div>
      </div>
    </div>

    <DataTable :value="ratings" :loading="loading" striped-rows data-test="csat-table">
      <Column :header="t('csat.ticket')">
        <template #body="{ data }">
          <router-link v-if="data.ticket" :to="`/tickets/${data.ticketId}`" class="text-blue-600 hover:underline">
            {{ data.ticket.subject }}
          </router-link>
        </template>
      </Column>
      <Column :header="t('csat.contact')">
        <template #body="{ data }">{{ data.contact?.fullName ?? '-' }}</template>
      </Column>
      <Column :header="t('csat.rating')">
        <template #body="{ data }">
          <Tag v-if="data.respondedAt" :value="ratingStars(data.rating)" :severity="ratingSeverity(data.rating) as any" />
          <span v-else class="text-slate-400">{{ t('csat.pending') }}</span>
        </template>
      </Column>
      <Column field="comment" :header="t('csat.comment')" />
      <Column :header="t('csat.respondedAt')">
        <template #body="{ data }">
          {{ data.respondedAt ? new Date(data.respondedAt).toLocaleDateString() : '-' }}
        </template>
      </Column>
      <template #empty>{{ t('csat.noRatings') }}</template>
    </DataTable>

    <div v-if="nextCursor" class="mt-4 text-center">
      <Button :label="t('common.loadMore')" severity="secondary" @click="loadRatings" />
    </div>
  </div>
</template>
