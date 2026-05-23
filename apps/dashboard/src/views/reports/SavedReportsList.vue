<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { savedReportsApi, type SavedReport } from '@/api/saved-reports';

const { t } = useI18n();
const router = useRouter();
const reports = ref<SavedReport[]>([]);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    reports.value = await savedReportsApi.list();
  } finally {
    loading.value = false;
  }
}

async function remove(id: string) {
  await savedReportsApi.delete(id);
  await load();
}

onMounted(load);
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">{{ t('savedReports.title') }}</h1>
      <Button
        :label="t('savedReports.create')"
        icon="pi pi-plus"
        @click="router.push({ name: 'report-builder' })"
      />
    </div>

    <DataTable :value="reports" :loading="loading" stripedRows>
      <Column field="name" :header="t('common.name')" />
      <Column field="entityType" :header="t('savedReports.entity')" />
      <Column field="reportType" :header="t('savedReports.type')">
        <template #body="{ data }">
          <Tag :value="data.reportType" severity="info" />
        </template>
      </Column>
      <Column field="isShared" :header="t('savedReports.shared')">
        <template #body="{ data }">
          <i :class="data.isShared ? 'pi pi-check text-green-500' : 'pi pi-times text-gray-400'" />
        </template>
      </Column>
      <Column field="updatedAt" :header="t('savedReports.lastModified')">
        <template #body="{ data }">
          {{ new Date(data.updatedAt).toLocaleDateString() }}
        </template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button
              icon="pi pi-play"
              severity="success"
              text
              size="small"
              @click="router.push({ name: 'report-view', params: { id: data.id } })"
            />
            <Button
              icon="pi pi-pencil"
              text
              size="small"
              @click="router.push({ name: 'report-edit', params: { id: data.id } })"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              @click="remove(data.id)"
            />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>
