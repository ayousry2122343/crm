<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import { ticketsApi, type Ticket } from '@/api/tickets';
import { useAppToast } from '@/composables/useAppToast';
import CommentSection from '@/components/CommentSection.vue';
import AttachmentList from '@/components/AttachmentList.vue';

const props = defineProps<{ id: string }>();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useAppToast();

const ticket = ref<Ticket | null>(null);
const loading = ref(true);

const statusSeverity: Record<string, string> = {
  NEW: 'info',
  OPEN: 'warn',
  PENDING: 'secondary',
  ON_HOLD: 'secondary',
  RESOLVED: 'success',
  CLOSED: 'contrast',
};

const prioritySeverity: Record<string, string> = {
  LOW: 'secondary',
  MEDIUM: 'info',
  HIGH: 'warn',
  URGENT: 'danger',
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'],
  OPEN: ['PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'],
  PENDING: ['OPEN', 'ON_HOLD', 'RESOLVED', 'CLOSED'],
  ON_HOLD: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['OPEN', 'CLOSED'],
  CLOSED: ['OPEN'],
};

const availableTransitions = computed(() => {
  if (!ticket.value) return [];
  return VALID_TRANSITIONS[ticket.value.status] ?? [];
});

function formatNumber(n: number): string {
  return 'TKT-' + n.toString().padStart(4, '0');
}

async function load() {
  loading.value = true;
  try {
    ticket.value = await ticketsApi.get(props.id);
  } finally {
    loading.value = false;
  }
}

async function changeStatus(status: string) {
  if (!ticket.value) return;
  try {
    ticket.value = await ticketsApi.changeStatus(ticket.value.id, status);
    toast.success(t('tickets.statusChanged'));
  } catch {
    toast.error(t('tickets.invalidTransition'));
  }
}

async function assignTo(assigneeId: string) {
  if (!ticket.value) return;
  try {
    ticket.value = await ticketsApi.assign(ticket.value.id, assigneeId);
    toast.success(t('tickets.assigned'));
  } catch {
    toast.error('Error');
  }
}

onMounted(load);
</script>

<template>
  <div v-if="ticket" data-test="ticket-detail-page">
    <div class="flex items-center gap-3 mb-6">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        size="small"
        @click="router.push({ name: 'tickets' })"
      />
      <span class="text-sm text-slate-500" data-test="ticket-number">
        {{ formatNumber(ticket.ticketNumber) }}
      </span>
      <h1 class="text-2xl font-bold flex-1" data-test="ticket-subject">
        {{ ticket.subject }}
      </h1>
      <Tag
        :value="ticket.status"
        :severity="statusSeverity[ticket.status] ?? 'info'"
        data-test="ticket-status"
      />
      <Tag
        :value="ticket.priority"
        :severity="prioritySeverity[ticket.priority] ?? 'info'"
        data-test="ticket-priority"
      />
    </div>

    <div class="flex gap-2 mb-6" data-test="status-actions">
      <Button
        v-for="s in availableTransitions"
        :key="s"
        :label="s"
        size="small"
        severity="secondary"
        :data-test="`status-btn-${s}`"
        @click="changeStatus(s)"
      />
    </div>

    <div class="flex gap-2 mb-6">
      <Button
        :label="t('tickets.assign')"
        icon="pi pi-user"
        size="small"
        severity="secondary"
        data-test="assign-btn"
      />
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm">
      <div>
        <div class="text-xs text-slate-500">{{ t('tickets.channel') }}</div>
        <div>{{ ticket.channel }}</div>
      </div>
      <div>
        <div class="text-xs text-slate-500">{{ t('tickets.contact') }}</div>
        <div data-test="ticket-contact">
          <router-link
            v-if="ticket.contact"
            :to="{ name: 'person-detail', params: { id: ticket.contactId } }"
            class="text-blue-600 hover:underline"
          >
            {{ ticket.contact.fullName }}
          </router-link>
          <span v-else>—</span>
        </div>
      </div>
      <div>
        <div class="text-xs text-slate-500">{{ t('tickets.company') }}</div>
        <div data-test="ticket-company">
          <router-link
            v-if="ticket.company"
            :to="{ name: 'company-detail', params: { id: ticket.companyId } }"
            class="text-blue-600 hover:underline"
          >
            {{ ticket.company.companyName ?? ticket.company.fullName }}
          </router-link>
          <span v-else>—</span>
        </div>
      </div>
      <div>
        <div class="text-xs text-slate-500">{{ t('tickets.assignee') }}</div>
        <div data-test="ticket-assignee">{{ ticket.assignee?.fullName ?? '—' }}</div>
      </div>
      <div>
        <div class="text-xs text-slate-500">{{ t('tickets.team') }}</div>
        <div>{{ ticket.team?.name ?? '—' }}</div>
      </div>
      <div>
        <div class="text-xs text-slate-500">{{ t('tickets.createdAt') }}</div>
        <div>{{ new Date(ticket.createdAt).toLocaleDateString() }}</div>
      </div>
      <div>
        <div class="text-xs text-slate-500">{{ t('tickets.resolvedAt') }}</div>
        <div>{{ ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleDateString() : '—' }}</div>
      </div>
      <div>
        <div class="text-xs text-slate-500">{{ t('tickets.closedAt') }}</div>
        <div>{{ ticket.closedAt ? new Date(ticket.closedAt).toLocaleDateString() : '—' }}</div>
      </div>
    </div>

    <TabView data-test="ticket-tabs">
      <TabPanel :header="t('tickets.overview')">
        <div class="p-4">
          <h3 class="font-medium mb-2">{{ t('tickets.description') }}</h3>
          <p class="text-slate-600 whitespace-pre-wrap">{{ ticket.description ?? '—' }}</p>
        </div>
      </TabPanel>
      <TabPanel :header="t('tickets.comments')">
        <CommentSection entity-type="TICKET" :entity-id="ticket.id" />
      </TabPanel>
      <TabPanel :header="t('tickets.files')">
        <AttachmentList entity-type="TICKET" :entity-id="ticket.id" />
      </TabPanel>
    </TabView>
  </div>
</template>
