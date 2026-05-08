<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Chips from 'primevue/chips';
import AttachmentList from '@/components/AttachmentList.vue';
import CommentSection from '@/components/CommentSection.vue';
import { blogsApi, type Blog, type BlogCategory } from '@/api/blogs';
import { useAppToast } from '@/composables/useAppToast';

const props = defineProps<{ id: string }>();
const { t } = useI18n();
const router = useRouter();
const toast = useAppToast();

const saving = ref(false);
const loading = ref(false);
const categories = ref<BlogCategory[]>([]);
const isNew = computed(() => props.id === 'new');

const form = ref({
  title: '',
  slug: '',
  body: '',
  tags: [] as string[],
  metaDescription: '',
  categoryId: null as string | null,
  status: 'DRAFT' as Blog['status'],
});

async function loadBlog() {
  if (isNew.value) return;
  loading.value = true;
  try {
    const blog = await blogsApi.get(props.id);
    form.value = {
      title: blog.title,
      slug: blog.slug,
      body: blog.body,
      tags: blog.tags ?? [],
      metaDescription: blog.metaDescription ?? '',
      categoryId: blog.categoryId ?? null,
      status: blog.status,
    };
  } finally {
    loading.value = false;
  }
}

async function loadCategories() {
  categories.value = await blogsApi.listCategories();
}

async function handleSave() {
  if (!form.value.title.trim()) return;
  saving.value = true;
  try {
    const data = {
      title: form.value.title.trim(),
      slug: form.value.slug.trim() || slugify(form.value.title),
      body: form.value.body,
      tags: form.value.tags,
      metaDescription: form.value.metaDescription || undefined,
      categoryId: form.value.categoryId || undefined,
    };

    if (isNew.value) {
      const created = await blogsApi.create(data);
      toast.success('common.created');
      router.replace({ name: 'blog-editor', params: { id: created.id } });
    } else {
      await blogsApi.update(props.id, data);
      toast.success('common.saved');
    }
  } finally {
    saving.value = false;
  }
}

async function handlePublish() {
  if (form.value.status === 'DRAFT') {
    await blogsApi.publish(props.id);
    form.value.status = 'PUBLISHED';
  } else {
    await blogsApi.unpublish(props.id);
    form.value.status = 'DRAFT';
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

onMounted(() => {
  loadBlog();
  loadCategories();
});
</script>

<template>
  <div data-test="blog-editor-page">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">
        {{ isNew ? t('blogs.addBlog') : t('blogs.editBlog') }}
      </h1>
      <div class="flex gap-2">
        <Button
          :label="t('blogs.backToList')"
          icon="pi pi-arrow-left"
          severity="secondary"
          @click="router.push({ name: 'blogs' })"
        />
        <Tag
          v-if="!isNew"
          :value="form.status === 'PUBLISHED' ? t('blogs.published') : t('blogs.draft')"
          :severity="form.status === 'PUBLISHED' ? 'success' : 'warn'"
        />
      </div>
    </div>

    <div class="grid grid-cols-3 gap-6">
      <div class="col-span-2 flex flex-col gap-4">
        <div>
          <label class="text-sm text-slate-500">{{ t('blogs.title') }}</label>
          <InputText v-model="form.title" class="w-full" data-test="blog-title-input" />
        </div>
        <div>
          <label class="text-sm text-slate-500">{{ t('blogs.slug') }}</label>
          <InputText v-model="form.slug" class="w-full" data-test="blog-slug-input" />
        </div>
        <div>
          <label class="text-sm text-slate-500">{{ t('blogs.body') }}</label>
          <Textarea
            v-model="form.body"
            rows="16"
            class="w-full font-mono"
            data-test="blog-body-input"
          />
        </div>
      </div>

      <div class="flex flex-col gap-4">
        <div>
          <label class="text-sm text-slate-500">{{ t('blogs.tags') }}</label>
          <Chips v-model="form.tags" class="w-full" data-test="tags-input" />
        </div>
        <div>
          <label class="text-sm text-slate-500">{{ t('blogs.category') }}</label>
          <Select
            v-model="form.categoryId"
            :options="categories"
            option-label="name"
            option-value="id"
            :placeholder="t('blogs.selectCategory')"
            show-clear
            class="w-full"
          />
        </div>
        <div>
          <label class="text-sm text-slate-500">{{ t('blogs.metaDescription') }}</label>
          <Textarea
            v-model="form.metaDescription"
            rows="3"
            class="w-full"
            data-test="blog-meta-input"
          />
        </div>

        <div class="flex flex-col gap-2 mt-4">
          <Button
            :label="t('common.save')"
            :loading="saving"
            data-test="save-blog-btn"
            @click="handleSave"
          />
          <Button
            v-if="!isNew"
            :label="form.status === 'DRAFT' ? t('blogs.publish') : t('blogs.unpublish')"
            :severity="form.status === 'DRAFT' ? 'success' : 'warn'"
            data-test="publish-blog-btn"
            @click="handlePublish"
          />
        </div>

        <AttachmentList
          v-if="!isNew"
          entity-type="BLOG"
          :entity-id="id"
          class="mt-4"
        />

        <CommentSection
          v-if="!isNew"
          entity-type="BLOG"
          :entity-id="id"
          class="mt-4"
          data-test="comments-section"
        />
      </div>
    </div>
  </div>
</template>
