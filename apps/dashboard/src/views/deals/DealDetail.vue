<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import AttachmentList from '@/components/AttachmentList.vue';
import { dealsApi, type Deal } from '@/api/deals';
import { activitiesApi, type Activity } from '@/api/activities';

const props = defineProps<{ id: string }>();
const { t } = useI18n();
const router = useRouter();

const deal = ref<Deal | null>(null);
const activities = ref<Activity[]>([]);
const loading = ref(true);

const statusSeverity = computed(() => {
  if (!deal.value) return 'info';
  if (deal.value.status === 'WON') return 'success';
  if (deal.value.status === 'LOST') return 'danger';
  return 'info';
});

async function load() {
  loading.value = true;
  try {
    deal.value = await dealsApi.get(props.id);
    const res = await activitiesApi.list({ parentEntity: 'Deal', parentId: props.id });
    activities.value = res.items;
  } finally {
    loading.value = false;
  }
}

function goBack() {
  router.push({ name: 'deals-kanban' });
}

onMounted(load);
</script>

<template>
  <div data-test="deal-detail-page">
    <div v-if="loading" class="text-slate-500">{{ t('common.loading') }}</div>
    <template v-else-if="deal">
      <div class="flex items-center gap-4 mb-6" data-test="deal-header">
        <Button icon="pi pi-arrow-left" severity="secondary" text rounded @click="goBack" />
        <div class="flex-1">
          <h1 class="text-2xl font-bold" data-test="deal-name">{{ deal.name }}</h1>
          <div class="flex gap-3 items-center mt-1">
            <Tag :value="deal.status" :severity="statusSeverity" />
            <span class="text-sm text-slate-500">{{ deal.pipeline?.name }} / {{ deal.stage?.name }}</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <div class="text-2xl font-bold text-blue-700" data-test="deal-amount">
            {{ new Intl.NumberFormat('en', { style: 'currency', currency: deal.currency || 'EGP', minimumFractionDigits: 0 }).format(Number(deal.amount)) }}
          </div>
          <Button
            :label="t('quotes.createFromDeal')"
            icon="pi pi-file"
            severity="secondary"
            size="small"
            data-test="create-quote-btn"
            @click="router.push({ name: 'quote-builder', query: { dealId: deal.id } })"
          />
        </div>
      </div>

      <TabView>
        <TabPanel :header="t('people.overview')" value="overview">
          <div class="grid grid-cols-2 gap-4" data-test="overview-tab">
            <div>
              <span class="text-sm text-slate-500">{{ t('deals.status') }}</span>
              <p>{{ deal.status }}</p>
            </div>
            <div>
              <span class="text-sm text-slate-500">{{ t('deals.expectedClose') }}</span>
              <p>{{ deal.expectedCloseDate ? new Date(deal.expectedCloseDate).toLocaleDateString() : '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-slate-500">{{ t('deals.probability') }}</span>
              <p>{{ deal.probability ?? '—' }}%</p>
            </div>
            <div v-if="deal.wonReason">
              <span class="text-sm text-slate-500">{{ t('deals.wonReason') }}</span>
              <p>{{ deal.wonReason }}</p>
            </div>
            <div v-if="deal.lostReason">
              <span class="text-sm text-slate-500">{{ t('deals.lostReason') }}</span>
              <p>{{ deal.lostReason }}</p>
            </div>
          </div>
        </TabPanel>
        <TabPanel :header="t('people.activities')" value="activities">
          <div v-if="activities.length === 0" class="text-slate-500" data-test="no-activities">
            {{ t('people.noActivities') }}
          </div>
          <div v-else class="flex flex-col gap-3" data-test="activities-list">
            <div
              v-for="a in activities"
              :key="a.id"
              class="border rounded-lg p-3"
            >
              <div class="flex items-center gap-2 mb-1">
                <Tag :value="a.type" severity="secondary" class="text-xs" />
                <span class="font-medium">{{ a.subject }}</span>
              </div>
              <p v-if="a.body" class="text-sm text-slate-600">{{ a.body }}</p>
              <div class="text-xs text-slate-400 mt-1">{{ new Date(a.createdAt).toLocaleString() }}</div>
            </div>
          </div>
        </TabPanel>
        <TabPanel :header="t('people.files')" value="files">
          <AttachmentList entity-type="DEAL" :entity-id="id" />
        </TabPanel>
      </TabView>
    </template>
  </div>
</template>
