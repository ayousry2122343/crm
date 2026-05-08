<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import ProgressBar from 'primevue/progressbar';
import { importExportApi, type PreviewResult, type ImportResult } from '@/api/import-export';
import { useAppToast } from '@/composables/useAppToast';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'imported'): void;
}>();

const { t } = useI18n();
const toast = useAppToast();

type Step = 'upload' | 'mapping' | 'result';
const step = ref<Step>('upload');
const uploading = ref(false);
const importing = ref(false);
const file = ref<File | null>(null);
const preview = ref<PreviewResult | null>(null);
const mapping = ref<Record<string, string>>({});
const result = ref<ImportResult | null>(null);

const CRM_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'companyName',
  'lifecycleStage',
  'title',
  'industry',
  'website',
  'source',
] as const;

const crmFieldOptions = computed(() => [
  { label: t('importExport.skip'), value: '' },
  ...CRM_FIELDS.map((f) => ({
    label: t(`importExport.fields.${f}`),
    value: f,
  })),
]);

const dialogVisible = computed({
  get: () => props.visible,
  set: (v) => emit('update:visible', v),
});

function reset() {
  step.value = 'upload';
  file.value = null;
  preview.value = null;
  mapping.value = {};
  result.value = null;
  uploading.value = false;
  importing.value = false;
}

function onClose() {
  dialogVisible.value = false;
  reset();
}

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.length) {
    file.value = input.files[0];
  }
}

async function uploadAndPreview() {
  if (!file.value) return;
  uploading.value = true;
  try {
    preview.value = await importExportApi.preview(file.value);
    autoMap();
    step.value = 'mapping';
  } catch {
    toast.error('errors.unexpected');
  } finally {
    uploading.value = false;
  }
}

function autoMap() {
  if (!preview.value) return;
  const headerLower = preview.value.headers.map((h) => h.toLowerCase().replace(/[\s_-]+/g, ''));
  const aliases: Record<string, string[]> = {
    firstName: ['firstname', 'first'],
    lastName: ['lastname', 'last', 'surname'],
    email: ['email', 'emailaddress', 'mail'],
    phone: ['phone', 'phonenumber', 'tel', 'telephone', 'mobile'],
    companyName: ['companyname', 'company', 'organization', 'organisation'],
    lifecycleStage: ['lifecyclestage', 'stage', 'lifecycle'],
    title: ['title', 'jobtitle', 'position'],
    industry: ['industry', 'sector'],
    website: ['website', 'url', 'web'],
    source: ['source', 'leadsource', 'origin'],
  };

  const newMapping: Record<string, string> = {};
  for (const [field, alts] of Object.entries(aliases)) {
    const idx = headerLower.findIndex((h) => alts.includes(h));
    if (idx !== -1) {
      newMapping[field] = preview.value!.headers[idx];
    }
  }
  mapping.value = newMapping;
}

const mappedCount = computed(() =>
  Object.values(mapping.value).filter(Boolean).length,
);

const canImport = computed(() => mappedCount.value > 0 && preview.value);

async function startImport() {
  if (!preview.value || !file.value) return;
  importing.value = true;
  try {
    const fullPreview = await importExportApi.preview(file.value);
    const invertedMapping: Record<string, string> = {};
    for (const [crmField, fileCol] of Object.entries(mapping.value)) {
      if (fileCol) invertedMapping[crmField] = fileCol;
    }
    result.value = await importExportApi.importPeople(
      fullPreview.rows,
      invertedMapping,
      file.value.name,
    );
    step.value = 'result';
    if (result.value.errorCount === 0) {
      toast.success('common.created');
    }
    emit('imported');
  } catch {
    toast.error('errors.unexpected');
  } finally {
    importing.value = false;
  }
}

