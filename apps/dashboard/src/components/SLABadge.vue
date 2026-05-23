<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Tag from 'primevue/tag';

const props = defineProps<{
  dueDate?: string;
  breached?: boolean;
  label: string;
}>();

const { t } = useI18n();

const status = computed(() => {
  if (props.breached) return { severity: 'danger' as const, text: t('sla.breached') };
  if (!props.dueDate) return null;
  const due = new Date(props.dueDate);
  const now = new Date();
  const diff = due.getTime() - now.getTime();
  if (diff < 0) return { severity: 'danger' as const, text: t('sla.overdue') };
  if (diff < 30 * 60 * 1000) return { severity: 'warn' as const, text: t('sla.atRisk') };
  const mins = Math.floor(diff / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const remaining = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return { severity: 'success' as const, text: `${t('sla.onTrack')} — ${remaining} ${t('sla.remaining')}` };
});
</script>

<template>
  <div v-if="status" class="inline-flex items-center gap-1" data-test="sla-badge">
    <span class="text-xs text-slate-500">{{ label }}:</span>
    <Tag :value="status.text" :severity="status.severity" data-test="sla-tag" />
  </div>
</template>
