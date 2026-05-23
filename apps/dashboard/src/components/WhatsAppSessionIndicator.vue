<script setup lang="ts">
import { computed } from 'vue';
import Tag from 'primevue/tag';
import { useI18n } from 'vue-i18n';

const props = defineProps<{ lastInboundAt?: string }>();
const { t } = useI18n();

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

const isInSession = computed(() => {
  if (!props.lastInboundAt) return false;
  return Date.now() - new Date(props.lastInboundAt).getTime() < SESSION_WINDOW_MS;
});
</script>

<template>
  <Tag
    :value="isInSession ? t('whatsapp.sessionActive') : t('whatsapp.templateOnly')"
    :severity="isInSession ? 'success' : 'secondary'"
    :icon="isInSession ? 'pi pi-check-circle' : 'pi pi-lock'"
    data-test="wa-session-indicator"
  />
</template>
