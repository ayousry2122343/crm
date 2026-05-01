<script setup lang="ts">
import { useLocale } from '@/composables/useLocale';
import Button from 'primevue/button';
const { locale, setLocale } = useLocale();
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
    <div class="w-full max-w-md">
      <div class="flex justify-end mb-3">
        <Button
          :label="locale === 'ar' ? 'EN' : 'AR'"
          severity="secondary"
          size="small"
          @click="setLocale(locale === 'ar' ? 'en' : 'ar')"
        />
      </div>
      <router-view />
    </div>
  </div>
</template>
