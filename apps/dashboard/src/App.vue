<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import type { ApiErrorEvent } from '@/api/errorNotifier';

const toast = useToast();
const { t } = useI18n();

function handleApiError(e: Event) {
  const { detail } = e as CustomEvent<ApiErrorEvent>;
  const message = detail.serverMessage || t(detail.messageKey);
  toast.add({
    severity: 'error',
    summary: t('common.error'),
    detail: message,
    life: 5000,
  });
}

onMounted(() => {
  window.addEventListener('crm:api-error', handleApiError);
});

onUnmounted(() => {
  window.removeEventListener('crm:api-error', handleApiError);
});
</script>

<template>
  <Toast position="top-right" />
  <router-view />
</template>
