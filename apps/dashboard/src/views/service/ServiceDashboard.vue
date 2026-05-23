<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import SelectButton from 'primevue/selectbutton';
import Chart from 'primevue/chart';
import {
  serviceDashboardApi,
  type OverviewStats,
  type AgentPerformance,
  type QueueStat,
  type VolumeEntry,
  type ChannelStat,
} from '@/api/service-dashboard';

const { t } = useI18n();

const period = ref('7d');
const periodOptions = [
  { label: '', value: '7d' },
  { label: '', value: '30d' },
  { label: '', value: '90d' },
];

const overview = ref<OverviewStats | null>(null);
const agents = ref<AgentPerformance[]>([]);
const queues = ref<QueueStat[]>([]);
const channelChartData = ref<any>(null);
const volumeChartData = ref<any>(null);

async function loadData() {
  const [ov, channels, volume, agentData, queueData] = await Promise.all([
    serviceDashboardApi.overview(),
    serviceDashboardApi.ticketsByChannel(),
    serviceDashboardApi.volumeOverTime(period.value),
    serviceDashboardApi.agentPerformance(),
    serviceDashboardApi.queueStats(),
  ]);

  overview.value = ov;
  agents.value = agentData;
  queues.value = queueData;
  buildChannelChart(channels);
  buildVolumeChart(volume);
}

function buildChannelChart(data: ChannelStat[]) {
  channelChartData.value = {
    labels: data.map((d) => d.channel),
    datasets: [
      {
        data: data.map((d) => d.count),
        backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1'],
      },
    ],
  };
}

function buildVolumeChart(data: VolumeEntry[]) {
  volumeChartData.value = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: t('serviceDashboard.created'),
        data: data.map((d) => d.created),
        borderColor: '#3B82F6',
        tension: 0.3,
        fill: false,
      },
      {
        label: t('serviceDashboard.resolved'),
        data: data.map((d) => d.resolved),
        borderColor: '#10B981',
        tension: 0.3,
        fill: false,
      },
    ],
  };
}

async function onPeriodChange() {
  const volume = await serviceDashboardApi.volumeOverTime(period.value);
  buildVolumeChart(volume);
}

onMounted(loadData);
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6" data-test="dashboard-title">
      {{ t('serviceDashboard.title') }}
    </h1>

    <!-- Stat Cards -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" data-test="stat-cards">
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">{{ t('serviceDashboard.openTickets') }}</div>
        <div class="text-2xl font-bold">{{ overview?.openTickets ?? '-' }}</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">{{ t('serviceDashboard.avgResolution') }}</div>
        <div class="text-2xl font-bold">{{ overview?.avgResolutionHours ?? '-' }}h</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">{{ t('serviceDashboard.slaCompliance') }}</div>
        <div class="text-2xl font-bold">{{ overview?.slaComplianceRate ?? '-' }}%</div>
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <div class="text-sm text-gray-500">{{ t('serviceDashboard.csatAverage') }}</div>
        <div class="text-2xl font-bold">{{ overview?.csatAverage ?? '-' }}</div>
      </div>
    </div>

    <!-- Period Selector -->
    <div class="mb-6" data-test="period-selector">
      <SelectButton
        v-model="period"
        :options="periodOptions"
        option-label="label"
        option-value="value"
        @change="onPeriodChange"
      >
        <template #option="{ option }">
          {{ option.value === '7d' ? t('serviceDashboard.period7d') : option.value === '30d' ? t('serviceDashboard.period30d') : t('serviceDashboard.period90d') }}
        </template>
      </SelectButton>
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-semibold mb-2">{{ t('serviceDashboard.ticketsByChannel') }}</h3>
        <Chart v-if="channelChartData" type="doughnut" :data="channelChartData" />
      </div>
      <div class="bg-white rounded-lg shadow p-4">
        <h3 class="font-semibold mb-2">{{ t('serviceDashboard.volumeOverTime') }}</h3>
        <Chart v-if="volumeChartData" type="line" :data="volumeChartData" />
      </div>
    </div>

    <!-- Agent Performance Table -->
    <div class="bg-white rounded-lg shadow p-4 mb-6">
      <h3 class="font-semibold mb-3">{{ t('serviceDashboard.agentPerformance') }}</h3>
      <DataTable :value="agents" :sortable="true" data-test="agent-table">
        <Column field="agentName" :header="t('serviceDashboard.agentPerformance')" sortable />
        <Column field="ticketsHandled" :header="t('serviceDashboard.ticketsHandled')" sortable />
        <Column field="avgResolutionHours" :header="t('serviceDashboard.avgResolution')" sortable />
        <Column field="avgFirstResponseHours" :header="t('serviceDashboard.avgFirstResponse')" sortable />
        <Column field="slaComplianceRate" :header="t('serviceDashboard.slaCompliance')" sortable />
        <Column field="csatAverage" :header="t('serviceDashboard.csatAverage')" sortable />
        <Column field="openTickets" :header="t('serviceDashboard.openTickets')" sortable />
      </DataTable>
    </div>

    <!-- Queue Stats Table -->
    <div class="bg-white rounded-lg shadow p-4">
      <h3 class="font-semibold mb-3">{{ t('serviceDashboard.queueStats') }}</h3>
      <DataTable :value="queues" data-test="queue-table">
        <Column field="queueName" :header="t('serviceDashboard.queueStats')" />
        <Column field="openTickets" :header="t('serviceDashboard.openTickets')" />
        <Column field="avgWaitMinutes" header="Avg Wait (min)" />
        <Column field="agentsOnline" header="Agents" />
      </DataTable>
    </div>
  </div>
</template>
