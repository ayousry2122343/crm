<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import ProgressBar from 'primevue/progressbar';
import { goalsApi, type Goal, type CreateGoalInput } from '@/api/goals';
import { useAppToast } from '@/composables/useAppToast';

const { t } = useI18n();
const toast = useAppToast();

const goals = ref<Goal[]>([]);
const loading = ref(true);
const statusFilter = ref<string | null>(null);
const showCreate = ref(false);

const form = ref<CreateGoalInput>({
  name: '',
  metric: 'REVENUE',
  targetValue: 0,
  period: '',
  startDate: '',
  endDate: '',
});

const metricOptions = [
  { label: 'Revenue', value: 'REVENUE' },
  { label: 'Deal Count', value: 'DEAL_COUNT' },
  { label: 'Won Deal Count', value: 'WON_DEAL_COUNT' },
  { label: 'Activity Count', value: 'ACTIVITY_COUNT' },
  { label: 'Avg Deal Size', value: 'AVG_DEAL_SIZE' },
  { label: 'Custom', value: 'CUSTOM' },
];

const statusTabs = [
  { label: 'All', value: null },
  { label: 'On Track', value: 'ON_TRACK' },
  { label: 'At Risk', value: 'AT_RISK' },
  { label: 'Behind', value: 'BEHIND' },
  { label: 'Achieved', value: 'ACHIEVED' },
];

const statusSeverity: Record<string, string> = {
  ON_TRACK: 'success',
  AT_RISK: 'warn',
  BEHIND: 'danger',
  ACHIEVED: 'info',
};

const filteredGoals = computed(() => {
  if (!statusFilter.value) return goals.value;
  return goals.value.filter((g) => g.status === statusFilter.value);
});

function progressPercent(g: Goal): number {
  if (Number(g.targetValue) <= 0) return 0;
  return Math.min(100, Math.round((Number(g.currentValue) / Number(g.targetValue)) * 100));
}

async function load() {
  loading.value = true;
  try {
    const res = await goalsApi.list();
    goals.value = res.items;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  await goalsApi.create(form.value);
  toast.success(t('goals.created'));
  showCreate.value = false;
  form.value = { name: '', metric: 'REVENUE', targetValue: 0, period: '', startDate: '', endDate: '' };
  await load();
}

onMounted(load);
</script>

<template>
  <div data-test="goals-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('goals.title') }}</h1>
      <Button
        :label="t('goals.create')"
        icon="pi pi-plus"
        data-test="create-goal-btn"
        @click="showCreate = true"
      />
    </div>

    <div class="flex gap-2 mb-4" data-test="status-tabs">
      <Button
        v-for="tab in statusTabs"
        :key="tab.value ?? 'all'"
        :label="tab.label"
        :severity="statusFilter === tab.value ? 'primary' : 'secondary'"
        size="small"
        :data-test="`tab-${tab.value ?? 'all'}`"
        @click="statusFilter = tab.value"
      />
    </div>

    <div v-if="!loading && filteredGoals.length === 0" class="text-slate-500" data-test="no-goals">
      {{ t('goals.noGoals') }}
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-test="goals-grid">
      <div
        v-for="goal in filteredGoals"
        :key="goal.id"
        class="bg-white rounded-lg border p-4 shadow-sm"
        data-test="goal-card"
      >
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-lg">{{ goal.name }}</h3>
          <Tag
            :value="t(`goals.${goal.status === 'ON_TRACK' ? 'onTrack' : goal.status === 'AT_RISK' ? 'atRisk' : goal.status === 'BEHIND' ? 'behind' : 'achieved'}`)"
            :severity="statusSeverity[goal.status]"
            data-test="goal-status"
          />
        </div>
        <p class="text-sm text-slate-500 mb-2">
          {{ t(`goals.${goal.metric === 'REVENUE' ? 'revenue' : goal.metric === 'DEAL_COUNT' ? 'dealCount' : goal.metric === 'WON_DEAL_COUNT' ? 'wonDealCount' : goal.metric === 'ACTIVITY_COUNT' ? 'activityCount' : goal.metric === 'AVG_DEAL_SIZE' ? 'avgDealSize' : 'custom'}`) }}
          &middot; {{ goal.period }}
        </p>
        <ProgressBar :value="progressPercent(goal)" data-test="goal-progress" />
        <p class="text-sm mt-2">
          {{ Number(goal.currentValue).toLocaleString() }} / {{ Number(goal.targetValue).toLocaleString() }}
        </p>
        <p v-if="goal.owner" class="text-xs text-slate-400 mt-1">
          {{ t('goals.owner') }}: {{ goal.owner.fullName }}
        </p>
        <p v-if="goal.team" class="text-xs text-slate-400">
          {{ t('goals.team') }}: {{ goal.team.name }}
        </p>
      </div>
    </div>

    <Dialog
      v-model:visible="showCreate"
      :header="t('goals.create')"
      modal
      data-test="create-goal-dialog"
    >
      <div class="flex flex-col gap-3 min-w-[400px]">
        <InputText
          v-model="form.name"
          :placeholder="t('goals.name')"
          data-test="goal-name-input"
        />
        <Select
          v-model="form.metric"
          :options="metricOptions"
          option-label="label"
          option-value="value"
          data-test="goal-metric-select"
        />
        <InputNumber
          v-model="form.targetValue"
          :placeholder="t('goals.target')"
          data-test="goal-target-input"
        />
        <InputText
          v-model="form.period"
          :placeholder="t('goals.period')"
          data-test="goal-period-input"
        />
        <InputText
          v-model="form.startDate"
          type="date"
          :placeholder="t('goals.startDate')"
          data-test="goal-start-input"
        />
        <InputText
          v-model="form.endDate"
          type="date"
          :placeholder="t('goals.endDate')"
          data-test="goal-end-input"
        />
        <Button
          :label="t('goals.create')"
          data-test="goal-submit-btn"
          @click="handleCreate"
        />
      </div>
    </Dialog>
  </div>
</template>
