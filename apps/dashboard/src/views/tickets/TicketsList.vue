<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import { ticketsApi, type Ticket } from '@/api/tickets';
import { queuesApi, type Queue } from '@/api/queues';
import TicketCreateDialog from '@/components/TicketCreateDialog.vue';

const { t } = useI18n();
const router = useRouter();

const tickets = ref<Ticket[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const filterStatus = ref<string | undefined>();
const filterPriority = ref<string | undefined>();
const filterQueue = ref<string | undefined>();
const searchText = ref('');
const queuesList = ref<Queue[]>([]);

const statusSeverity: Record<string, string> = {
  NEW: 'info',
  OPEN: 'warn',
  PENDING: 'secondary',
  ON_HOLD: 'secondary',
  RESOLVED: 'success',
  CLOSED: 'contrast',
};

const prioritySeverity: Record<string, string> = {
  LOW: 'secondary',
  MEDIUM: 'info',
  HIGH: 'warn',
  URGENT: 'danger',
};

const statusOptions = [
  { label: 'All', value: undefined },
  { label: 'New', value: 'NEW' },
  { label: 'Open', value: 'OPEN' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'On Hold', value: 'ON_HOLD' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
];

const priorityOptions = [
  { label: 'All', value: undefined },
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
];

function formatNumber(n: number): string {
  return 'TKT-' + n.toString().padStart(4, '0');
}

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = {};
    if (filterStatus.value) params.status = filterStatus.value;
    if (filterPriority.value) params.priority = filterPriority.value;
    if (filterQueue.value) params.queueId = filterQueue.value;
    if (searchText.value) params.search = searchText.value;
    const res = await ticketsApi.list(params);
    tickets.value = res.items;
  } finally {
    loading.value = false;
  }
}

function goToDetail(ticket: Ticket) {
  router.push({ name: 'ticket-detail', params: { id: ticket.id } });
}

onMounted(async () => {
  try {
    const res = await queuesApi.list();
    queuesList.value = res.items;
  } catch { /* ignore */ }
  load();
});
</script>

<template>
  <div data-test="tickets-list-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('tickets.title') }}</h1>
      <Button
        :label="t('tickets.create')"
        icon="pi pi-plus"
        data-test="create-ticket-btn"
        @click="showCreate = true"
      />
    </div>

    <div class="flex gap-3 mb-4">
      <Select
        v-model="filterStatus"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('tickets.status')"
        class="w-40"
        data-test="status-filter"
        @change="load"
      />
      <Select
        v-model="filterPriority"
        :options="priorityOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('tickets.priority')"
        class="w-40"
        data-test="priority-filter"
        @change="load"
      />
      <Select
        v-model="filterQueue"
        :options="[{ label: 'All', value: undefined }, ...queuesList.map(q => ({ label: q.name, value: q.id }))]"
        option-label="label"
        option-value="value"
        :placeholder="t('tickets.queue')"
        class="w-40"
        data-test="queue-filter"
        @change="load"
      />
      <InputText
        v-model="searchText"
        :placeholder="t('search.placeholder')"
        class="w-60"
        data-test="search-input"
        @keyup.enter="load"
      />
    </div>

    <DataTable
      :value="tickets"
      :loading="loading"
      striped-rows
      data-test="tickets-table"
      @row-click="(e: any) => goToDetail(e.data)"
    >
      <Column :header="t('tickets.ticketNumber')">
        <template #body="{ data }">
          {{ formatNumber(data.ticketNumber) }}
        </template>
      </Column>
      <Column field="subject" :header="t('tickets.subject')" sortable />
      <Column :header="t('tickets.status')">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="statusSeverity[data.status] ?? 'info'" />
        </template>
      </Column>
      <Column :header="t('tickets.priority')">
        <template #body="{ data }">
          <Tag :value="data.priority" :severity="prioritySeverity[data.priority] ?? 'info'" />
        </template>
      </Column>
      <Column :header="t('tickets.channel')">
        <template #body="{ data }">{{ data.channel }}</template>
      </Column>
      <Column :header="t('tickets.assignee')">
        <template #body="{ data }">{{ data.assignee?.fullName ?? '—' }}</template>
      </Column>
      <Column :header="t('tickets.contact')">
        <template #body="{ data }">{{ data.contact?.fullName ?? '—' }}</template>
      </Column>
      <Column :header="t('tickets.createdAt')">
        <template #body="{ data }">
          {{ new Date(data.createdAt).toLocaleDateString() }}
        </template>
      </Column>
    </DataTable>

    <TicketCreateDialog
      v-model:visible="showCreate"
      @created="load"
    />
  </div>
</template>
