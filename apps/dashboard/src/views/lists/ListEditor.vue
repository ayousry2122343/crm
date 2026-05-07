<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { listsApi, type CrmList, type ListFilter } from '@/api/lists';
import type { Person } from '@/api/people';

const props = defineProps<{ id: string }>();
const { t } = useI18n();
const router = useRouter();

const list = ref<CrmList | null>(null);
const members = ref<Person[]>([]);
const loading = ref(true);
const saving = ref(false);
const filters = ref<ListFilter[]>([]);

const operators = [
  { label: '=', value: 'eq' },
  { label: '!=', value: 'neq' },
  { label: 'contains', value: 'contains' },
  { label: '>', value: 'gt' },
  { label: '<', value: 'lt' },
];

async function load() {
  loading.value = true;
  try {
    list.value = await listsApi.get(props.id);
    filters.value = list.value.query?.filters ?? [];
    const res = await listsApi.members(props.id);
    members.value = res.items;
  } finally {
    loading.value = false;
  }
}

function addFilter() {
  filters.value.push({ field: '', op: 'eq', value: '' });
}

function removeFilter(idx: number) {
  filters.value.splice(idx, 1);
}

async function save() {
  if (!list.value) return;
  saving.value = true;
  try {
    await listsApi.update(props.id, {
      name: list.value.name,
      query: { filters: filters.value },
    });
    await load();
  } finally {
    saving.value = false;
  }
}

function goBack() {
  router.push({ name: 'lists' });
}

onMounted(load);
</script>

<template>
  <div data-test="list-editor-page">
    <div v-if="loading" class="text-slate-500">{{ t('common.loading') }}</div>
    <template v-else-if="list">
      <div class="flex items-center gap-4 mb-6">
        <Button icon="pi pi-arrow-left" severity="secondary" text rounded @click="goBack" />
        <InputText v-model="list.name" class="text-xl font-bold flex-1" data-test="list-name" />
        <Button :label="t('common.save')" :loading="saving" data-test="save-btn" @click="save" />
      </div>

      <!-- Query Builder -->
      <div class="mb-6 p-4 bg-slate-100 rounded-lg" data-test="query-builder">
        <h3 class="font-semibold mb-3">{{ t('lists.filters') }}</h3>
        <div
          v-for="(f, idx) in filters"
          :key="idx"
          class="flex gap-2 items-center mb-2"
          :data-test="`filter-row-${idx}`"
        >
          <InputText
            v-model="f.field"
            :placeholder="t('lists.field')"
            class="w-40"
          />
          <Select
            v-model="f.op"
            :options="operators"
            option-label="label"
            option-value="value"
            :placeholder="t('lists.operator')"
            class="w-32"
          />
          <InputText
            :model-value="String(f.value ?? '')"
            :placeholder="t('lists.value')"
            class="flex-1"
            @update:model-value="f.value = $event"
          />
          <Button
            icon="pi pi-times"
            severity="danger"
            text
            rounded
            @click="removeFilter(idx)"
          />
        </div>
        <Button
          :label="t('lists.addFilter')"
          icon="pi pi-plus"
          severity="secondary"
          size="small"
          data-test="add-filter-btn"
          @click="addFilter"
        />
      </div>

      <!-- Members Table -->
      <DataTable
        :value="members"
        striped-rows
        data-test="members-table"
      >
        <Column field="fullName" :header="t('people.fullName')" />
        <Column field="email" :header="t('people.email')" />
        <Column field="lifecycleStage" :header="t('people.stage')" />
        <template #empty>
          <p class="text-center text-slate-500 py-8">{{ t('common.noData') }}</p>
        </template>
      </DataTable>
    </template>
  </div>
</template>
