<script setup lang="ts">
import { useAuth } from '@/composables/useAuth';
import { useLocale } from '@/composables/useLocale';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useI18n } from 'vue-i18n';

const auth = useAuth();
const router = useRouter();
const { t } = useI18n();
const { locale, setLocale } = useLocale();

async function handleLogout() {
  await auth.store.logout();
  router.push({ name: 'login' });
}
</script>

<template>
  <div class="min-h-screen flex bg-slate-50">
    <aside class="w-60 bg-slate-900 text-white p-4 flex-shrink-0">
      <h2 class="text-lg font-bold mb-6">
        {{ auth.workspace.value?.name ?? t('app.title') }}
      </h2>
      <nav class="flex flex-col gap-2">
        <router-link to="/dashboard" class="hover:underline" data-test="nav-home">
          {{ t('nav.home') }}
        </router-link>
        <router-link to="/settings/workspace" class="hover:underline" data-test="nav-ws">
          {{ t('nav.workspaceSettings') }}
        </router-link>
        <router-link to="/settings/users" class="hover:underline" data-test="nav-users">
          {{ t('nav.users') }}
        </router-link>
        <router-link
          to="/settings/custom-fields"
          class="hover:underline"
          data-test="nav-custom-fields"
        >
          {{ t('nav.customFields') }}
        </router-link>
      </nav>
    </aside>
    <main class="flex-1 min-w-0">
      <header class="bg-white border-b px-6 py-3 flex items-center justify-between">
        <span class="font-medium">{{ auth.user.value?.fullName }}</span>
        <div class="flex gap-2">
          <Button
            :label="locale === 'ar' ? 'EN' : 'AR'"
            severity="secondary"
            size="small"
            @click="setLocale(locale === 'ar' ? 'en' : 'ar')"
          />
          <Button
            :label="t('nav.logout')"
            severity="secondary"
            size="small"
            data-test="logout"
            @click="handleLogout"
          />
        </div>
      </header>
      <section class="p-6">
        <router-view />
      </section>
    </main>
  </div>
</template>
