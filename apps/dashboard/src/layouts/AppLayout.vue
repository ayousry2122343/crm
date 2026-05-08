<script setup lang="ts">
import { ref } from 'vue';
import { useAuth } from '@/composables/useAuth';
import { useLocale } from '@/composables/useLocale';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import { useI18n } from 'vue-i18n';
import GlobalSearch from '@/components/GlobalSearch.vue';
import CopilotSidebar from '@/components/CopilotSidebar.vue';

const auth = useAuth();
const router = useRouter();
const { t } = useI18n();
const { locale, setLocale } = useLocale();
const searchRef = ref<InstanceType<typeof GlobalSearch> | null>(null);
const copilotVisible = ref(false);

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
        <router-link to="/deals" class="nav-link" data-test="nav-deals">
          <i class="pi pi-dollar mr-2" />{{ t('nav.deals') }}
        </router-link>
        <router-link to="/quotes" class="nav-link" data-test="nav-quotes">
          <i class="pi pi-file mr-2" />{{ t('nav.quotes') }}
        </router-link>
        <router-link to="/campaigns" class="nav-link" data-test="nav-campaigns">
          <i class="pi pi-megaphone mr-2" />{{ t('nav.campaigns') }}
        </router-link>
        <router-link to="/sequences" class="nav-link" data-test="nav-sequences">
          <i class="pi pi-replay mr-2" />{{ t('nav.sequences') }}
        </router-link>
        <router-link to="/lists" class="nav-link" data-test="nav-lists">
          <i class="pi pi-list mr-2" />{{ t('nav.lists') }}
        </router-link>
        <router-link to="/calendar" class="nav-link" data-test="nav-calendar">
          <i class="pi pi-calendar mr-2" />{{ t('nav.calendar') }}
        </router-link>
        <router-link to="/reports" class="nav-link" data-test="nav-reports">
          <i class="pi pi-chart-bar mr-2" />{{ t('nav.reports') }}
        </router-link>
        <router-link to="/dashboards" class="nav-link" data-test="nav-dashboards">
          <i class="pi pi-th-large mr-2" />{{ t('nav.dashboards') }}
        </router-link>
        <router-link to="/forms" class="nav-link" data-test="nav-forms">
          <i class="pi pi-file-edit mr-2" />{{ t('nav.forms') }}
        </router-link>
        <router-link to="/blogs" class="nav-link" data-test="nav-blogs">
          <i class="pi pi-file-edit mr-2" />{{ t('nav.blogs') }}
        </router-link>
        <div class="mt-4 mb-2 text-xs text-slate-400 uppercase tracking-wider">
          {{ t('nav.automationGroup') }}
        </div>
        <router-link to="/automation/workflows" class="nav-link" data-test="nav-workflows">
          <i class="pi pi-bolt mr-2" />{{ t('nav.workflows') }}
        </router-link>
        <router-link to="/automation/webhooks" class="nav-link" data-test="nav-webhooks">
          <i class="pi pi-link mr-2" />{{ t('nav.webhooks') }}
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
        <router-link to="/settings/pipelines" class="nav-link" data-test="nav-pipelines">
          <i class="pi pi-sitemap mr-2" />{{ t('nav.pipelines') }}
        </router-link>
        <router-link to="/settings/won-lost-reasons" class="nav-link" data-test="nav-won-lost">
          <i class="pi pi-check-circle mr-2" />{{ t('nav.wonLostReasons') }}
        </router-link>
        <router-link to="/settings/products" class="nav-link" data-test="nav-products">
          <i class="pi pi-box mr-2" />{{ t('nav.products') }}
        </router-link>
        <router-link to="/settings/pricebooks" class="nav-link" data-test="nav-pricebooks">
          <i class="pi pi-money-bill mr-2" />{{ t('nav.pricebooks') }}
        </router-link>
        <router-link to="/settings/email-templates" class="nav-link" data-test="nav-email-templates">
          <i class="pi pi-envelope mr-2" />{{ t('nav.emailTemplates') }}
        </router-link>
        <router-link to="/settings/email-accounts" class="nav-link" data-test="nav-email-accounts">
          <i class="pi pi-inbox mr-2" />{{ t('nav.emailAccounts') }}
        </router-link>
        <router-link to="/settings/portal" class="nav-link" data-test="nav-portal">
          <i class="pi pi-globe mr-2" />{{ t('nav.portal') }}
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
            icon="pi pi-sparkles"
            severity="secondary"
            size="small"
            data-test="copilot-toggle"
            @click="copilotVisible = !copilotVisible"
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
      <CopilotSidebar v-model:visible="copilotVisible" />
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
