<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { macrosApi, type Macro } from '@/api/macros';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';

const emit = defineEmits<{ apply: [content: string] }>();
const { t } = useI18n();

const visible = ref(false);
const macros = ref<Macro[]>([]);
const loading = ref(false);
const search = ref('');

async function open() {
  visible.value = true;
  loading.value = true;
  try {
    macros.value = await macrosApi.list(search.value ? { search: search.value } : undefined);
  } catch {} finally {
    loading.value = false;
  }
}

async function onSearch() {
  loading.value = true;
  try {
    macros.value = await macrosApi.list({ search: search.value });
  } catch {} finally {
    loading.value = false;
  }
}

function apply(m: Macro) {
  emit('apply', m.content);
  visible.value = false;
}

defineExpose({ open });
</script>

<template>
  <Dialog v-model:visible="visible" :header="t('macros.selectMacro')" modal class="w-full max-w-xl">
    <InputText v-model="search" :placeholder="t('macros.search')" class="w-full mb-4" @input="onSearch" data-test="macro-search" />
    <DataTable :value="macros" :loading="loading" striped-rows @row-click="(e: any) => apply(e.data)" class="cursor-pointer">
      <Column field="name" :header="t('macros.name')" />
      <Column field="category" :header="t('macros.category')" />
      <Column :header="t('macros.preview')">
        <template #body="{ data }">
          <span class="text-sm text-slate-500 truncate block max-w-xs">{{ data.content.substring(0, 80) }}{{ data.content.length > 80 ? '...' : '' }}</span>
        </template>
      </Column>
      <template #empty>{{ t('macros.noMacros') }}</template>
    </DataTable>
  </Dialog>
</template>
