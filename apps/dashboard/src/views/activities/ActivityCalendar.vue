<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { activitiesApi, type Activity, type ActivityType } from '@/api/activities';

const { t, d } = useI18n();
const router = useRouter();

const currentDate = ref(new Date());
const activities = ref<Activity[]>([]);
const loading = ref(false);
const typeFilter = ref<ActivityType | ''>('');

const typeOptions = computed(() => [
  { label: t('activities.allTypes'), value: '' },
  { label: t('activities.call'), value: 'CALL' },
  { label: t('activities.meeting'), value: 'MEETING' },
  { label: t('activities.task'), value: 'TASK' },
  { label: t('activities.email'), value: 'EMAIL' },
  { label: t('activities.note'), value: 'NOTE' },
]);

const typeColors: Record<string, string> = {
  CALL: 'info',
  MEETING: 'warn',
  TASK: 'success',
  EMAIL: 'secondary',
  NOTE: 'contrast',
};

const year = computed(() => currentDate.value.getFullYear());
const month = computed(() => currentDate.value.getMonth());

const monthLabel = computed(() =>
  currentDate.value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
);

const weekDays = computed(() => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(2024, 0, i); // Jan 2024 starts on Monday
    days.push(d.toLocaleDateString(undefined, { weekday: 'short' }));
  }
  return days;
});

const calendarDays = computed(() => {
  const firstDay = new Date(year.value, month.value, 1);
  const lastDay = new Date(year.value, month.value + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday start
  const days: { date: number; month: number; current: boolean; key: string }[] = [];

  // Previous month padding
  const prevLast = new Date(year.value, month.value, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = prevLast - i;
    days.push({ date: d, month: month.value - 1, current: false, key: `p${d}` });
  }

  // Current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: d, month: month.value, current: true, key: `c${d}` });
  }

  // Next month padding
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) {
    days.push({ date: d, month: month.value + 1, current: false, key: `n${d}` });
  }

  return days;
});

const activitiesByDate = computed(() => {
  const map: Record<number, Activity[]> = {};
  const filtered = typeFilter.value
    ? activities.value.filter((a) => a.type === typeFilter.value)
    : activities.value;

  for (const act of filtered) {
    const dateStr = act.dueAt || act.createdAt;
    const date = new Date(dateStr);
    if (date.getMonth() === month.value && date.getFullYear() === year.value) {
      const day = date.getDate();
      if (!map[day]) map[day] = [];
      map[day].push(act);
    }
  }
  return map;
});

const todayDate = new Date();
const isToday = (day: { date: number; month: number; current: boolean }) =>
  day.current &&
  day.date === todayDate.getDate() &&
  month.value === todayDate.getMonth() &&
  year.value === todayDate.getFullYear();

function prevMonth() {
  currentDate.value = new Date(year.value, month.value - 1, 1);
}

function nextMonth() {
  currentDate.value = new Date(year.value, month.value + 1, 1);
}

function goToday() {
  currentDate.value = new Date();
}

async function loadActivities() {
  loading.value = true;
  try {
    const start = new Date(year.value, month.value, 1).toISOString();
    const end = new Date(year.value, month.value + 1, 0, 23, 59, 59).toISOString();
    const res = await activitiesApi.list({ startDate: start, endDate: end, limit: 200 });
    activities.value = res.items;
  } finally {
    loading.value = false;
  }
}

function navigateToActivity(activity: Activity) {
  if (activity.parentEntity === 'Person') {
    router.push({ name: 'person-detail', params: { id: activity.parentId } });
  } else if (activity.parentEntity === 'Company') {
    router.push({ name: 'company-detail', params: { id: activity.parentId } });
  } else if (activity.parentEntity === 'Deal') {
    router.push({ name: 'deal-detail', params: { id: activity.parentId } });
  }
}

watch([year, month], loadActivities);
onMounted(loadActivities);
</script>

<template>
  <div data-test="activity-calendar-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('activities.calendar') }}</h1>
      <div class="flex items-center gap-2">
        <Select
          v-model="typeFilter"
          :options="typeOptions"
          option-label="label"
          option-value="value"
          :placeholder="t('activities.allTypes')"
          class="w-40"
          data-test="calendar-type-filter"
        />
        <Button icon="pi pi-chevron-left" severity="secondary" size="small" @click="prevMonth" />
        <Button :label="t('activities.today')" severity="secondary" size="small" @click="goToday" />
        <Button icon="pi pi-chevron-right" severity="secondary" size="small" @click="nextMonth" />
      </div>
    </div>

    <div class="text-center text-lg font-semibold mb-3">{{ monthLabel }}</div>

    <div class="calendar-grid bg-white rounded-lg border" data-test="calendar-grid">
      <div
        v-for="day in weekDays"
        :key="day"
        class="calendar-header p-2 text-center text-sm font-medium text-slate-500 border-b"
      >
        {{ day }}
      </div>

      <div
        v-for="day in calendarDays"
        :key="day.key"
        class="calendar-cell border-b border-r p-1 min-h-24"
        :class="{
          'bg-slate-50': !day.current,
          'bg-blue-50': isToday(day),
        }"
      >
        <div
          class="text-xs font-medium mb-1"
          :class="day.current ? 'text-slate-700' : 'text-slate-400'"
        >
          {{ day.date }}
        </div>
        <div v-if="day.current && activitiesByDate[day.date]" class="flex flex-col gap-0.5">
          <div
            v-for="act in activitiesByDate[day.date].slice(0, 3)"
            :key="act.id"
            class="calendar-event text-xs px-1 py-0.5 rounded cursor-pointer truncate"
            :title="act.subject"
            @click="navigateToActivity(act)"
          >
            <Tag
              :value="act.subject"
              :severity="typeColors[act.type] || 'info'"
              class="text-xs w-full justify-start"
            />
          </div>
          <div
            v-if="activitiesByDate[day.date].length > 3"
            class="text-xs text-slate-500 px-1"
          >
            +{{ activitiesByDate[day.date].length - 3 }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.calendar-event:hover {
  opacity: 0.8;
}
</style>
