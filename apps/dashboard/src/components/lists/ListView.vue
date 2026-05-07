<script setup lang="ts">
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { useI18n } from 'vue-i18n';

export type ColumnDef = {
  field: string;
  header: string;
  sortable?: boolean;
  type?: 'text' | 'date' | 'tag' | 'boolean';
};

defineProps<{
  items: unknown[];
  columns: ColumnDef[];
  loading?: boolean;
  hasMore?: boolean;
  selected?: unknown[];
  selectable?: boolean;
  rowClick?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:selected', v: unknown[]): void;
  (e: 'load-more'): void;
  (e: 'sort', field: string): void;
  (e: 'row-click', data: unknown): void;
}>();

const { t, d } = useI18n();

function formatCell(value: unknown, type?: string): string {
  if (value == null) return '';
  if (type === 'date' && typeof value === 'string') {
    return d(new Date(value), 'short');
  }
  if (type === 'boolean') {
    return value ? '✓' : '';
  }
  return String(value);
}
</script>

<template>
  <div data-test="list-view">
    <DataTable
      :value="items"
      :loading="loading"
      :selection="selected"
      :selection-mode="selectable ? 'multiple' : undefined"
      data-key="id"
      striped-rows
      scrollable
      scroll-height="calc(100vh - 300px)"
      class="text-sm"
      data-test="data-table"
      @update:selection="emit('update:selected', $event)"
      @row-click="emit('row-click', $event.data)"
      @sort="emit('sort', ($event as any).sortField)"
    >
      <Column
        v-if="selectable"
        selection-mode="multiple"
        header-style="width: 3rem"
      />
      <Column
        v-for="col in columns"
        :key="col.field"
        :field="col.field"
        :header="col.header"
        :sortable="col.sortable"
      >
        <template #body="{ data }">
          <Tag
            v-if="col.type === 'tag'"
            :value="String(data[col.field] ?? '')"
            severity="info"
          />
          <span v-else>{{ formatCell(data[col.field], col.type) }}</span>
        </template>
      </Column>
    </DataTable>
    <div v-if="hasMore" class="flex justify-center mt-4">
      <Button
        :label="t('common.loadMore')"
        severity="secondary"
        :loading="loading"
        data-test="load-more"
        @click="emit('load-more')"
      />
    </div>
  </div>
</template>
