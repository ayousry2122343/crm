<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { kbApi, type KBArticle, type KBCategory } from '@/api/kb';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Message from 'primevue/message';

const { t } = useI18n();
const router = useRouter();
const articles = ref<KBArticle[]>([]);
const categories = ref<KBCategory[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const nextCursor = ref<string | null>(null);

const search = ref('');
const filterCategory = ref('');
const filterStatus = ref('');

const statusOptions = [
  { label: t('kb.allStatuses'), value: '' },
  { label: t('kb.draft'), value: 'DRAFT' },
  { label: t('kb.published'), value: 'PUBLISHED' },
];

const statusSeverity: Record<string, string> = {
  DRAFT: 'warn',
  PUBLISHED: 'success',
  ARCHIVED: 'secondary',
};

onMounted(async () => {
  categories.value = await kbApi.listCategories();
  await load();
});

watch([search, filterCategory, filterStatus], () => {
  articles.value = [];
  nextCursor.value = null;
  load();
});

async function load() {
  loading.value = true;
  try {
    const params: Record<string, any> = {};
    if (search.value) params.search = search.value;
    if (filterCategory.value) params.categoryId = filterCategory.value;
    if (filterStatus.value) params.status = filterStatus.value;
    if (nextCursor.value) params.cursor = nextCursor.value;

    const res = await kbApi.listArticles(params);
    articles.value = [...articles.value, ...res.items];
    nextCursor.value = res.nextCursor;
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message;
  } finally {
    loading.value = false;
  }
}

function goToEditor(id?: string) {
  if (id) {
    router.push({ name: 'kb-editor', params: { id } });
  } else {
    router.push({ name: 'kb-new' });
  }
}

const categoryOptions = ref<{ label: string; value: string }[]>([]);
watch(categories, (cats) => {
  categoryOptions.value = [
    { label: t('kb.allCategories'), value: '' },
    ...cats.map((c) => ({ label: c.name, value: c.id })),
  ];
}, { immediate: true });
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">{{ t('kb.title') }}</h1>
      <div class="flex gap-2">
        <Button :label="t('kb.manageCategories')" icon="pi pi-folder" severity="secondary" @click="router.push({ name: 'kb-categories' })" />
        <Button :label="t('kb.createArticle')" icon="pi pi-plus" @click="goToEditor()" data-test="create-article" />
      </div>
    </div>

    <Message v-if="error" severity="error" class="mb-4">{{ error }}</Message>

    <div class="flex gap-4 mb-4">
      <InputText v-model="search" :placeholder="t('kb.search')" class="w-64" data-test="kb-search" />
      <Select v-model="filterCategory" :options="categoryOptions" option-label="label" option-value="value" class="w-48" />
      <Select v-model="filterStatus" :options="statusOptions" option-label="label" option-value="value" class="w-40" />
    </div>

    <DataTable :value="articles" :loading="loading" striped-rows @row-click="(e: any) => goToEditor(e.data.id)" data-test="kb-table">
      <Column field="title" :header="t('kb.articleTitle')" sortable />
      <Column :header="t('kb.category')">
        <template #body="{ data }">{{ data.category?.name ?? '-' }}</template>
      </Column>
      <Column :header="t('kb.status')">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="statusSeverity[data.status] as any" />
        </template>
      </Column>
      <Column field="viewCount" :header="t('kb.views')" sortable />
      <Column :header="t('kb.helpfulness')">
        <template #body="{ data }">
          <span class="text-green-600">{{ data.helpfulCount }}</span> /
          <span class="text-red-500">{{ data.notHelpfulCount }}</span>
        </template>
      </Column>
      <Column :header="t('kb.createdAt')">
        <template #body="{ data }">{{ new Date(data.createdAt).toLocaleDateString() }}</template>
      </Column>
      <template #empty>{{ t('kb.noArticles') }}</template>
    </DataTable>

    <div v-if="nextCursor" class="mt-4 text-center">
      <Button :label="t('common.loadMore')" severity="secondary" @click="load" />
    </div>
  </div>
</template>
