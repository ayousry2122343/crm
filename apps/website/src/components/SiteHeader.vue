<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

function toggleLocale() {
  locale.value = locale.value === 'ar' ? 'en' : 'ar';
  document.documentElement.dir = locale.value === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = locale.value;
}
</script>

<template>
  <header class="bg-white border-b sticky top-0 z-50">
    <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <router-link to="/" class="text-xl font-bold text-indigo-600">{{ t('site.title') }}</router-link>
      <nav class="hidden md:flex items-center gap-6">
        <router-link to="/features" class="text-slate-600 hover:text-indigo-600">{{ t('nav.features') }}</router-link>
        <router-link to="/pricing" class="text-slate-600 hover:text-indigo-600">{{ t('nav.pricing') }}</router-link>
        <router-link to="/contact" class="text-slate-600 hover:text-indigo-600">{{ t('nav.contact') }}</router-link>
      </nav>
      <div class="flex items-center gap-3">
        <button class="text-sm text-slate-500 hover:text-slate-800" @click="toggleLocale">
          {{ locale === 'ar' ? 'EN' : 'عربي' }}
        </button>
        <a href="/login" class="text-sm text-slate-600 hover:text-indigo-600">{{ t('nav.login') }}</a>
        <a href="/sign-up" class="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
          {{ t('site.cta') }}
        </a>
      </div>
    </div>
  </header>
</template>
