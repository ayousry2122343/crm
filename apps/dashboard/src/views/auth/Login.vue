<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/pinia/auth.store';
import InputText from 'primevue/inputtext';
import Password from 'primevue/password';
import Button from 'primevue/button';
import Message from 'primevue/message';

const { t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const form = ref({ email: '', password: '', workspaceSlug: '' });
const error = ref<string | null>(null);
const loading = ref(false);

async function submit() {
  error.value = null;
  loading.value = true;
  try {
    await authStore.login({ ...form.value });
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
    <h1 class="text-2xl font-bold mb-6 text-center">{{ t('auth.login.title') }}</h1>
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <div>
        <label class="block text-sm mb-1">{{ t('auth.fields.workspaceSlug') }}</label>
        <InputText
          v-model="form.workspaceSlug"
          data-test="workspace-slug"
          class="w-full"
          required
        />
      </div>
      <div>
        <label class="block text-sm mb-1">{{ t('auth.fields.email') }}</label>
        <InputText
          v-model="form.email"
          type="email"
          data-test="email"
          class="w-full"
          required
        />
      </div>
      <div>
        <label class="block text-sm mb-1">{{ t('auth.fields.password') }}</label>
        <Password
          v-model="form.password"
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
        :label="t('auth.login.submit')"
        :loading="loading"
        data-test="submit"
      />
      <p class="text-sm text-center mt-2">
        <router-link to="/forgot-password" class="text-blue-600 hover:underline">
          {{ t('auth.login.forgotPassword') }}
        </router-link>
      </p>
      <p class="text-sm text-center">
        {{ t('auth.login.noAccount') }}
        <router-link to="/sign-up" class="text-blue-600 hover:underline">
          {{ t('auth.signUp.title') }}
        </router-link>
      </p>
    </form>
  </div>
</template>
