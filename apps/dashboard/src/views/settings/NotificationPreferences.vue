<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { notificationApi, type NotificationPreference } from '@/api/notifications';
import { useAppToast } from '@/composables/useAppToast';
import Checkbox from 'primevue/checkbox';

const { t } = useI18n();
const toast = useAppToast();

const TYPES = [
  'ASSIGNMENT',
  'MENTION',
  'DEAL_WON',
  'DEAL_LOST',
  'TASK_DUE',
  'TICKET_CREATED',
  'SLA_BREACH',
  'WORKFLOW',
  'SYSTEM',
] as const;

const CHANNELS = ['IN_APP', 'EMAIL'] as const;

const prefs = ref<Record<string, boolean>>({});
const loading = ref(true);

function key(channel: string, type: string) {
  return `${channel}:${type}`;
}

onMounted(async () => {
  try {
    const data = await notificationApi.getPreferences();
    for (const p of data) {
      prefs.value[key(p.channel, p.type)] = p.enabled;
    }
  } finally {
    loading.value = false;
  }
});

function isEnabled(channel: string, type: string): boolean {
  return prefs.value[key(channel, type)] ?? true;
}

async function toggle(channel: string, type: string) {
  const k = key(channel, type);
  const newVal = !(prefs.value[k] ?? true);
  prefs.value[k] = newVal;
  try {
    await notificationApi.upsertPreference({ channel, type, enabled: newVal });
  } catch {
    prefs.value[k] = !newVal;
    toast.error(t('errors.unexpected'));
  }
}
</script>

<template>
  <div data-test="notification-preferences">
    <h1 class="text-2xl font-bold mb-4">{{ t('notifications.preferences') }}</h1>
    <p class="text-sm text-gray-500 mb-6">{{ t('notifications.preferencesDescription') }}</p>

    <div v-if="loading" class="text-center py-8">{{ t('common.loading') }}</div>
    <table v-else class="w-full border-collapse" data-test="prefs-table">
      <thead>
        <tr class="border-b">
          <th class="text-start py-2 px-2">{{ t('notifications.type') }}</th>
          <th v-for="ch in CHANNELS" :key="ch" class="text-center py-2 px-2">
            {{ t(`notifications.channel_${ch}`) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tp in TYPES" :key="tp" class="border-b hover:bg-slate-50">
          <td class="py-2 px-2 text-sm">{{ t(`notifications.type_${tp}`) }}</td>
          <td v-for="ch in CHANNELS" :key="ch" class="text-center py-2 px-2">
            <Checkbox
              :modelValue="isEnabled(ch, tp)"
              :binary="true"
              :data-test="`pref-${ch}-${tp}`"
              @update:modelValue="toggle(ch, tp)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
