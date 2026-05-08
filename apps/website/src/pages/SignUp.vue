<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { t } = useI18n();
const route = useRoute();
const plan = ref((route.query.plan as string) || 'free');

const form = ref({ fullName: '', email: '', password: '', workspaceName: '', workspaceSlug: '' });
const loading = ref(false);
const error = ref('');

async function submit() {
  loading.value = true;
  error.value = '';
  try {
    const res = await fetch('/api/v1/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form.value, plan: plan.value }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      error.value = data.message ?? t('signUp.error');
      return;
    }
    window.location.href = '/dashboard';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <main class="min-h-screen bg-slate-50 flex items-center justify-center py-12">
    <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-md" data-test="signup-page">
      <h1 class="text-2xl font-bold mb-6 text-center">{{ t('signUp.title') }}</h1>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('signUp.fullName') }}</label>
          <input v-model="form.fullName" type="text" class="w-full border rounded-md px-3 py-2" data-test="signup-name" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('signUp.email') }}</label>
          <input v-model="form.email" type="email" class="w-full border rounded-md px-3 py-2" data-test="signup-email" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('signUp.password') }}</label>
          <input v-model="form.password" type="password" class="w-full border rounded-md px-3 py-2" data-test="signup-password" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('signUp.workspaceName') }}</label>
          <input v-model="form.workspaceName" type="text" class="w-full border rounded-md px-3 py-2" data-test="signup-ws-name" required />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('signUp.workspaceSlug') }}</label>
          <input v-model="form.workspaceSlug" type="text" class="w-full border rounded-md px-3 py-2" data-test="signup-ws-slug" required />
        </div>

        <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>

        <button type="submit" :disabled="loading" class="px-6 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:opacity-50" data-test="signup-submit">
          {{ loading ? t('common.loading') : t('signUp.submit') }}
        </button>
      </form>
    </div>
  </main>
</template>
