<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { agentConfigsApi, type AgentDashboardStats } from '@/api/agent';

const { t } = useI18n();
const stats = ref<AgentDashboardStats | null>(null);
const loading = ref(true);

onMounted(async () => {
  try {
    stats.value = await agentConfigsApi.dashboard();
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div data-test="agent-dashboard">
    <h1 class="text-2xl font-bold mb-4">{{ t('agent.dashboard') }}</h1>
    <div v-if="stats" class="grid grid-cols-3 gap-4">
      <div class="bg-surface-0 border rounded-lg p-4">
        <p class="text-sm text-surface-400">{{ t('agent.totalSessions') }}</p>
        <p class="text-3xl font-bold">{{ stats.totalSessions }}</p>
      </div>
      <div class="bg-surface-0 border rounded-lg p-4">
        <p class="text-sm text-surface-400">{{ t('agent.resolutionRate') }}</p>
        <p class="text-3xl font-bold text-green-600">{{ stats.resolutionRate }}%</p>
      </div>
      <div class="bg-surface-0 border rounded-lg p-4">
        <p class="text-sm text-surface-400">{{ t('agent.escalationRate') }}</p>
        <p class="text-3xl font-bold text-orange-600">{{ stats.escalationRate }}%</p>
      </div>
      <div class="bg-surface-0 border rounded-lg p-4">
        <p class="text-sm text-surface-400">{{ t('agent.activeSessions') }}</p>
        <p class="text-3xl font-bold">{{ stats.activeSessions }}</p>
      </div>
      <div class="bg-surface-0 border rounded-lg p-4">
        <p class="text-sm text-surface-400">{{ t('agent.resolvedSessions') }}</p>
        <p class="text-3xl font-bold">{{ stats.resolvedSessions }}</p>
      </div>
      <div class="bg-surface-0 border rounded-lg p-4">
        <p class="text-sm text-surface-400">{{ t('agent.escalatedSessions') }}</p>
        <p class="text-3xl font-bold">{{ stats.escalatedSessions }}</p>
      </div>
    </div>
  </div>
</template>
