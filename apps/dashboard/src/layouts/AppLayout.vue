<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useLocale } from '@/composables/useLocale';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useI18n } from 'vue-i18n';
import GlobalSearch from '@/components/GlobalSearch.vue';

const auth = useAuth();
const router = useRouter();
const { t } = useI18n();
const { locale, setLocale } = useLocale();
const searchRef = ref<InstanceType<typeof GlobalSearch> | null>(null);

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
      <nav class="flex flex-col gap-1">
        <router-link to="/dashboard" class="nav-link" data-test="nav-home">
          <i class="pi pi-home mr-2" />{{ t('nav.home') }}
        </router-link>
        <router-link to="/people" class="nav-link" data-test="nav-people">
          <i class="pi pi-users mr-2" />{{ t('nav.people') }}
        </router-link>
        <router-link to="/companies" class="nav-link" data-test="nav-companies">
          <i class="pi pi-building mr-2" />{{ t('nav.companies') }}
        </router-link>
        <router-link to="/lists" class="nav-link" data-test="nav-lists">
          <i class="pi pi-list mr-2" />{{ t('nav.lists') }}
        </router-link>
        <div class="mt-4 mb-2 text-xs text-slate-400 uppercase tracking-wider">
          {{ t('nav.settingsGroup') }}
        </div>
        <router-link to="/settings/workspace" class="nav-link" data-test="nav-ws">
          <i class="pi pi-cog mr-2" />{{ t('nav.workspaceSettings') }}
        </router-link>
        <router-link to="/settings/users" class="nav-link" data-test="nav-users">
          <i class="pi pi-user-edit mr-2" />{{ t('nav.users') }}
        </router-link>
        <router-link
          to="/settings/custom-fields"
          class="nav-link"
          data-test="nav-custom-fields"
        >
          <i class="pi pi-sliders-h mr-2" />{{ t('nav.customFields') }}
        </router-link>
      </nav>
    </aside>
    <main class="flex-1 min-w-0">
      <header class="bg-white border-b px-6 py-3 flex items-center justify-between">
        <span class="font-medium">{{ auth.user.value?.fullName }}</span>
        <div class="flex gap-2">
          <Button
            :label="t('search.placeholder')"
            icon="pi pi-search"
            severity="secondary"
            size="small"
            data-test="search-trigger"
            @click="searchRef?.open()"
          />
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
      <GlobalSearch ref="searchRef" />
    </main>
  </div>
</template>

<style scoped>
.nav-link {
  @apply flex items-center px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors;
}
.router-link-active.nav-link {
  @apply bg-slate-800 text-white font-medium;
}
</style>
