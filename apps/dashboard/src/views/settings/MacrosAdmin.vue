<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { macrosApi, type Macro, type CreateMacroInput } from '@/api/macros';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Message from 'primevue/message';

const { t } = useI18n();
const macros = ref<Macro[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const dialogVisible = ref(false);
const editing = ref<Macro | null>(null);

const form = ref<CreateMacroInput>({
  name: '',
  content: '',
  category: '',
  shortcut: '',
  visibility: 'GLOBAL',
});

const visibilityOptions = [
  { label: 'Personal', value: 'PERSONAL' },
  { label: 'Team', value: 'TEAM' },
  { label: 'Global', value: 'GLOBAL' },
];

const visibilitySeverity: Record<string, string> = {
  PERSONAL: 'info',
  TEAM: 'warn',
  GLOBAL: 'success',
};

onMounted(load);

async function load() {
  loading.value = true;
  try {
    macros.value = await macrosApi.list();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.value = { name: '', content: '', category: '', shortcut: '', visibility: 'GLOBAL' };
  dialogVisible.value = true;
}

function openEdit(m: Macro) {
  editing.value = m;
  form.value = {
    name: m.name,
    content: m.content,
    category: m.category ?? '',
    shortcut: m.shortcut ?? '',
    visibility: m.visibility,
  };
  dialogVisible.value = true;
}

async function save() {
  try {
    if (editing.value) {
      await macrosApi.update(editing.value.id, form.value);
    } else {
      await macrosApi.create(form.value);
    }
    dialogVisible.value = false;
    await load();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message;
  }
}

async function archive(id: string) {
  await macrosApi.archive(id);
  await load();
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">{{ t('macros.title') }}</h1>
      <Button :label="t('macros.create')" icon="pi pi-plus" @click="openCreate" data-test="create-macro" />
    </div>

    <Message v-if="error" severity="error" class="mb-4">{{ error }}</Message>

    <DataTable :value="macros" :loading="loading" striped-rows data-test="macros-table">
      <Column field="name" :header="t('macros.name')" sortable />
      <Column field="category" :header="t('macros.category')" sortable />
      <Column field="shortcut" :header="t('macros.shortcut')" />
      <Column :header="t('macros.visibility')">
        <template #body="{ data }">
          <Tag :value="data.visibility" :severity="visibilitySeverity[data.visibility] as any" />
        </template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" severity="secondary" size="small" @click="openEdit(data)" />
            <Button icon="pi pi-trash" severity="danger" size="small" @click="archive(data.id)" />
          </div>
        </template>
      </Column>
      <template #empty>{{ t('macros.noMacros') }}</template>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" :header="editing ? t('macros.edit') : t('macros.create')" modal class="w-full max-w-lg">
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm mb-1">{{ t('macros.name') }}</label>
          <InputText v-model="form.name" class="w-full" data-test="macro-name" />
        </div>
        <div>
          <label class="block text-sm mb-1">{{ t('macros.content') }}</label>
          <Textarea v-model="form.content" class="w-full" rows="5" data-test="macro-content" />
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm mb-1">{{ t('macros.category') }}</label>
            <InputText v-model="form.category" class="w-full" />
          </div>
          <div>
            <label class="block text-sm mb-1">{{ t('macros.shortcut') }}</label>
            <InputText v-model="form.shortcut" class="w-full" />
          </div>
        </div>
        <div>
          <label class="block text-sm mb-1">{{ t('macros.visibility') }}</label>
          <Select v-model="form.visibility" :options="visibilityOptions" option-label="label" option-value="value" class="w-full" />
        </div>
        <Button :label="t('common.save')" @click="save" data-test="save-macro" />
      </div>
    </Dialog>
  </div>
</template>
