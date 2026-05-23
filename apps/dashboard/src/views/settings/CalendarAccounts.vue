<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import { calendarApi, type CalendarAccount } from '@/api/calendar-sync';

const { t } = useI18n();

const accounts = ref<CalendarAccount[]>([]);
const loading = ref(true);

const syncStateSeverity: Record<string, string> = {
  IDLE: 'success',
  SYNCING: 'info',
  ERROR: 'danger',
};

async function load() {
  loading.value = true;
  try {
    accounts.value = await calendarApi.listAccounts();
  } finally {
    loading.value = false;
  }
}

async function connectGoogle() {
  const { url } = await calendarApi.getAuthUrl('GOOGLE', window.location.origin + '/settings/calendar/callback');
  window.location.href = url;
}

async function connectMicrosoft() {
  const { url } = await calendarApi.getAuthUrl('MICROSOFT', window.location.origin + '/settings/calendar/callback');
  window.location.href = url;
}

onMounted(load);
</script>

<template>
  <div data-test="calendar-accounts-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('calendar.title') }}</h1>
      <div class="flex gap-2">
        <Button :label="t('calendar.connectGoogle')" icon="pi pi-google" severity="secondary" @click="connectGoogle" />
        <Button :label="t('calendar.connectMicrosoft')" icon="pi pi-microsoft" severity="secondary" @click="connectMicrosoft" />
      </div>
    </div>

    <DataTable :value="accounts" :loading="loading" striped-rows>
      <Column field="provider" :header="t('agent.provider')">
        <template #body="{ data }">
          <Tag :value="data.provider" severity="info" />
        </template>
      </Column>
      <Column field="emailAddress" header="Email" />
      <Column :header="t('calendar.syncStatus')">
        <template #body="{ data }">
          <Tag :value="data.syncState" :severity="syncStateSeverity[data.syncState] ?? 'info'" />
        </template>
      </Column>
      <Column :header="t('calendar.direction')">
        <template #body="{ data }">
          <span class="text-sm">{{ data.syncDirection === 'BOTH' ? t('calendar.both') : data.syncDirection === 'IN' ? t('calendar.inbound') : t('calendar.outbound') }}</span>
        </template>
      </Column>
      <Column :header="t('calendar.lastSync')">
        <template #body="{ data }">
          <span class="text-sm text-surface-400">{{ data.lastSyncAt ? new Date(data.lastSyncAt).toLocaleString() : '—' }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
