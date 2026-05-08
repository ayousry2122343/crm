<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputSwitch from 'primevue/inputswitch';
import { portalApi, type Portal } from '@/api/portal';

const { t } = useI18n();

const portal = ref<Portal | null>(null);
const saving = ref(false);
const enabled = ref(false);
const domain = ref('');

async function load() {
  portal.value = await portalApi.getSettings();
  if (portal.value) {
    enabled.value = portal.value.enabled;
    domain.value = portal.value.domain ?? '';
  }
}

async function save() {
  saving.value = true;
  try {
    portal.value = await portalApi.updateSettings({ enabled: enabled.value, domain: domain.value || undefined });
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div data-test="portal-settings-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('portal.title') }}</h1>
      <Button :label="t('common.save')" :loading="saving" @click="save" data-test="save-portal-btn" />
    </div>

    <div class="bg-white rounded-lg border p-6 max-w-xl">
      <div class="flex items-center gap-3 mb-4">
        <label class="text-sm font-medium">{{ t('portal.enabled') }}</label>
        <InputSwitch v-model="enabled" data-test="portal-enabled" />
      </div>
      <div class="mb-4">
        <label class="text-sm font-medium mb-1 block">{{ t('portal.domain') }}</label>
        <InputText v-model="domain" class="w-full" placeholder="portal.yourcompany.com" data-test="portal-domain" />
      </div>
      <div class="text-sm text-slate-400">
        {{ t('portal.note') }}
      </div>
    </div>
  </div>
</template>
