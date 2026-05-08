<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const features = [
  { icon: 'pi-users', key: 'contacts' },
  { icon: 'pi-chart-line', key: 'pipelines' },
  { icon: 'pi-bolt', key: 'automation' },
  { icon: 'pi-envelope', key: 'email' },
  { icon: 'pi-chart-bar', key: 'reports' },
  { icon: 'pi-globe', key: 'arabic' },
];
</script>

<template>
  <main class="min-h-screen bg-white">
    <section class="max-w-5xl mx-auto px-6 py-20 text-center">
      <h1 class="text-4xl font-bold mb-4">{{ t('features.title') }}</h1>
      <p class="text-lg text-slate-600 mb-12">{{ t('features.subtitle') }}</p>

      <div class="grid md:grid-cols-3 gap-8">
        <div v-for="f in features" :key="f.key" class="p-6 rounded-xl border border-slate-200 text-start" :data-test="`feature-${f.key}`">
          <i :class="`pi ${f.icon} text-2xl text-indigo-600 mb-3`" />
          <h3 class="font-bold text-lg mb-2">{{ t(`features.${f.key}.title`) }}</h3>
          <p class="text-slate-500 text-sm">{{ t(`features.${f.key}.desc`) }}</p>
        </div>
      </div>
    </section>
  </main>
</template>
