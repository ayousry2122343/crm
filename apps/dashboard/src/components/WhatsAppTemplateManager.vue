<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import { api as http } from '@/api/client';

const props = defineProps<{ configId: string }>();
const { t } = useI18n();

interface WATemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  components: any;
  status: string;
}

const templates = ref<WATemplate[]>([]);
const loading = ref(true);
const showPreview = ref(false);
const selectedTemplate = ref<WATemplate | null>(null);

const statusSeverity: Record<string, string> = {
  APPROVED: 'success',
  PENDING: 'warn',
  REJECTED: 'danger',
};

async function load() {
  loading.value = true;
  try {
    const res = await http.get<WATemplate[]>(`/channels/${props.configId}/whatsapp-templates`);
    templates.value = res.data;
  } finally {
    loading.value = false;
  }
}

async function syncTemplates() {
  loading.value = true;
  try {
    await http.post(`/channels/${props.configId}/whatsapp-templates/sync`, { templates: [] });
    await load();
  } finally {
    loading.value = false;
  }
}

function preview(tpl: WATemplate) {
  selectedTemplate.value = tpl;
  showPreview.value = true;
}

onMounted(load);
</script>

<template>
  <div data-test="whatsapp-template-manager">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-lg font-semibold">{{ t('whatsapp.templates') }}</h3>
      <Button :label="t('whatsapp.syncTemplates')" icon="pi pi-refresh" severity="secondary" @click="syncTemplates" />
    </div>

    <DataTable :value="templates" :loading="loading" striped-rows>
      <Column field="name" :header="t('whatsapp.templateName')" />
      <Column field="language" :header="t('whatsapp.language')" />
      <Column field="category" :header="t('whatsapp.category')" />
      <Column :header="t('channels.status')">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="statusSeverity[data.status] ?? 'info'" />
        </template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <Button :label="t('whatsapp.preview')" text size="small" @click="preview(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showPreview" :header="selectedTemplate?.name ?? ''" modal class="w-full max-w-md">
      <pre v-if="selectedTemplate" class="whitespace-pre-wrap text-sm bg-surface-50 p-4 rounded">{{ JSON.stringify(selectedTemplate.components, null, 2) }}</pre>
    </Dialog>
  </div>
</template>
