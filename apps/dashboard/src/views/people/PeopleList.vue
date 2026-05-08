<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import FilterBar, { type FilterOption } from '@/components/lists/FilterBar.vue';
import ListView, { type ColumnDef } from '@/components/lists/ListView.vue';
import DynamicForm from '@/components/DynamicForm/DynamicForm.vue';
import ImportDialog from '@/components/ImportDialog.vue';
import { usePeople } from '@/composables/usePeople';
import { useMetadata } from '@/composables/useMetadata';
import { peopleApi, type Person } from '@/api/people';
import { tagsApi } from '@/api/tags';
import { importExportApi } from '@/api/import-export';
import ScoreBadge from '@/components/ScoreBadge.vue';

const props = defineProps<{
  isCompany?: boolean;
}>();

const { t, locale } = useI18n();
const router = useRouter();

const {
  items,
  loading,
  filters,
  selected,
  hasMore,
  fetch,
  loadMore,
  archiveSelected,
} = usePeople({ isCompany: props.isCompany });

const { data: meta } = useMetadata(props.isCompany ? 'Company' : 'Person');

const showCreateDialog = ref(false);
const creating = ref(false);
const showTagDialog = ref(false);
const tagName = ref('');
const tagging = ref(false);
const showImportDialog = ref(false);

function exportCsv() {
  importExportApi.exportPeople({
    format: 'csv',
    search: filters.search,
    lifecycleStage: filters.lifecycleStage,
    isCompany: props.isCompany != null ? String(props.isCompany) : undefined,
  });
}

function exportExcel() {
  importExportApi.exportPeople({
    format: 'excel',
    search: filters.search,
    lifecycleStage: filters.lifecycleStage,
    isCompany: props.isCompany != null ? String(props.isCompany) : undefined,
  });
}

const columns = computed<ColumnDef[]>(() => {
  const base: ColumnDef[] = [
    { field: 'fullName', header: t('people.fullName'), sortable: true },
    { field: 'email', header: t('people.email'), sortable: true },
    { field: 'phone', header: t('people.phone') },
    { field: 'lifecycleStage', header: t('people.stage'), type: 'tag', sortable: true },
    { field: 'score', header: t('scoring.score'), sortable: true },
    { field: 'createdAt', header: t('people.createdAt'), type: 'date', sortable: true },
  ];
  if (props.isCompany) {
    base.splice(0, 1, { field: 'companyName', header: t('people.companyName'), sortable: true });
    base.splice(2, 0, { field: 'industry', header: t('people.industry') });
  }
  return base;
});

const filterOptions = computed<FilterOption[]>(() => {
  const stages = ['LEAD', 'MQL', 'SQL', 'OPP', 'CUSTOMER', 'EVANGELIST'];
  return [
    {
      key: 'lifecycleStage',
      label: t('people.stage'),
      type: 'select' as const,
      options: stages.map((s) => ({ label: s, value: s })),
    },
  ];
});

const filterValues = computed({
  get: () => ({
    lifecycleStage: filters.lifecycleStage,
  } as Record<string, unknown>),
  set: (v: Record<string, unknown>) => {
    filters.lifecycleStage = v.lifecycleStage as string | undefined;
  },
});

function onSearch(q: string) {
  filters.search = q || undefined;
}

function onRowClick(row: unknown) {
  const person = row as Person;
  const route = props.isCompany ? 'company-detail' : 'person-detail';
  router.push({ name: route, params: { id: person.id } });
}

async function handleCreate(data: Record<string, unknown>) {
  creating.value = true;
  try {
    const payload: Partial<Person> = {
      ...data,
      isCompany: props.isCompany ?? false,
    } as Partial<Person>;
    await peopleApi.create(payload);
    showCreateDialog.value = false;
    await fetch();
  } finally {
    creating.value = false;
  }
}

async function handleBulkTag() {
  if (!tagName.value.trim() || !selected.value.length) return;
  tagging.value = true;
  try {
    const tag = await tagsApi.create({ name: tagName.value.trim() });
    await tagsApi.assign(tag.id, {
      entityType: 'Person',
      entityIds: selected.value.map((p) => p.id),
    });
    tagName.value = '';
    showTagDialog.value = false;
    selected.value = [];
  } finally {
    tagging.value = false;
  }
}

function handleSort(field: string) {
  const current = filters.search; // preserve search
  void field; // sorting handled by DataTable internal + re-fetch
}

onMounted(() => fetch());
</script>

<template>
  <div data-test="people-list-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">
        {{ isCompany ? t('people.companies') : t('people.people') }}
      </h1>
      <div class="flex gap-2">
        <Button
          v-if="selected.length > 0"
          :label="t('people.bulkTag')"
          icon="pi pi-tag"
          severity="secondary"
          data-test="bulk-tag-btn"
          @click="showTagDialog = true"
        />
        <Button
          v-if="selected.length > 0"
          :label="t('people.bulkDelete')"
          icon="pi pi-trash"
          severity="danger"
          data-test="bulk-delete-btn"
          @click="archiveSelected()"
        />
        <Button
          :label="t('importExport.import')"
          icon="pi pi-upload"
          severity="secondary"
          data-test="import-btn"
          @click="showImportDialog = true"
        />
        <Button
          :label="t('importExport.exportCsv')"
          icon="pi pi-file"
          severity="secondary"
          data-test="export-csv-btn"
          @click="exportCsv"
        />
        <Button
          :label="t('importExport.exportExcel')"
          icon="pi pi-file-excel"
          severity="secondary"
          data-test="export-excel-btn"
          @click="exportExcel"
        />
        <Button
          :label="isCompany ? t('people.addCompany') : t('people.addPerson')"
          icon="pi pi-plus"
          data-test="add-btn"
          @click="showCreateDialog = true"
        />
      </div>
    </div>

    <FilterBar
      :filters="filterOptions"
      :model-value="filterValues"
      @update:model-value="filterValues = $event"
      @search="onSearch"
    />

    <ListView
      :items="items"
      :columns="columns"
      :loading="loading"
      :has-more="hasMore"
      :selected="selected"
      selectable
      row-click
      @update:selected="selected = $event as Person[]"
      @load-more="loadMore()"
      @row-click="onRowClick"
    />

    <Dialog
      v-model:visible="showCreateDialog"
      :header="isCompany ? t('people.addCompany') : t('people.addPerson')"
      modal
      class="w-full max-w-xl"
      data-test="create-dialog"
    >
      <DynamicForm
        :entity-type="isCompany ? 'Company' : 'Person'"
        :loading="creating"
        @submit="handleCreate"
        @cancel="showCreateDialog = false"
      />
    </Dialog>

    <Dialog
      v-model:visible="showTagDialog"
      :header="t('people.tagSelected')"
      modal
      class="w-full max-w-sm"
      data-test="tag-dialog"
    >
      <div class="flex flex-col gap-4">
        <label>
          {{ t('people.tagName') }}
          <input
            v-model="tagName"
            type="text"
            class="w-full border rounded p-2 mt-1"
            data-test="tag-name-input"
          />
        </label>
        <div class="flex gap-2 justify-end">
          <Button
            :label="t('common.cancel')"
            severity="secondary"
            @click="showTagDialog = false"
          />
          <Button
            :label="t('people.applyTag')"
            :loading="tagging"
            data-test="apply-tag-btn"
            @click="handleBulkTag"
          />
        </div>
      </div>
    </Dialog>

    <ImportDialog
      v-model:visible="showImportDialog"
      @imported="fetch()"
    />
  </div>
</template>
