<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import { kbApi, type KBCategory } from '@/api/kb';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Message from 'primevue/message';

const props = defineProps<{ id?: string }>();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const articleId = computed(() => props.id ?? (route.params.id as string));
const isNew = computed(() => !articleId.value);
const categories = ref<KBCategory[]>([]);
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const saved = ref(false);

const form = ref({
  title: '',
  slug: '',
  content: '',
  categoryId: '',
  status: 'DRAFT' as 'DRAFT' | 'PUBLISHED',
});

const statusOptions = [
  { label: t('kb.draft'), value: 'DRAFT' },
  { label: t('kb.published'), value: 'PUBLISHED' },
];

onMounted(async () => {
  categories.value = await kbApi.listCategories();
  if (!isNew.value) {
    loading.value = true;
    try {
      const article = await kbApi.getArticle(articleId.value);
      form.value = {
        title: article.title,
        slug: article.slug,
        content: article.content,
        categoryId: article.categoryId ?? '',
        status: article.status === 'ARCHIVED' ? 'DRAFT' : article.status,
      };
    } catch (e: any) {
      error.value = e?.response?.data?.message ?? e?.message;
    } finally {
      loading.value = false;
    }
  }
});

function generateSlug() {
  form.value.slug = form.value.title
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function save() {
  saving.value = true;
  error.value = null;
  try {
    const data: any = { ...form.value };
    if (!data.categoryId) delete data.categoryId;

    if (isNew.value) {
      const created = await kbApi.createArticle(data);
      router.replace({ name: 'kb-editor', params: { id: created.id } });
    } else {
      await kbApi.updateArticle(articleId.value, data);
    }
    saved.value = true;
    setTimeout(() => (saved.value = false), 2500);
  } catch (e: any) {
    error.value = e?.response?.data?.message ?? e?.message;
  } finally {
    saving.value = false;
  }
}

async function archive() {
  await kbApi.archiveArticle(articleId.value);
  router.push({ name: 'kb' });
}

const categoryOptions = computed(() =>
  categories.value.map((c) => ({ label: c.name, value: c.id })),
);
</script>

<template>
  <div class="max-w-3xl">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">{{ isNew ? t('kb.createArticle') : t('kb.editArticle') }}</h1>
      <Button :label="t('common.back')" icon="pi pi-arrow-left" severity="secondary" @click="router.push({ name: 'kb' })" />
    </div>

    <Message v-if="error" severity="error" class="mb-4">{{ error }}</Message>
    <Message v-if="saved" severity="success" class="mb-4">{{ t('common.saved') }}</Message>

    <div v-if="loading" class="text-slate-500">{{ t('common.loading') }}</div>
    <div v-else class="flex flex-col gap-4 bg-white rounded p-6 border">
      <div>
        <label class="block text-sm mb-1">{{ t('kb.articleTitle') }}</label>
        <InputText v-model="form.title" class="w-full" @blur="isNew && generateSlug()" data-test="article-title" />
      </div>
      <div>
        <label class="block text-sm mb-1">{{ t('kb.slug') }}</label>
        <InputText v-model="form.slug" class="w-full" data-test="article-slug" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm mb-1">{{ t('kb.category') }}</label>
          <Select v-model="form.categoryId" :options="categoryOptions" option-label="label" option-value="value" :placeholder="t('kb.selectCategory')" class="w-full" show-clear />
        </div>
        <div>
          <label class="block text-sm mb-1">{{ t('kb.status') }}</label>
          <Select v-model="form.status" :options="statusOptions" option-label="label" option-value="value" class="w-full" />
        </div>
      </div>
      <div>
        <label class="block text-sm mb-1">{{ t('kb.content') }}</label>
        <Textarea v-model="form.content" class="w-full" rows="15" data-test="article-content" />
      </div>
      <div class="flex gap-2">
        <Button :label="t('common.save')" :loading="saving" @click="save" data-test="save-article" />
        <Button v-if="!isNew" :label="t('common.delete')" severity="danger" @click="archive" />
      </div>
    </div>
  </div>
</template>
