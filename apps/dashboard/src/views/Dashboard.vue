<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuth } from '@/composables/useAuth';
import { api as http } from '@/api/client';

const { t } = useI18n();
const { user, workspace } = useAuth();

const stats = ref({ people: 0, companies: 0, deals: 0, activities: 0 });
const loading = ref(true);

onMounted(async () => {
  try {
    const fetch = async (url: string, params: Record<string, unknown> = {}): Promise<number> => {
      try { const r = await http.get(url, { params }); return r.data?.total ?? 0; } catch { return 0; }
    };
    const [people, companies, deals, activities] = await Promise.all([
      fetch('/people', { limit: 0 }),
      fetch('/people', { limit: 0, isCompany: true }),
      fetch('/deals', { limit: 0 }),
      fetch('/activities', { limit: 0 }),
    ]);
    stats.value = { people, companies, deals, activities };
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div data-test="home-page">
    <h1 class="text-2xl font-bold">
      {{ t('dashboard.welcome', { name: user?.fullName ?? '' }) }}
    </h1>
    <p class="text-slate-600 mt-2 mb-6">
      {{ t('dashboard.workspace', { name: workspace?.name ?? '' }) }}
    </p>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <div class="bg-white rounded-xl shadow p-5 text-center" data-test="stat-people">
        <p class="text-sm text-slate-500">{{ t('nav.people') }}</p>
        <p class="text-3xl font-bold text-indigo-600 mt-1">{{ loading ? '...' : stats.people }}</p>
      </div>
      <div class="bg-white rounded-xl shadow p-5 text-center" data-test="stat-companies">
        <p class="text-sm text-slate-500">{{ t('nav.companies') }}</p>
        <p class="text-3xl font-bold text-purple-600 mt-1">{{ loading ? '...' : stats.companies }}</p>
      </div>
      <div class="bg-white rounded-xl shadow p-5 text-center" data-test="stat-deals">
        <p class="text-sm text-slate-500">{{ t('nav.deals') }}</p>
        <p class="text-3xl font-bold text-emerald-600 mt-1">{{ loading ? '...' : stats.deals }}</p>
      </div>
      <div class="bg-white rounded-xl shadow p-5 text-center" data-test="stat-activities">
        <p class="text-sm text-slate-500">{{ t('activities.calendar') }}</p>
        <p class="text-3xl font-bold text-amber-600 mt-1">{{ loading ? '...' : stats.activities }}</p>
      </div>
    </div>
  </div>
</template>
