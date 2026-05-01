<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/pinia/auth.store';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = computed(() => String(route.query.token ?? ''));
const newPassword = ref('');
const error = ref<string | null>(null);
const loading = ref(false);
const ok = ref(false);

async function submit() {
  error.value = null;
  loading.value = true;
  try {
    await authStore.confirmPasswordReset({ token: token.value, newPassword: newPassword.value });
    ok.value = true;
    setTimeout(() => router.push({ name: 'login' }), 1500);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err?.response?.data?.message ?? err?.message ?? t('auth.errors.unknown');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="bg-white rounded-lg shadow p-8">
    <h1 class="text-2xl font-bold mb-6 text-center">
      {{ t('auth.passwordReset.confirmTitle') }}
    </h1>
    <Message v-if="!token" severity="error">{{ t('auth.errors.unknown') }}</Message>
    <form v-else-if="!ok" class="flex flex-col gap-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm mb-1">{{ t('auth.fields.newPassword') }}</label>
        <Password
          v-model="newPassword"
          toggle-mask
          data-test="password"
          input-class="w-full"
          :feedback="false"
          required
        />
      </div>
      <Message v-if="error" severity="error">{{ error }}</Message>
      <Button
        type="submit"
        :label="t('auth.passwordReset.confirmSubmit')"
        :loading="loading"
        data-test="submit"
      />
    </form>
    <Message v-else severity="success">{{ t('auth.passwordReset.confirmDone') }}</Message>
  </div>
</template>
