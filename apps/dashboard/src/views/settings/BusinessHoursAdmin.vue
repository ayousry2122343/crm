<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import { businessHoursApi, type BusinessHours, type CreateBusinessHoursInput, type BusinessHoursSchedule } from '@/api/sla';
import { useAppToast } from '@/composables/useAppToast';

const { t } = useI18n();
const toast = useAppToast();

const businessHours = ref<BusinessHours[]>([]);
const loading = ref(true);
const showDialog = ref(false);
const editing = ref<BusinessHours | null>(null);
const saving = ref(false);

interface ScheduleEntry {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

const dayNames = [
  t('businessHours.days.sun'),
  t('businessHours.days.mon'),
  t('businessHours.days.tue'),
  t('businessHours.days.wed'),
  t('businessHours.days.thu'),
  t('businessHours.days.fri'),
  t('businessHours.days.sat'),
];

const timezoneOptions = [
  { label: 'Asia/Riyadh', value: 'Asia/Riyadh' },
  { label: 'Africa/Cairo', value: 'Africa/Cairo' },
  { label: 'Asia/Dubai', value: 'Asia/Dubai' },
  { label: 'Europe/London', value: 'Europe/London' },
  { label: 'America/New_York', value: 'America/New_York' },
  { label: 'UTC', value: 'UTC' },
];

const defaultSchedule: ScheduleEntry[] = [
  { enabled: true, startTime: '09:00', endTime: '17:00' },
  { enabled: true, startTime: '09:00', endTime: '17:00' },
  { enabled: true, startTime: '09:00', endTime: '17:00' },
  { enabled: true, startTime: '09:00', endTime: '17:00' },
  { enabled: true, startTime: '09:00', endTime: '17:00' },
  { enabled: false, startTime: '09:00', endTime: '17:00' },
  { enabled: false, startTime: '09:00', endTime: '17:00' },
];

const form = ref<CreateBusinessHoursInput>({
  name: '',
  timezone: 'Asia/Riyadh',
  schedule: [],
  holidays: [],
});

const scheduleForm = ref<ScheduleEntry[]>(defaultSchedule.map((e) => ({ ...e })));

function scheduleFromForm(): BusinessHoursSchedule[] {
  return scheduleForm.value
    .map((e, idx) => e.enabled ? { day: idx, startTime: e.startTime, endTime: e.endTime } : null)
    .filter((e): e is BusinessHoursSchedule => e !== null);
}

function scheduleToForm(schedule: BusinessHoursSchedule[]): ScheduleEntry[] {
  const entries = defaultSchedule.map((e) => ({ ...e, enabled: false }));
  for (const s of schedule) {
    if (s.day >= 0 && s.day <= 6) {
      entries[s.day] = { enabled: true, startTime: s.startTime, endTime: s.endTime };
    }
  }
  return entries;
}

function scheduleSummary(schedule: BusinessHoursSchedule[]): string {
  if (!schedule || schedule.length === 0) return '—';
  const shortNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const days = schedule.map((s) => s.day).sort((a, b) => a - b);
  const time = schedule[0] ? `${schedule[0].startTime}-${schedule[0].endTime}` : '';
  if (days.length === 1) return `${shortNames[days[0]]} ${time}`;
  const isConsecutive = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  if (isConsecutive) return `${shortNames[days[0]]}-${shortNames[days[days.length - 1]]} ${time}`;
  return `${days.map((d) => shortNames[d]).join(', ')} ${time}`;
}

async function fetch() {
  loading.value = true;
  try {
    const res = await businessHoursApi.list();
    businessHours.value = res.items;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.value = { name: '', timezone: 'Asia/Riyadh', schedule: [], holidays: [] };
  scheduleForm.value = defaultSchedule.map((e) => ({ ...e }));
  showDialog.value = true;
}

function openEdit(bh: BusinessHours) {
  editing.value = bh;
  form.value = {
    name: bh.name,
    timezone: bh.timezone,
    schedule: [...bh.schedule],
    holidays: bh.holidays ? bh.holidays.map((h) => ({ ...h })) : [],
    isDefault: bh.isDefault,
  };
  scheduleForm.value = scheduleToForm(bh.schedule);
  showDialog.value = true;
}

async function save() {
  saving.value = true;
  try {
    const data = { ...form.value, schedule: scheduleFromForm() };
    if (editing.value) {
      await businessHoursApi.update(editing.value.id, data);
      toast.success(t('common.saved') || 'Saved');
    } else {
      await businessHoursApi.create(data as CreateBusinessHoursInput);
      toast.success(t('common.saved') || 'Saved');
    }
    showDialog.value = false;
    await fetch();
  } finally {
    saving.value = false;
  }
}

async function archive(bh: BusinessHours) {
  await businessHoursApi.archive(bh.id);
  toast.success(t('common.deleted') || 'Deleted');
  await fetch();
}

onMounted(fetch);
</script>

<template>
  <div data-test="business-hours-admin-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('businessHours.title') }}</h1>
      <Button
        :label="t('businessHours.create')"
        icon="pi pi-plus"
        data-test="create-bh-btn"
        @click="openCreate"
      />
    </div>

    <DataTable
      :value="businessHours"
      :loading="loading"
      data-test="bh-table"
    >
      <Column field="name" :header="t('businessHours.name')" />
      <Column field="timezone" :header="t('businessHours.timezone')" />
      <Column :header="t('businessHours.schedule')">
        <template #body="{ data }">{{ scheduleSummary(data.schedule) }}</template>
      </Column>
      <Column :header="t('businessHours.holidays')">
        <template #body="{ data }">{{ (data.holidays ?? []).length }}</template>
      </Column>
      <Column :header="t('businessHours.isDefault')">
        <template #body="{ data }">
          <Tag v-if="data.isDefault" value="Default" severity="success" />
        </template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              size="small"
              data-test="edit-bh-btn"
              @click="openEdit(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              data-test="delete-bh-btn"
              @click="archive(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="showDialog"
      :header="editing ? t('businessHours.edit') : t('businessHours.create')"
      modal
      class="w-full max-w-2xl"
      data-test="bh-dialog"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('businessHours.name') }}</label>
          <InputText v-model="form.name" class="w-full" data-test="bh-name-input" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('businessHours.timezone') }}</label>
          <Select
            v-model="form.timezone"
            :options="timezoneOptions"
            option-label="label"
            option-value="value"
            class="w-full"
            data-test="bh-tz-select"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('businessHours.schedule') }}</label>
          <div v-for="(entry, idx) in scheduleForm" :key="idx" class="flex items-center gap-2 mb-2">
            <input type="checkbox" v-model="entry.enabled" :data-test="`schedule-day-${idx}-check`" />
            <span class="w-24">{{ dayNames[idx] }}</span>
            <InputText
              v-model="entry.startTime"
              class="w-24"
              :disabled="!entry.enabled"
              :data-test="`schedule-day-${idx}-start`"
            />
            <span>-</span>
            <InputText
              v-model="entry.endTime"
              class="w-24"
              :disabled="!entry.enabled"
              :data-test="`schedule-day-${idx}-end`"
            />
          </div>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('businessHours.holidays') }}</label>
          <div v-for="(h, i) in form.holidays" :key="i" class="flex items-center gap-2 mb-1">
            <InputText v-model="h.date" placeholder="YYYY-MM-DD" class="w-40" :data-test="`holiday-${i}-date`" />
            <InputText v-model="h.name" :placeholder="t('businessHours.holidayName')" class="flex-1" :data-test="`holiday-${i}-name`" />
            <Button icon="pi pi-times" severity="danger" text size="small" @click="form.holidays!.splice(i, 1)" />
          </div>
          <Button
            :label="t('businessHours.addHoliday')"
            icon="pi pi-plus"
            size="small"
            severity="secondary"
            data-test="add-holiday-btn"
            @click="form.holidays!.push({ date: '', name: '' })"
          />
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" @click="showDialog = false" />
        <Button :label="t('common.save')" :loading="saving" data-test="save-bh-btn" @click="save" />
      </template>
    </Dialog>
  </div>
</template>
