<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { customFieldsApi, type CustomFieldDef } from '@/api/custom-fields';
import { invalidateMetadata } from '@/composables/useMetadata';
import Select from 'primevue/select';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import Message from 'primevue/message';
import CustomFieldEditor from '@/components/CustomFieldEditor.vue';

const { t } = useI18n();

const entityTypes = ['Person', 'Company', 'Deal', 'Activity'];
const entityType = ref('Person');
const fields = ref<CustomFieldDef[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const dialog = ref(false);
const editing = ref<CustomFieldDef | null>(null);

async function fetchFields() {
  loading.value = true;
  error.value = null;
  try {
    fields.value = await customFieldsApi.list(entityType.value);
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err?.response?.data?.message ?? err?.message ?? t('auth.errors.unknown');
  } finally {
    loading.value = false;
  }
}

watch(entityType, fetchFields);
onMounted(fetchFields);

function openCreate() {
  editing.value = {
    entityType: entityType.value,
    key: '',
    label: { ar: '', en: '' },
    type: 'TEXT',
    required: false,
    indexed: false,
  };
  dialog.value = true;
}

function openEdit(row: CustomFieldDef) {
  editing.value = { ...row, label: { ...row.label } };
  dialog.value = true;
}

async function save(payload: CustomFieldDef) {
  try {
    if (payload.id) {
      const { id, entityType: _et, key: _k, type: _t, ...rest } = payload;
      await customFieldsApi.update(id, rest);
    } else {
      await customFieldsApi.create(payload);
    }
    dialog.value = false;
    invalidateMetadata(entityType.value);
    await fetchFields();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err?.response?.data?.message ?? err?.message ?? t('auth.errors.unknown');
  }
}

async function archive(id?: string) {
  if (!id) return;
  try {
    await customFieldsApi.archive(id);
    invalidateMetadata(entityType.value);
    await fetchFields();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err?.response?.data?.message ?? err?.message ?? t('auth.errors.unknown');
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ t('settings.customFields.title') }}</h1>
      <div class="flex gap-3 items-center">
        <Select
          v-model="entityType"
          :options="entityTypes"
          class="w-40"
          data-test="cf-entity-type"
        />
        <Button
          :label="t('settings.customFields.addNew')"
          data-test="add-custom-field"
          @click="openCreate"
        />
      </div>
    </div>

    <Message v-if="error" severity="error" class="mb-4">{{ error }}</Message>

    <DataTable :value="fields" :loading="loading">
      <Column field="key" :header="t('settings.customFields.key')" />
      <Column field="type" :header="t('settings.customFields.type')" />
      <Column :header="t('settings.customFields.labelAr')">
        <template #body="{ data }">{{ data.label?.ar }}</template>
      </Column>
      <Column :header="t('settings.customFields.required')">
        <template #body="{ data }">{{ data.required ? '✓' : '' }}</template>
      </Column>
      <Column :header="t('settings.customFields.indexed')">
        <template #body="{ data }">{{ data.indexed ? '✓' : '' }}</template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <Button
            :label="t('common.edit')"
            size="small"
            severity="secondary"
            @click="openEdit(data)"
          />
          <Button
            :label="t('common.delete')"
            size="small"
            severity="danger"
            class="ms-2"
            @click="archive(data.id)"
          />
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="dialog"
      :header="editing?.id ? t('common.edit') : t('settings.customFields.addNew')"
      :style="{ width: '32rem' }"
    >
      <CustomFieldEditor
        v-if="editing"
        v-model="editing"
        @save="save"
        @cancel="dialog = false"
      />
    </Dialog>
  </div>
</template>
