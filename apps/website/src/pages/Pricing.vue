<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();

const plans = [
  { key: 'free', price: '0', period: '14 days', highlighted: false },
  { key: 'growth', price: '750', period: '/mo', highlighted: true },
  { key: 'enterprise', price: '', period: '', highlighted: false },
];
</script>

<template>
  <main class="min-h-screen bg-white">
    <section class="max-w-5xl mx-auto px-6 py-20 text-center">
      <h1 class="text-4xl font-bold mb-4">{{ t('pricing.title') }}</h1>
      <p class="text-lg text-slate-600 mb-12">{{ t('pricing.subtitle') }}</p>

      <div class="grid md:grid-cols-3 gap-6">
        <div
          v-for="plan in plans"
          :key="plan.key"
          class="rounded-xl border p-8 flex flex-col"
          :class="plan.highlighted ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-200' : 'border-slate-200'"
          :data-test="`plan-${plan.key}`"
        >
          <h3 class="text-xl font-bold mb-2">{{ t(`pricing.${plan.key}.name`) }}</h3>
          <p class="text-slate-500 text-sm mb-4">{{ t(`pricing.${plan.key}.desc`) }}</p>
          <p v-if="plan.price" class="text-3xl font-bold mb-1">
            <span v-if="plan.key === 'growth'">EGP </span>{{ plan.price }}
            <span class="text-base font-normal text-slate-400">{{ plan.period }}</span>
          </p>
          <p v-else class="text-xl font-medium text-slate-600 mb-1">{{ t('pricing.contactSales') }}</p>
          <ul class="text-sm text-slate-600 text-start mt-4 mb-6 space-y-2 flex-1">
            <li v-for="i in 4" :key="i">&#10003; {{ t(`pricing.${plan.key}.f${i}`) }}</li>
          </ul>
          <a
            :href="plan.key === 'enterprise' ? '/contact' : `/sign-up?plan=${plan.key}`"
            class="block px-6 py-2 rounded-md text-center font-medium"
            :class="plan.highlighted ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
          >
            {{ plan.key === 'enterprise' ? t('pricing.contactSales') : t('site.cta') }}
          </a>
        </div>
      </div>
    </section>
  </main>
</template>
