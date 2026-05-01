<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useAuth } from '@/composables/useAuth';

const { t } = useI18n();
const { user, workspace } = useAuth();
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold">
      {{ t('dashboard.welcome', { name: user?.fullName ?? '' }) }}
    </h1>
    <p class="text-slate-600 mt-2">
      {{ t('dashboard.workspace', { name: workspace?.name ?? '' }) }}
    </p>
  </div>
</template>
