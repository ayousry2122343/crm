<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import InputNumber from 'primevue/inputnumber';
import Tag from 'primevue/tag';
import { bookingPagesApi, type BookingPage } from '@/api/scheduler';

const { t } = useI18n();

const pages = ref<BookingPage[]>([]);
const loading = ref(true);
const showCreate = ref(false);

const form = ref({
  slug: '',
  title: '',
  description: '',
  duration: 30,
  availability: {
    sun: [{ start: '09:00', end: '17:00' }],
    mon: [{ start: '09:00', end: '17:00' }],
    tue: [{ start: '09:00', end: '17:00' }],
    wed: [{ start: '09:00', end: '17:00' }],
    thu: [{ start: '09:00', end: '17:00' }],
  },
  timezone: 'Africa/Cairo',
  bufferBefore: 0,
  bufferAfter: 0,
  maxPerDay: undefined as number | undefined,
});

async function load() {
  loading.value = true;
  try {
    pages.value = await bookingPagesApi.list();
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  await bookingPagesApi.create(form.value as any);
  showCreate.value = false;
  load();
}

function copyLink(slug: string) {
  navigator.clipboard.writeText(`${window.location.origin}/book/${slug}`);
}

onMounted(load);
</script>

<template>
  <div data-test="booking-pages">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('scheduler.title') }}</h1>
      <Button :label="t('scheduler.createPage')" icon="pi pi-plus" @click="showCreate = true" />
    </div>

    <DataTable :value="pages" :loading="loading" striped-rows>
      <Column field="title" :header="t('agent.name')" />
      <Column field="slug" :header="t('scheduler.slug')" />
      <Column field="duration" :header="t('scheduler.duration')">
        <template #body="{ data }">{{ data.duration }} min</template>
      </Column>
      <Column field="timezone" :header="t('scheduler.timezone')" />
      <Column :header="t('channels.status')">
        <template #body="{ data }">
          <Tag :value="data.isActive ? 'Active' : 'Inactive'" :severity="data.isActive ? 'success' : 'secondary'" />
        </template>
      </Column>
      <Column header="">
        <template #body="{ data }">
          <Button icon="pi pi-copy" severity="secondary" text size="small" :title="t('scheduler.copyLink')" @click="copyLink(data.slug)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showCreate" :header="t('scheduler.createPage')" modal class="w-full max-w-2xl">
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block mb-1 font-medium">{{ t('agent.name') }}</label>
            <InputText v-model="form.title" class="w-full" />
          </div>
          <div>
            <label class="block mb-1 font-medium">{{ t('scheduler.slug') }}</label>
            <InputText v-model="form.slug" class="w-full" />
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium">{{ t('common.description') }}</label>
          <Textarea v-model="form.description" rows="3" class="w-full" />
        </div>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <label class="block mb-1 font-medium">{{ t('scheduler.duration') }}</label>
            <InputNumber v-model="form.duration" :min="5" :max="480" class="w-full" suffix=" min" />
          </div>
          <div>
            <label class="block mb-1 font-medium">{{ t('scheduler.buffer') }}</label>
            <InputNumber v-model="form.bufferBefore" :min="0" :max="60" class="w-full" suffix=" min" />
          </div>
          <div>
            <label class="block mb-1 font-medium">{{ t('scheduler.maxPerDay') }}</label>
            <InputNumber v-model="form.maxPerDay" :min="1" :max="50" class="w-full" />
          </div>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" severity="secondary" text @click="showCreate = false" />
        <Button :label="t('common.save')" @click="handleCreate" />
      </template>
    </Dialog>
  </div>
</template>
