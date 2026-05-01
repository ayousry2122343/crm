<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">{{ t('settings.customFields.title') }}</h1>
  </div>
</template>
