<script setup lang="ts">
import { ref } from 'vue';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Button from 'primevue/button';
import { useI18n } from 'vue-i18n';

export type FilterOption = {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: Array<{ label: string; value: string }>;
};

const props = defineProps<{
  filters: FilterOption[];
  modelValue: Record<string, unknown>;
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: Record<string, unknown>): void;
  (e: 'search', q: string): void;
}>();

const { t } = useI18n();
const searchQuery = ref('');

function updateFilter(key: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [key]: value || undefined });
}

function onSearch() {
  emit('search', searchQuery.value);
}
</script>

<template>
  <div class="flex flex-wrap gap-3 items-center mb-4" data-test="filter-bar">
    <div class="flex gap-2 items-center">
      <InputText
        v-model="searchQuery"
        :placeholder="t('people.search')"
        data-test="search-input"
        class="w-64"
        @keyup.enter="onSearch"
      />
      <Button
        icon="pi pi-search"
        severity="secondary"
        data-test="search-btn"
        @click="onSearch"
      />
    </div>
    <template v-for="filter in filters" :key="filter.key">
      <Select
        v-if="filter.type === 'select'"
        :model-value="(modelValue[filter.key] as string) ?? null"
        :options="filter.options"
        option-label="label"
        option-value="value"
        :placeholder="filter.label"
        show-clear
        :data-test="`filter-${filter.key}`"
        class="w-48"
        @update:model-value="updateFilter(filter.key, $event)"
      />
      <InputText
        v-else
        :model-value="(modelValue[filter.key] as string) ?? ''"
        :placeholder="filter.label"
        :data-test="`filter-${filter.key}`"
        class="w-48"
        @update:model-value="updateFilter(filter.key, $event)"
      />
    </template>
  </div>
</template>
