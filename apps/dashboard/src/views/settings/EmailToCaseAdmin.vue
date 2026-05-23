<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Dropdown from 'primevue/dropdown';
import InputSwitch from 'primevue/inputswitch';
import Tag from 'primevue/tag';
import { emailToCaseApi, type EmailToCaseConfig, type CreateEmailToCaseConfigDto } from '@/api/email-to-case';

const { t } = useI18n();
const configs = ref<EmailToCaseConfig[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const form = ref<CreateEmailToCaseConfigDto>({
  supportEmail: '',
  isActive: true,
  defaultPriority: 'MEDIUM',
  autoReply: false,
});

const priorities = [
  { label: t('tickets.priority.LOW'), value: 'LOW' },
  { label: t('tickets.priority.MEDIUM'), value: 'MEDIUM' },
  { label: t('tickets.priority.HIGH'), value: 'HIGH' },
  { label: t('tickets.priority.URGENT'), value: 'URGENT' },
];

async function load() {
  loading.value = true;
  try {
    configs.value = await emailToCaseApi.list();
  } finally {
    loading.value = false;
  }
}

async function save() {
  await emailToCaseApi.create(form.value);
  dialogVisible.value = false;
  form.value = { supportEmail: '', isActive: true, defaultPriority: 'MEDIUM', autoReply: false };
  await load();
}

async function toggleActive(cfg: EmailToCaseConfig) {
  await emailToCaseApi.update(cfg.id, { isActive: !cfg.isActive });
  await load();
}

async function remove(cfg: EmailToCaseConfig) {
  await emailToCaseApi.delete(cfg.id);
  await load();
}

onMounted(load);
</script>

<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">{{ t('emailToCase.title') }}</h1>
      <Button :label="t('emailToCase.addConfig')" icon="pi pi-plus" @click="dialogVisible = true" />
    </div>

    <p class="text-slate-500 mb-6">{{ t('emailToCase.description') }}</p>

    <DataTable :value="configs" :loading="loading" data-test="email-to-case-table">
      <Column field="supportEmail" :header="t('emailToCase.supportEmail')" />
      <Column field="defaultPriority" :header="t('emailToCase.defaultPriority')">
        <template #body="{ data }">
          <Tag :value="data.defaultPriority" :severity="data.defaultPriority === 'URGENT' ? 'danger' : data.defaultPriority === 'HIGH' ? 'warning' : 'info'" />
        </template>
      </Column>
      <Column field="isActive" :header="t('emailToCase.status')">
        <template #body="{ data }">
          <Tag :value="data.isActive ? t('emailToCase.active') : t('emailToCase.inactive')" :severity="data.isActive ? 'success' : 'secondary'" />
        </template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <Button
            :icon="data.isActive ? 'pi pi-pause' : 'pi pi-play'"
            text
            size="small"
            @click="toggleActive(data)"
          />
          <Button icon="pi pi-trash" text severity="danger" size="small" @click="remove(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="dialogVisible" :header="t('emailToCase.addConfig')" modal class="w-[500px]">
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('emailToCase.supportEmail') }}</label>
          <InputText v-model="form.supportEmail" class="w-full" placeholder="support@yourcompany.com" />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('emailToCase.defaultPriority') }}</label>
          <Dropdown v-model="form.defaultPriority" :options="priorities" option-label="label" option-value="value" class="w-full" />
        </div>
        <div class="flex items-center gap-2">
          <InputSwitch v-model="form.isActive" />
          <label>{{ t('emailToCase.active') }}</label>
        </div>
        <div class="flex items-center gap-2">
          <InputSwitch v-model="form.autoReply" />
          <label>{{ t('emailToCase.autoReply') }}</label>
        </div>
      </div>
      <template #footer>
        <Button :label="t('common.cancel')" text @click="dialogVisible = false" />
        <Button :label="t('common.save')" icon="pi pi-check" @click="save" :disabled="!form.supportEmail" />
      </template>
    </Dialog>
  </div>
</template>
