<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const highlights = [
  { icon: 'pi-users', key: 'contacts' },
  { icon: 'pi-chart-line', key: 'pipelines' },
  { icon: 'pi-bolt', key: 'automation' },
];
</script>

<template>
  <main>
    <section class="bg-gradient-to-b from-indigo-50 to-white py-24 text-center" data-test="hero">
      <div class="max-w-4xl mx-auto px-6">
        <h1 class="text-5xl font-bold mb-4">{{ t('home.headline') }}</h1>
        <p class="text-xl text-slate-600 mb-8">{{ t('site.tagline') }}</p>
        <a href="/sign-up" class="inline-block px-8 py-3 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 text-lg">
          {{ t('site.cta') }}
        </a>
      </div>
    </section>

    <section class="max-w-5xl mx-auto px-6 py-16">
      <div class="grid md:grid-cols-3 gap-8 text-center">
        <div v-for="h in highlights" :key="h.key" class="p-6">
          <i :class="`pi ${h.icon} text-3xl text-indigo-600 mb-3`" />
          <h3 class="font-bold text-lg mb-2">{{ t(`home.${h.key}Title`) }}</h3>
          <p class="text-slate-500 text-sm">{{ t(`home.${h.key}Desc`) }}</p>
        </div>
      </div>
    </section>

    <section class="bg-indigo-600 text-white py-16 text-center">
      <h2 class="text-3xl font-bold mb-4">{{ t('home.ctaTitle') }}</h2>
      <a href="/sign-up" class="inline-block px-8 py-3 rounded-md bg-white text-indigo-600 font-medium hover:bg-indigo-50 text-lg">
        {{ t('site.cta') }}
      </a>
    </section>
  </main>
</template>
