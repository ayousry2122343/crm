<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { campaignsApi, type Campaign, type CampaignRecipient } from '@/api/campaigns';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';

const props = defineProps<{ id: string }>();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const campaign = ref<Campaign | null>(null);
const recipients = ref<CampaignRecipient[]>([]);
const loading = ref(false);

const campaignId = computed(() => props.id ?? (route.params.id as string));

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
    campaign.value = await campaignsApi.get(campaignId.value);
    const res = await campaignsApi.recipients(campaignId.value);
    recipients.value = res.items;
  } finally {
    loading.value = false;
  }
}

async function handleSend() {
  await campaignsApi.send(campaignId.value);
  await load();
}

async function handlePause() {
  await campaignsApi.pause(campaignId.value);
  await load();
}

async function handleArchive() {
  await campaignsApi.archive(campaignId.value);
  await load();
}

onMounted(load);
</script>

<template>
  <div data-test="campaign-detail-page">
    <div class="flex items-center gap-2 mb-4">
      <Button
        icon="pi pi-arrow-left"
        :label="t('common.back')"
        severity="secondary"
        size="small"
        text
        rounded
        @click="router.push({ name: 'campaigns' })"
      />
    </div>

    <template v-if="campaign">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h1 class="text-2xl font-bold" data-test="campaign-name">{{ campaign.name }}</h1>
          <p class="text-slate-500">{{ campaign.subject }}</p>
        </div>
        <div class="flex gap-2">
          <Tag :value="campaign.status" :severity="statusSeverity[campaign.status] ?? 'info'" />
          <Button
            v-if="campaign.status === 'DRAFT'"
            :label="t('campaigns.send')"
            icon="pi pi-send"
            data-test="send-campaign-btn"
            @click="handleSend"
          />
          <Button
            v-if="campaign.status === 'SENDING'"
            :label="t('campaigns.pause')"
            icon="pi pi-pause"
            severity="warn"
            data-test="pause-campaign-btn"
            @click="handlePause"
          />
          <Button
            v-if="campaign.status === 'SENT'"
            :label="t('campaigns.archive')"
            icon="pi pi-inbox"
            severity="secondary"
            data-test="archive-campaign-btn"
            @click="handleArchive"
          />
        </div>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-6" data-test="campaign-stats">
        <div class="bg-white rounded-lg p-4 shadow-sm">
          <div class="text-sm text-slate-500">{{ t('campaigns.delivered') }}</div>
          <div class="text-2xl font-bold">{{ campaign.delivered }}</div>
        </div>
        <div class="bg-white rounded-lg p-4 shadow-sm">
          <div class="text-sm text-slate-500">{{ t('campaigns.openRate') }}</div>
          <div class="text-2xl font-bold">{{ campaign.opened }}</div>
        </div>
        <div class="bg-white rounded-lg p-4 shadow-sm">
          <div class="text-sm text-slate-500">{{ t('campaigns.clickRate') }}</div>
          <div class="text-2xl font-bold">{{ campaign.clicked }}</div>
        </div>
        <div class="bg-white rounded-lg p-4 shadow-sm">
          <div class="text-sm text-slate-500">{{ t('campaigns.bounced') }}</div>
          <div class="text-2xl font-bold">{{ campaign.bounced }}</div>
        </div>
      </div>

      <h2 class="text-lg font-semibold mb-2">{{ t('campaigns.recipients') }}</h2>
      <DataTable :value="recipients" data-test="recipients-table">
        <Column field="email" :header="t('campaigns.email')" />
        <Column field="status" :header="t('campaigns.status')">
          <template #body="{ data }">
            <Tag :value="data.status" />
          </template>
        </Column>
        <Column field="sentAt" :header="t('campaigns.sentAt')" />
        <Column field="openedAt" :header="t('campaigns.openedAt')" />
      </DataTable>
    </template>
  </div>
</template>
