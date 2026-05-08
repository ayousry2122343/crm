<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { dashboardsApi, type Dashboard } from '@/api/dashboards';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';

const { t } = useI18n();
const router = useRouter();
const dashboards = ref<Dashboard[]>([]);
const loading = ref(false);
const showCreate = ref(false);
const newName = ref('');
const saving = ref(false);

async function load() {
  loading.value = true;
  try {
    dashboards.value = await dashboardsApi.list();
  } finally {
    loading.value = false;
  }
}

async function create() {
  if (!newName.value.trim()) return;
  saving.value = true;
  try {
    const d = await dashboardsApi.create({ name: newName.value.trim() });
    showCreate.value = false;
    newName.value = '';
    router.push({ name: 'dashboard-editor', params: { id: d.id } });
  } finally {
    saving.value = false;
  }
}

async function remove(id: string) {
  await dashboardsApi.delete(id);
  dashboards.value = dashboards.value.filter((d) => d.id !== id);
}

onMounted(load);
</script>

<template>
  <div data-test="dashboards-index-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('dashboards.title') }}</h1>
      <Button :label="t('dashboards.addDashboard')" icon="pi pi-plus" data-test="add-dashboard-btn" @click="showCreate = true" />
    </div>

    <DataTable :value="dashboards" :loading="loading" data-test="dashboards-table">
      <Column field="name" :header="t('dashboards.name')" sortable>
        <template #body="{ data }">
          <router-link :to="{ name: 'dashboard-editor', params: { id: data.id } }" class="text-indigo-600 hover:underline">
            {{ data.name }}
          </router-link>
        </template>
      </Column>
      <Column :header="t('dashboards.widgets')">
        <template #body="{ data }">{{ data.layout?.widgets?.length ?? 0 }}</template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <Button icon="pi pi-trash" severity="danger" text size="small" @click="remove(data.id)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showCreate" :header="t('dashboards.addDashboard')" modal class="w-[400px]">
      <div class="flex flex-col gap-3 py-2">
        <InputText v-model="newName" :placeholder="t('dashboards.name')" data-test="dashboard-name-input" class="w-full" />
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" text @click="showCreate = false" />
        <Button :label="t('common.save')" :loading="saving" @click="create" />
      </template>
    </Dialog>
  </div>
</template>
