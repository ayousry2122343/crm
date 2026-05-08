<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { blogsApi, type BlogWithHtml } from '@/api/blogs';

const props = defineProps<{ slug: string }>();
const { t } = useI18n();
const router = useRouter();

const blog = ref<BlogWithHtml | null>(null);
const loading = ref(true);

async function load() {
  loading.value = true;
  try {
    const found = await blogsApi.getBySlug(props.slug);
    const rendered = await blogsApi.render(found.id);
    blog.value = rendered;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div data-test="blog-view-page">
    <div v-if="loading" class="text-center py-12">{{ t('common.loading') }}</div>
    <template v-else-if="blog">
      <div class="flex items-center justify-between mb-6">
        <Button
          :label="t('blogs.backToList')"
          icon="pi pi-arrow-left"
          severity="secondary"
          @click="router.push({ name: 'blogs' })"
        />
      </div>
      <article class="max-w-3xl mx-auto">
        <header class="mb-8">
          <h1 class="text-3xl font-bold mb-2">{{ blog.title }}</h1>
          <div class="flex items-center gap-3 text-sm text-slate-500">
            <span>{{ blog.author?.fullName }}</span>
            <span v-if="blog.publishedAt">{{ new Date(blog.publishedAt).toLocaleDateString() }}</span>
            <Tag v-if="blog.category" :value="blog.category.name" />
          </div>
          <div v-if="blog.tags.length" class="flex gap-1 mt-2">
            <Tag v-for="tag in blog.tags" :key="tag" :value="tag" severity="info" />
          </div>
        </header>
        <div class="prose prose-lg max-w-none" v-html="blog.bodyHtml" />
      </article>
    </template>
  </div>
</template>
