<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/pinia/auth.store';
import { usersApi } from '@/api/users';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = computed(() => String(route.query.token ?? ''));
const password = ref('');
const error = ref<string | null>(null);
const loading = ref(false);

async function submit() {
  error.value = null;
  loading.value = true;
  try {
    const result = await usersApi.acceptInvite({ token: token.value, password: password.value });
    authStore.setAuthFromTokens(result);
    router.push({ name: 'dashboard' });
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
    <h1 class="text-2xl font-bold mb-6 text-center">{{ t('auth.acceptInvite.title') }}</h1>
    <Message v-if="!token" severity="error">{{ t('auth.errors.unknown') }}</Message>
    <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm mb-1">{{ t('auth.fields.password') }}</label>
        <Password
          v-model="password"
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
        :label="t('auth.acceptInvite.submit')"
        :loading="loading"
        data-test="submit"
      />
    </form>
  </div>
</template>
