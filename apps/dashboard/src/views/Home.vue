<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useLocale } from '@/composables/useLocale';
import Button from 'primevue/button';

const { t } = useI18n();
const { locale, setLocale } = useLocale();
</script>

<template>
  <main class="p-8 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-4">{{ t('app.title') }}</h1>
    <p class="text-lg mb-6">{{ t('app.welcome') }}</p>
    <div class="flex gap-2">
      <Button
        :label="locale === 'ar' ? 'English' : 'العربية'"
        @click="setLocale(locale === 'ar' ? 'en' : 'ar')"
        severity="secondary"
      />
    </div>
  </main>
</template>
