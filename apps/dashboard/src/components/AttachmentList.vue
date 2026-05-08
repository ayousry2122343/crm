<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { attachmentsApi } from '@/api/attachments';
import type { Attachment, AttachmentEntityType } from '@/api/attachments';
import { useAppToast } from '@/composables/useAppToast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import FileUpload from 'primevue/fileupload';

const props = defineProps<{
  entityType: AttachmentEntityType;
  entityId: string;
}>();

const { t } = useI18n();
const toast = useAppToast();

const attachments = ref<Attachment[]>([]);
const loading = ref(false);
const uploading = ref(false);

async function load() {
  loading.value = true;
  try {
    const resp = await attachmentsApi.list(props.entityType, props.entityId);
    attachments.value = resp.items;
  } finally {
    loading.value = false;
  }
}

async function onUpload(event: { files: File[] }) {
  const file = event.files[0];
  if (!file) return;
  uploading.value = true;
  try {
    await attachmentsApi.upload(props.entityType, props.entityId, file);
    toast.success('attachments.uploadSuccess');
    await load();
  } finally {
    uploading.value = false;
  }
}

function onSelectFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    onUpload({ files: Array.from(input.files) });
    input.value = '';
  }
}

async function downloadFile(att: Attachment) {
  const url = await attachmentsApi.download(att.id);
  window.open(url, '_blank');
}

async function deleteFile(att: Attachment) {
  await attachmentsApi.delete(att.id);
  toast.success('attachments.deleteSuccess');
  await load();
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

onMounted(load);
</script>

<template>
  <div data-test="attachments-section">
    <div class="flex align-items-center justify-content-between mb-3">
      <h3 class="m-0">{{ t('attachments.title') }}</h3>
      <label data-test="upload-btn" class="p-button p-button-sm" style="cursor: pointer">
        <i class="pi pi-upload mr-2" />
        {{ t('attachments.upload') }}
        <input type="file" class="hidden" @change="onSelectFiles" />
      </label>
    </div>

    <div v-if="attachments.length === 0 && !loading" data-test="no-attachments" class="text-center p-4 text-color-secondary">
      {{ t('attachments.noAttachments') }}
    </div>

    <DataTable v-else :value="attachments" :loading="loading" data-test="attachment-table">
      <Column field="originalName" :header="t('attachments.fileName')" />
      <Column :header="t('attachments.fileSize')">
        <template #body="{ data: att }">{{ formatSize(att.sizeBytes) }}</template>
      </Column>
      <Column field="mimeType" :header="t('attachments.fileType')" />
      <Column :header="t('attachments.uploadDate')">
        <template #body="{ data: att }">{{ new Date(att.createdAt).toLocaleDateString() }}</template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data: att }">
          <Button
            icon="pi pi-download"
            text
            rounded
            size="small"
            :data-test="`download-${att.id}`"
            @click="downloadFile(att)"
          />
          <Button
            icon="pi pi-trash"
            text
            rounded
            size="small"
            severity="danger"
            :data-test="`delete-${att.id}`"
            @click="deleteFile(att)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>
