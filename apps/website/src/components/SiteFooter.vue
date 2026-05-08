<script setup lang="ts">
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
</script>

<template>
  <footer class="bg-slate-900 text-slate-400 py-12">
    <div class="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
      <div>
        <h3 class="text-white font-bold mb-3">{{ t('site.title') }}</h3>
        <p class="text-sm">{{ t('site.tagline') }}</p>
      </div>
      <div>
        <h4 class="text-white font-medium mb-3">{{ t('footer.product') }}</h4>
        <ul class="space-y-2 text-sm">
          <li><router-link to="/features" class="hover:text-white">{{ t('nav.features') }}</router-link></li>
          <li><router-link to="/pricing" class="hover:text-white">{{ t('nav.pricing') }}</router-link></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-medium mb-3">{{ t('footer.company') }}</h4>
        <ul class="space-y-2 text-sm">
          <li><router-link to="/contact" class="hover:text-white">{{ t('nav.contact') }}</router-link></li>
        </ul>
      </div>
    </div>
    <div class="max-w-6xl mx-auto px-6 mt-8 pt-8 border-t border-slate-800 text-center text-xs">
      &copy; {{ new Date().getFullYear() }} CRM. {{ t('footer.rights') }}
    </div>
  </footer>
</template>
