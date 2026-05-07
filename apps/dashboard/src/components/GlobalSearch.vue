<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { searchApi, type SearchResult } from '@/api/search';

const { t } = useI18n();
const router = useRouter();

const visible = ref(false);
const query = ref('');
const results = ref<SearchResult[]>([]);
const loading = ref(false);
const selectedIdx = ref(0);

let debounce: ReturnType<typeof setTimeout> | null = null;

watch(query, (q) => {
  if (debounce) clearTimeout(debounce);
  if (!q || q.length < 2) {
    results.value = [];
    return;
  }
  debounce = setTimeout(async () => {
    loading.value = true;
    try {
      const res = await searchApi.search(q, undefined, 10);
      results.value = res.items;
      selectedIdx.value = 0;
    } finally {
      loading.value = false;
    }
  }, 250);
});

function open() {
  visible.value = true;
  query.value = '';
  results.value = [];
  selectedIdx.value = 0;
}

function close() {
  visible.value = false;
}

function navigate(result: SearchResult) {
  close();
  if (result.entityType === 'Person') {
    router.push({ name: 'person-detail', params: { id: result.id } });
  } else if (result.entityType === 'Company') {
    router.push({ name: 'company-detail', params: { id: result.id } });
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectedIdx.value = Math.min(selectedIdx.value + 1, results.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectedIdx.value = Math.max(selectedIdx.value - 1, 0);
  } else if (e.key === 'Enter' && results.value.length > 0) {
    e.preventDefault();
    navigate(results.value[selectedIdx.value]);
  } else if (e.key === 'Escape') {
    close();
  }
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    open();
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleGlobalKeydown);
});

defineExpose({ open });
</script>

<template>
  <Dialog
    v-model:visible="visible"
    :header="t('search.title')"
    modal
    :closable="true"
    class="w-full max-w-lg"
    :pt="{ content: { class: 'p-0' } }"
    data-test="global-search-dialog"
  >
    <div class="p-4">
      <InputText
        v-model="query"
        :placeholder="t('search.placeholder')"
        class="w-full"
        autofocus
        data-test="search-query-input"
        @keydown="onKeydown"
      />
    </div>
    <div
      v-if="loading"
      class="px-4 pb-4 text-slate-500 text-sm"
      data-test="search-loading"
    >
      {{ t('common.loading') }}
    </div>
    <ul
      v-else-if="results.length > 0"
      class="list-none p-0 m-0"
      data-test="search-results"
    >
      <li
        v-for="(r, idx) in results"
        :key="r.id"
        class="px-4 py-3 cursor-pointer flex items-center gap-3 border-t"
        :class="{ 'bg-blue-50': idx === selectedIdx }"
        :data-test="`search-result-${idx}`"
        @click="navigate(r)"
        @mouseenter="selectedIdx = idx"
      >
        <i
          :class="r.entityType === 'Person' ? 'pi pi-user' : 'pi pi-building'"
          class="text-slate-400"
        />
        <div>
          <div class="font-medium">{{ r.title }}</div>
          <div v-if="r.subtitle" class="text-sm text-slate-500">{{ r.subtitle }}</div>
        </div>
        <span class="ms-auto text-xs text-slate-400">{{ r.entityType }}</span>
      </li>
    </ul>
    <div
      v-else-if="query.length >= 2 && !loading"
      class="px-4 pb-4 text-slate-500 text-sm"
      data-test="no-results"
    >
      {{ t('search.noResults') }}
    </div>
  </Dialog>
</template>
