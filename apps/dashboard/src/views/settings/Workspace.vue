<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { workspaceApi } from '@/api/workspace';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Button from 'primevue/button';
import Message from 'primevue/message';

const { t } = useI18n();

const ws = ref({ name: '', primaryLocale: 'ar', primaryCurrency: 'EGP' });
const loading = ref(true);
const saving = ref(false);
const error = ref<string | null>(null);
const saved = ref(false);

const localeOptions = [
  { value: 'ar', label: 'العربية' },
  { value: 'en', label: 'English' },
];
const currencyOptions = [
  { value: 'EGP', label: 'EGP' },
  { value: 'SAR', label: 'SAR' },
  { value: 'AED', label: 'AED' },
  { value: 'USD', label: 'USD' },
];

onMounted(async () => {
  try {
    const data = await workspaceApi.get();
    ws.value = {
      name: data.name,
      primaryLocale: data.primaryLocale,
      primaryCurrency: data.primaryCurrency,
    };
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err?.response?.data?.message ?? err?.message ?? t('auth.errors.unknown');
  } finally {
    loading.value = false;
  }
});

async function save() {
  saving.value = true;
  error.value = null;
  saved.value = false;
  try {
    await workspaceApi.update(ws.value);
    saved.value = true;
    setTimeout(() => (saved.value = false), 2500);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err?.response?.data?.message ?? err?.message ?? t('auth.errors.unknown');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-xl">
    <h1 class="text-2xl font-bold mb-6">{{ t('settings.workspace.title') }}</h1>
    <div v-if="loading" class="text-slate-500">{{ t('common.loading') }}</div>
    <div v-else class="flex flex-col gap-4 bg-white rounded p-6 border">
      <div>
        <label class="block text-sm mb-1">{{ t('auth.fields.workspaceName') }}</label>
        <InputText v-model="ws.name" data-test="ws-name" class="w-full" />
      </div>
      <div>
        <label class="block text-sm mb-1">{{ t('common.locale') }}</label>
        <Select
          v-model="ws.primaryLocale"
          :options="localeOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          data-test="ws-locale"
        />
      </div>
      <div>
        <label class="block text-sm mb-1">{{ t('common.currency') }}</label>
        <Select
          v-model="ws.primaryCurrency"
          :options="currencyOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          data-test="ws-currency"
        />
      </div>
      <Message v-if="error" severity="error">{{ error }}</Message>
      <Message v-if="saved" severity="success">{{ t('settings.workspace.saved') }}</Message>
      <Button
        :label="t('settings.workspace.save')"
        :loading="saving"
        data-test="save"
        @click="save"
      />
    </div>
  </div>
</template>
