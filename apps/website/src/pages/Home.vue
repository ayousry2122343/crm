<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
  <main class="min-h-screen bg-gradient-to-b from-blue-50 to-white">
    <section class="max-w-5xl mx-auto px-6 py-24 text-center">
      <h1 class="text-5xl font-bold mb-4">{{ t('site.title') }}</h1>
      <p class="text-xl text-slate-600 mb-8">{{ t('site.tagline') }}</p>
      <a
        href="/sign-up"
        class="inline-block px-8 py-3 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700"
      >
        {{ t('site.cta') }}
      </a>
    </section>
  </main>
</template>
