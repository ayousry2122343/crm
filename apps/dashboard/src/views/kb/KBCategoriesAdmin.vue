<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { kbApi, type KBCategory, type CreateKBCategoryInput } from '@/api/kb';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';

const { t } = useI18n();
const categories = ref<KBCategory[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const dialogVisible = ref(false);
const editing = ref<KBCategory | null>(null);

const form = ref<CreateKBCategoryInput>({
  name: '',
  slug: '',
  description: '',
  order: 0,
});

onMounted(load);

async function load() {
  loading.value = true;
  try {
    categories.value = await kbApi.listCategories();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.value = { name: '', slug: '', description: '', order: 0 };
  dialogVisible.value = true;
}

function openEdit(c: KBCategory) {
  editing.value = c;
  form.value = {
    name: c.name,
    slug: c.slug,
    description: c.description ?? '',
    order: c.order,
  };
  dialogVisible.value = true;
}

function generateSlug() {
  form.value.slug = form.value.name
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function save() {
  try {
    if (editing.value) {
      await kbApi.updateCategory(editing.value.id, form.value);
    } else {
      await kbApi.createCategory(form.value);
    }
    dialogVisible.value = false;
    await load();
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message;
  }
}

async function archive(id: string) {
  await kbApi.archiveCategory(id);
  await load();
}
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">{{ t('kb.categories') }}</h1>
      <Button :label="t('kb.createCategory')" icon="pi pi-plus" @click="openCreate" data-test="create-category" />
    </div>

    <Message v-if="error" severity="error" class="mb-4">{{ error }}</Message>

    <DataTable :value="categories" :loading="loading" striped-rows data-test="kb-categories-table">
      <Column field="name" :header="t('kb.categoryName')" sortable />
      <Column field="slug" :header="t('kb.slug')" />
      <Column field="description" :header="t('kb.description')" />
      <Column :header="t('kb.articleCount')">
        <template #body="{ data }">{{ data._count?.articles ?? 0 }}</template>
      </Column>
      <Column field="order" :header="t('kb.order')" sortable />
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button icon="pi pi-pencil" severity="secondary" size="small" @click="openEdit(data)" />
            <Button icon="pi pi-trash" severity="danger" size="small" @click="archive(data.id)" />
          </div>
        </template>
      </Column>
      <template #empty>{{ t('kb.noCategories') }}</template>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" :header="editing ? t('kb.editCategory') : t('kb.createCategory')" modal class="w-full max-w-md">
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm mb-1">{{ t('kb.categoryName') }}</label>
          <InputText v-model="form.name" class="w-full" @blur="!editing && generateSlug()" data-test="category-name" />
        </div>
        <div>
          <label class="block text-sm mb-1">{{ t('kb.slug') }}</label>
          <InputText v-model="form.slug" class="w-full" />
        </div>
        <div>
          <label class="block text-sm mb-1">{{ t('kb.description') }}</label>
          <InputText v-model="form.description" class="w-full" />
        </div>
        <div>
          <label class="block text-sm mb-1">{{ t('kb.order') }}</label>
          <InputText v-model.number="form.order" type="number" class="w-full" />
        </div>
        <Button :label="t('common.save')" @click="save" data-test="save-category" />
      </div>
    </Dialog>
  </div>
</template>
