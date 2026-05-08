<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { sequencesApi, type Sequence } from '@/api/sequences';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';

const router = useRouter();
const { t } = useI18n();

const sequences = ref<Sequence[]>([]);
const loading = ref(false);
const showCreate = ref(false);
const creating = ref(false);
const form = ref({ name: '' });

async function load() {
  loading.value = true;
  try {
    const res = await sequencesApi.list();
    sequences.value = res.items;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  creating.value = true;
  try {
    const s = await sequencesApi.create(form.value);
    showCreate.value = false;
    form.value = { name: '' };
    router.push({ name: 'sequence-detail', params: { id: s.id } });
  } finally {
    creating.value = false;
  }
}

function openDetail(seq: Sequence) {
  router.push({ name: 'sequence-detail', params: { id: seq.id } });
}

onMounted(load);
</script>

<template>
  <div data-test="sequences-list-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('sequences.title') }}</h1>
      <Button
        :label="t('sequences.addSequence')"
        icon="pi pi-plus"
        data-test="add-sequence-btn"
        @click="showCreate = true"
      />
    </div>

    <DataTable
      :value="sequences"
      :loading="loading"
      data-test="sequences-table"
      @row-click="(e: { data: Sequence }) => openDetail(e.data)"
    >
      <Column field="name" :header="t('sequences.name')" sortable />
      <Column field="enabled" :header="t('sequences.status')">
        <template #body="{ data }">
          <Tag
            :value="data.enabled ? t('sequences.enabled') : t('sequences.disabled')"
            :severity="data.enabled ? 'success' : 'warn'"
          />
        </template>
      </Column>
      <Column field="_count.enrollments" :header="t('sequences.enrollments')" />
      <Column field="createdAt" :header="t('sequences.created')" sortable />
    </DataTable>

    <Dialog
      v-model:visible="showCreate"
      :header="t('sequences.addSequence')"
      modal
      data-test="create-sequence-dialog"
    >
      <div class="flex flex-col gap-3 min-w-[24rem]">
        <InputText
          v-model="form.name"
          :placeholder="t('sequences.name')"
          data-test="sequence-name-input"
        />
        <Button
          :label="t('common.save')"
          :loading="creating"
          data-test="save-sequence-btn"
          @click="handleCreate"
        />
      </div>
    </Dialog>
  </div>
</template>
