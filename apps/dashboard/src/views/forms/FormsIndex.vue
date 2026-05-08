<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import { formsApi, type CrmForm } from '@/api/forms';

const { t } = useI18n();
const router = useRouter();

const forms = ref<CrmForm[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const creating = ref(false);
const newName = ref('');
const newSlug = ref('');

async function load() {
  loading.value = true;
  try {
    forms.value = await formsApi.list();
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  if (!newName.value.trim() || !newSlug.value.trim()) return;
  creating.value = true;
  try {
    const form = await formsApi.create({
      name: newName.value.trim(),
      slug: newSlug.value.trim().toLowerCase().replace(/\s+/g, '-'),
      fields: [],
    });
    newName.value = '';
    newSlug.value = '';
    showCreate.value = false;
    router.push({ name: 'form-editor', params: { id: form.id } });
  } finally {
    creating.value = false;
  }
}

async function handleDelete(id: string) {
  await formsApi.delete(id);
  await load();
}

onMounted(load);
</script>

<template>
  <div data-test="forms-index-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('forms.title') }}</h1>
      <Button
        :label="t('forms.addForm')"
        icon="pi pi-plus"
        data-test="add-form-btn"
        @click="showCreate = true"
      />
    </div>

    <DataTable :value="forms" :loading="loading" striped-rows data-test="forms-table">
      <template #empty>
        <div class="text-center py-4 text-slate-500">{{ t('forms.noForms') }}</div>
      </template>
      <Column field="name" :header="t('forms.formName')" sortable>
        <template #body="{ data }">
          <router-link :to="{ name: 'form-editor', params: { id: data.id } }" class="text-blue-600 hover:underline">
            {{ data.name }}
          </router-link>
        </template>
      </Column>
      <Column field="slug" :header="t('forms.slug')" sortable />
      <Column :header="t('forms.status')">
        <template #body="{ data }">
          <Tag :value="data.isPublic ? t('forms.public') : t('forms.draft')" :severity="data.isPublic ? 'success' : 'secondary'" />
        </template>
      </Column>
      <Column :header="t('common.actions')" style="width: 80px">
        <template #body="{ data }">
          <Button icon="pi pi-trash" severity="danger" size="small" text @click="handleDelete(data.id)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showCreate" :header="t('forms.addForm')" modal class="w-full max-w-sm">
      <div class="flex flex-col gap-4">
        <InputText v-model="newName" :placeholder="t('forms.formName')" class="w-full" data-test="form-name-input" />
        <InputText v-model="newSlug" :placeholder="t('forms.slug')" class="w-full" data-test="form-slug-input" />
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showCreate = false" />
          <Button :label="t('common.save')" :loading="creating" @click="handleCreate" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