function importAnother() {
  reset();
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="t('importExport.importPeople')"
    modal
    :closable="!importing"
    class="w-full max-w-3xl"
    data-test="import-dialog"
    @hide="reset"
  >
    <!-- Step 1: Upload -->
    <div v-if="step === 'upload'" data-test="step-upload">
      <p class="mb-4 text-sm text-gray-600">
        {{ t('importExport.supportedFormats') }} &middot; {{ t('importExport.maxFileSize') }}
      </p>

      <div
        class="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary-400 transition-colors"
        data-test="drop-zone"
        @click="($refs.fileInput as HTMLInputElement)?.click()"
      >
        <i class="pi pi-upload text-4xl text-gray-400 mb-2" />
        <p class="text-gray-500">{{ t('importExport.dragDrop') }}</p>
        <p v-if="file" class="mt-2 font-medium" data-test="file-name">{{ file.name }}</p>
        <input
          ref="fileInput"
          type="file"
          accept=".csv,.xlsx,.xls"
          class="hidden"
          data-test="file-input"
          @change="onFileSelect"
        />
      </div>

      <div class="flex justify-end mt-4">
        <Button
          :label="t('importExport.next')"
          :loading="uploading"
          :disabled="!file"
          icon="pi pi-arrow-right"
          icon-pos="right"
          data-test="next-btn"
          @click="uploadAndPreview"
        />
      </div>
    </div>

    <!-- Step 2: Preview & Mapping -->
    <div v-if="step === 'mapping'" data-test="step-mapping">
      <h3 class="text-lg font-semibold mb-2">{{ t('importExport.preview') }}</h3>
      <p class="text-sm text-gray-500 mb-3">{{ t('importExport.previewDescription') }}</p>

      <DataTable
        :value="preview?.rows ?? []"
        :scrollable="true"
        scroll-height="200px"
        size="small"
        class="mb-6"
        data-test="preview-table"
      >
        <Column
          v-for="h in preview?.headers ?? []"
          :key="h"
          :field="h"
          :header="h"
        />
      </DataTable>

      <h3 class="text-lg font-semibold mb-2">{{ t('importExport.mapping') }}</h3>
      <p class="text-sm text-gray-500 mb-3">{{ t('importExport.mappingDescription') }}</p>

      <div class="grid grid-cols-2 gap-2 items-center mb-2 font-semibold text-sm">
        <span>{{ t('importExport.crmField') }}</span>
        <span>{{ t('importExport.fileColumn') }}</span>
      </div>

      <div
        v-for="field in CRM_FIELDS"
        :key="field"
        class="grid grid-cols-2 gap-2 items-center mb-2"
        :data-test="`map-${field}`"
      >
        <span class="text-sm">{{ t(`importExport.fields.${field}`) }}</span>
        <Select
          v-model="mapping[field]"
          :options="[{ label: t('importExport.skip'), value: '' }, ...(preview?.headers ?? []).map(h => ({ label: h, value: h }))]"
          option-label="label"
          option-value="value"
          :placeholder="t('importExport.skip')"
          class="w-full"
          :data-test="`select-${field}`"
        />
      </div>

      <div class="flex justify-between mt-4">
        <Button
          :label="t('importExport.back')"
          severity="secondary"
          icon="pi pi-arrow-left"
          data-test="back-btn"
          @click="step = 'upload'"
        />
        <Button
          :label="t('importExport.startImport')"
          :loading="importing"
          :disabled="!canImport"
          icon="pi pi-check"
          data-test="import-btn"
          @click="startImport"
        />
      </div>
    </div>

    <!-- Step 3: Results -->
    <div v-if="step === 'result'" data-test="step-result">
      <h3 class="text-lg font-semibold mb-4">{{ t('importExport.importComplete') }}</h3>

      <div class="grid grid-cols-3 gap-4 mb-4">
        <div class="text-center p-3 bg-gray-50 rounded">
          <div class="text-2xl font-bold">{{ result?.totalRows ?? 0 }}</div>
          <div class="text-sm text-gray-500">{{ t('importExport.totalRows') }}</div>
        </div>
        <div class="text-center p-3 bg-green-50 rounded">
          <div class="text-2xl font-bold text-green-600">{{ result?.successCount ?? 0 }}</div>
          <div class="text-sm text-gray-500">{{ t('importExport.successCount') }}</div>
        </div>
        <div class="text-center p-3 bg-red-50 rounded">
          <div class="text-2xl font-bold text-red-600">{{ result?.errorCount ?? 0 }}</div>
          <div class="text-sm text-gray-500">{{ t('importExport.errorCount') }}</div>
        </div>
      </div>

      <ProgressBar
        :value="result ? Math.round((result.successCount / result.totalRows) * 100) : 0"
        class="mb-4"
        data-test="progress-bar"
      />

      <div v-if="result && result.errors.length > 0" class="mb-4">
        <h4 class="font-semibold mb-2">{{ t('importExport.rowErrors') }}</h4>
        <DataTable
          :value="result.errors"
          size="small"
          :scrollable="true"
          scroll-height="200px"
          data-test="error-table"
        >
          <Column :header="t('importExport.row')" field="row" style="width: 80px" />
          <Column :header="t('importExport.errorMessage')" field="message" />
        </DataTable>
      </div>

      <p v-else class="text-green-600 mb-4" data-test="no-errors">
        {{ t('importExport.noErrors') }}
      </p>

      <div class="flex justify-end gap-2">
        <Button
          :label="t('importExport.importAnother')"
          severity="secondary"
          icon="pi pi-refresh"
          data-test="import-another-btn"
          @click="importAnother"
        />
        <Button
          :label="t('importExport.close')"
          icon="pi pi-times"
          data-test="close-btn"
          @click="onClose"
        />
      </div>
    </div>
  </Dialog>
</template>
