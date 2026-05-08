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
import { blogsApi, type Blog, type BlogCategory } from '@/api/blogs';
import { useAppToast } from '@/composables/useAppToast';

const { t } = useI18n();
const router = useRouter();
const toast = useAppToast();

const blogs = ref<Blog[]>([]);
const categories = ref<BlogCategory[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const saving = ref(false);
const showCategoryDialog = ref(false);
const newCategoryName = ref('');

const form = ref({
  title: '',
  slug: '',
  body: '',
});

function resetForm() {
  form.value = { title: '', slug: '', body: '' };
}

async function load() {
  loading.value = true;
  try {
    const [blogRes, catRes] = await Promise.all([
      blogsApi.list(),
      blogsApi.listCategories(),
    ]);
    blogs.value = blogRes.items;
    categories.value = catRes;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  if (!form.value.title.trim()) return;
  saving.value = true;
  try {
    const blog = await blogsApi.create({
      title: form.value.title.trim(),
      slug: form.value.slug.trim() || slugify(form.value.title),
      body: form.value.body,
    });
    showCreate.value = false;
    resetForm();
    router.push({ name: 'blog-editor', params: { id: blog.id } });
  } finally {
    saving.value = false;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

async function handleArchive(id: string) {
  await blogsApi.archive(id);
  toast.success('common.deleted');
  await load();
}

async function handleTogglePublish(blog: Blog) {
  if (blog.status === 'DRAFT') {
    await blogsApi.publish(blog.id);
    toast.success('common.published');
  } else {
    await blogsApi.unpublish(blog.id);
    toast.success('common.unpublished');
  }
  await load();
}

async function handleCreateCategory() {
  if (!newCategoryName.value.trim()) return;
  await blogsApi.createCategory({ name: newCategoryName.value.trim() });
  newCategoryName.value = '';
  showCategoryDialog.value = false;
  categories.value = await blogsApi.listCategories();
}

onMounted(load);
</script>

<template>
  <div data-test="blogs-list-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('blogs.title') }}</h1>
      <div class="flex gap-2">
        <Button
          :label="t('blogs.addCategory')"
          icon="pi pi-tag"
          severity="secondary"
          data-test="add-category-btn"
          @click="showCategoryDialog = true"
        />
        <Button
          :label="t('blogs.addBlog')"
          icon="pi pi-plus"
          data-test="add-blog-btn"
          @click="showCreate = true"
        />
      </div>
    </div>

    <DataTable
      :value="blogs"
      :loading="loading"
      striped-rows
      data-test="blogs-table"
    >
      <Column field="title" :header="t('blogs.title')" sortable />
      <Column field="slug" :header="t('blogs.slug')" sortable />
      <Column :header="t('blogs.status')">
        <template #body="{ data }">
          <Tag
            :value="data.status === 'PUBLISHED' ? t('blogs.published') : t('blogs.draft')"
            :severity="data.status === 'PUBLISHED' ? 'success' : 'warn'"
          />
        </template>
      </Column>
      <Column :header="t('blogs.category')">
        <template #body="{ data }">
          <Tag v-if="data.category" :value="data.category.name" />
          <span v-else class="text-slate-400">—</span>
        </template>
      </Column>
      <Column :header="t('blogs.author')">
        <template #body="{ data }">
          {{ data.author?.fullName ?? '—' }}
        </template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              size="small"
              text
              data-test="edit-blog-btn"
              @click="router.push({ name: 'blog-editor', params: { id: data.id } })"
            />
            <Button
              :icon="data.status === 'DRAFT' ? 'pi pi-check' : 'pi pi-times'"
              :severity="data.status === 'DRAFT' ? 'success' : 'warn'"
              size="small"
              text
              data-test="toggle-publish-btn"
              @click="handleTogglePublish(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              size="small"
              text
              data-test="delete-blog-btn"
              @click="handleArchive(data.id)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create Dialog -->
    <Dialog
      v-model:visible="showCreate"
      :header="t('blogs.addBlog')"
      modal
      class="w-full max-w-lg"
    >
      <div class="flex flex-col gap-4">
        <InputText v-model="form.title" :placeholder="t('blogs.title')" class="w-full" data-test="blog-title-input" />
        <InputText v-model="form.slug" :placeholder="t('blogs.slug')" class="w-full" data-test="blog-slug-input" />
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showCreate = false" />
          <Button :label="t('common.save')" :loading="saving" data-test="save-blog-btn" @click="handleCreate" />
        </div>
      </div>
    </Dialog>

    <!-- Category Dialog -->
    <Dialog
      v-model:visible="showCategoryDialog"
      :header="t('blogs.addCategory')"
      modal
      class="w-full max-w-sm"
    >
      <div class="flex flex-col gap-4">
        <InputText v-model="newCategoryName" :placeholder="t('blogs.categoryName')" class="w-full" data-test="category-name-input" />
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showCategoryDialog = false" />
          <Button :label="t('common.save')" data-test="save-category-btn" @click="handleCreateCategory" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
