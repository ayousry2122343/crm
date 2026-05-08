<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import { emailTemplatesApi, type EmailTemplate } from '@/api/email-templates';

const { t } = useI18n();

const templates = ref<EmailTemplate[]>([]);
const loading = ref(true);
const showEditor = ref(false);
const saving = ref(false);
const editingId = ref<string | null>(null);
const form = ref({ name: '', subject: '', body: '', category: '' });

async function load() {
  loading.value = true;
  try {
    templates.value = await emailTemplatesApi.list();
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  form.value = { name: '', subject: '', body: '', category: '' };
  showEditor.value = true;
}

function openEdit(tpl: EmailTemplate) {
  editingId.value = tpl.id;
  form.value = { name: tpl.name, subject: tpl.subject, body: tpl.body, category: tpl.category ?? '' };
  showEditor.value = true;
}

async function handleSave() {
  if (!form.value.name.trim() || !form.value.subject.trim()) return;
  saving.value = true;
  try {
    const data = {
      name: form.value.name.trim(),
      subject: form.value.subject.trim(),
      body: form.value.body,
      category: form.value.category || undefined,
    };
    if (editingId.value) {
      await emailTemplatesApi.update(editingId.value, data);
    } else {
      await emailTemplatesApi.create(data);
    }
    showEditor.value = false;
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id: string) {
  await emailTemplatesApi.delete(id);
  await load();
}

onMounted(load);
</script>

<template>
  <div data-test="email-templates-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('email.templates') }}</h1>
      <Button
        :label="t('email.addTemplate')"
        icon="pi pi-plus"
        data-test="add-template-btn"
        @click="openCreate"
      />
    </div>

    <DataTable :value="templates" :loading="loading" striped-rows data-test="templates-table">
      <template #empty>
        <div class="text-center py-4 text-slate-500">{{ t('email.noTemplates') }}</div>
      </template>
      <Column field="name" :header="t('email.templateName')" sortable />
      <Column field="subject" :header="t('email.subject')" sortable />
      <Column field="category" :header="t('email.category')" sortable />
      <Column :header="t('common.actions')" style="width: 120px">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" severity="secondary" size="small" text @click="openEdit(data)" />
            <Button icon="pi pi-trash" severity="danger" size="small" text @click="handleDelete(data.id)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="showEditor"
      :header="editingId ? t('email.editTemplate') : t('email.addTemplate')"
      modal
      class="w-full max-w-lg"
    >
      <div class="flex flex-col gap-4">
        <InputText v-model="form.name" :placeholder="t('email.templateName')" class="w-full" data-test="template-name" />
        <InputText v-model="form.subject" :placeholder="t('email.subject')" class="w-full" data-test="template-subject" />
        <Textarea v-model="form.body" :placeholder="t('email.body')" rows="8" class="w-full" data-test="template-body" />
        <InputText v-model="form.category" :placeholder="t('email.category')" class="w-full" />
        <p class="text-xs text-slate-500">{{ t('email.mergeTagsHint') }}</p>
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showEditor = false" />
          <Button :label="t('common.save')" :loading="saving" @click="handleSave" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
