<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/pinia/auth.store';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import Message from 'primevue/message';
import { twoFactorApi } from '@/api/two-factor';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const code = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

async function verify() {
  loading.value = true;
  error.value = null;
  try {
    const tempToken = route.query.token as string;
    const result = await twoFactorApi.verify(tempToken, code.value);
    authStore.setAuthFromTokens(result);
    router.push({ name: 'dashboard' });
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err?.response?.data?.message ?? err?.message ?? t('twoFactor.invalidCode');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="bg-white rounded-lg shadow p-8">
    <h1 class="text-2xl font-bold mb-6 text-center">{{ t('twoFactor.title') }}</h1>
    <form class="flex flex-col gap-4" @submit.prevent="verify">
      <p class="text-center text-gray-600">{{ t('twoFactor.enterCodePrompt') }}</p>
      <InputText
        v-model="code"
        :placeholder="t('twoFactor.enterCode')"
        maxlength="8"
        class="w-full text-center text-lg tracking-widest"
        data-test="2fa-code"
        @keyup.enter="verify"
      />
      <Message v-if="error" severity="error">{{ error }}</Message>
      <Button
        type="submit"
        :label="t('twoFactor.verify')"
        :loading="loading"
        data-test="2fa-submit"
      />
      <p class="text-sm text-center text-gray-500">{{ t('twoFactor.useBackupCode') }}</p>
    </form>
  </div>
</template>
