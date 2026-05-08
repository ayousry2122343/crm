<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Button from 'primevue/button';
import { ticketsApi, type CreateTicketInput } from '@/api/tickets';
import { queuesApi, type Queue } from '@/api/queues';
import { useAppToast } from '@/composables/useAppToast';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'created'): void;
}>();

const { t } = useI18n();
const toast = useAppToast();
const saving = ref(false);
const queuesList = ref<Queue[]>([]);

const form = ref<CreateTicketInput>({
  subject: '',
  description: '',
  priority: 'MEDIUM',
  channel: 'WEB_FORM',
});

const priorities = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
  { label: 'Urgent', value: 'URGENT' },
];

const channels = [
  { label: 'Email', value: 'EMAIL' },
  { label: 'Phone', value: 'PHONE' },
  { label: 'Chat', value: 'CHAT' },
  { label: 'Web Form', value: 'WEB_FORM' },
  { label: 'Portal', value: 'PORTAL' },
  { label: 'API', value: 'API' },
];

const queueOptions = computed(() => [
  { label: '—', value: undefined },
  ...queuesList.value.map((q) => ({ label: q.name, value: q.id })),
]);

const selectedQueue = computed(() =>
  queuesList.value.find((q) => q.id === form.value.queueId),
);

const assigneeDisabled = computed(() =>
  selectedQueue.value?.assignmentMode !== undefined &&
  selectedQueue.value?.assignmentMode !== 'MANUAL',
);

watch(() => props.visible, (v) => {
  if (v) {
    form.value = { subject: '', description: '', priority: 'MEDIUM', channel: 'WEB_FORM' };
  }
});

onMounted(async () => {
  try {
    const res = await queuesApi.list();
    queuesList.value = res.items;
  } catch { /* queues not available */ }
});

async function submit() {
  if (!form.value.subject.trim()) return;
  saving.value = true;
  try {
    await ticketsApi.create(form.value);
    toast.success(t('tickets.created'));
    emit('update:visible', false);
    emit('created');
  } catch {
    toast.error('Error');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="t('tickets.create')"
    modal
    class="w-full max-w-lg"
    data-test="ticket-create-dialog"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-4">
      <div>
        <label class="block text-sm font-medium mb-1">{{ t('tickets.subject') }}</label>
        <InputText
          v-model="form.subject"
          class="w-full"
          data-test="ticket-subject"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">{{ t('tickets.description') }}</label>
        <Textarea
          v-model="form.description"
          rows="3"
          class="w-full"
          data-test="ticket-description"
        />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('tickets.priority') }}</label>
          <Select
            v-model="form.priority"
            :options="priorities"
            option-label="label"
            option-value="value"
            class="w-full"
            data-test="ticket-priority"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('tickets.channel') }}</label>
          <Select
            v-model="form.channel"
            :options="channels"
            option-label="label"
            option-value="value"
            class="w-full"
            data-test="ticket-channel"
          />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">{{ t('tickets.queue') }}</label>
        <Select
          v-model="form.queueId"
          :options="queueOptions"
          option-label="label"
          option-value="value"
          class="w-full"
          data-test="ticket-queue"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">{{ t('tickets.contact') }}</label>
        <InputText
          v-model="form.contactId"
          class="w-full"
          :placeholder="t('tickets.contact')"
          data-test="ticket-contact"
        />
      </div>
      <div>
        <label class="block text-sm font-medium mb-1">{{ t('tickets.assignee') }}</label>
        <InputText
          v-model="form.assigneeId"
          class="w-full"
          :placeholder="assigneeDisabled ? t('tickets.autoAssigned') : t('tickets.assignee')"
          :disabled="assigneeDisabled"
          data-test="ticket-assignee"
        />
      </div>
    </div>
    <template #footer>
      <Button
        :label="t('tickets.create')"
        :loading="saving"
        data-test="ticket-submit"
        @click="submit"
      />
    </template>
  </Dialog>
</template>
