<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { campaignsApi, type Campaign } from '@/api/campaigns';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';

const router = useRouter();
const { t } = useI18n();

const campaigns = ref<Campaign[]>([]);
const loading = ref(false);
const showCreate = ref(false);
const creating = ref(false);
const form = ref({ name: '', subject: '' });

const statusSeverity: Record<string, string> = {
  DRAFT: 'warn',
  SCHEDULED: 'info',
  SENDING: 'info',
  SENT: 'success',
  PAUSED: 'warn',
  ARCHIVED: 'secondary',
};

async function load() {
  loading.value = true;
  try {
    const res = await campaignsApi.list();
    campaigns.value = res.items;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  creating.value = true;
  try {
    const c = await campaignsApi.create(form.value);
    showCreate.value = false;
    form.value = { name: '', subject: '' };
    router.push({ name: 'campaign-detail', params: { id: c.id } });
  } finally {
    creating.value = false;
  }
}

function openDetail(campaign: Campaign) {
  router.push({ name: 'campaign-detail', params: { id: campaign.id } });
}

onMounted(load);
</script>

<template>
  <div data-test="campaigns-list-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('campaigns.title') }}</h1>
      <Button
        :label="t('campaigns.addCampaign')"
        icon="pi pi-plus"
        data-test="add-campaign-btn"
        @click="showCreate = true"
      />
    </div>

    <DataTable
      :value="campaigns"
      :loading="loading"
      data-test="campaigns-table"
      @row-click="(e: { data: Campaign }) => openDetail(e.data)"
    >
      <Column field="name" :header="t('campaigns.name')" sortable />
      <Column field="subject" :header="t('campaigns.subject')" sortable />
      <Column field="status" :header="t('campaigns.status')">
        <template #body="{ data }">
          <Tag :value="data.status" :severity="statusSeverity[data.status] ?? 'info'" />
        </template>
      </Column>
      <Column field="totalRecipients" :header="t('campaigns.recipients')" />
      <Column field="createdAt" :header="t('campaigns.created')" sortable />
    </DataTable>

    <Dialog
      v-model:visible="showCreate"
      :header="t('campaigns.addCampaign')"
      modal
      data-test="create-campaign-dialog"
    >
      <div class="flex flex-col gap-3 min-w-[24rem]">
        <InputText
          v-model="form.name"
          :placeholder="t('campaigns.name')"
          data-test="campaign-name-input"
        />
        <InputText
          v-model="form.subject"
          :placeholder="t('campaigns.subject')"
          data-test="campaign-subject-input"
        />
        <Button
          :label="t('common.save')"
          :loading="creating"
          data-test="save-campaign-btn"
          @click="handleCreate"
        />
      </div>
    </Dialog>
  </div>
</template>
