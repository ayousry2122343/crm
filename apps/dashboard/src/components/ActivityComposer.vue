<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import { activitiesApi, type ActivityType } from '@/api/activities';

const props = defineProps<{
  visible: boolean;
  parentEntity: string;
  parentId: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'created'): void;
}>();

const { t } = useI18n();

const activityType = ref<ActivityType>('NOTE');
const subject = ref('');
const body = ref('');
const dueAt = ref<Date | null>(null);
const saving = ref(false);

const typeOptions = computed(() => [
  { label: t('activities.note'), value: 'NOTE' as const },
  { label: t('activities.call'), value: 'CALL' as const },
  { label: t('activities.meeting'), value: 'MEETING' as const },
  { label: t('activities.task'), value: 'TASK' as const },
  { label: t('activities.email'), value: 'EMAIL' as const },
]);

const needsDueDate = computed(() => activityType.value === 'TASK' || activityType.value === 'MEETING');

async function save() {
  if (!subject.value.trim()) return;
  saving.value = true;
  try {
    await activitiesApi.create({
      parentEntity: props.parentEntity,
      parentId: props.parentId,
      type: activityType.value,
      subject: subject.value.trim(),
      body: body.value || null,
      dueAt: dueAt.value?.toISOString() ?? null,
    });
    subject.value = '';
    body.value = '';
    dueAt.value = null;
    activityType.value = 'NOTE';
    emit('update:visible', false);
    emit('created');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <Dialog
    :visible="visible"
    :header="t('activities.addActivity')"
    modal
    class="w-full max-w-lg"
    data-test="activity-composer"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-4">
      <Select
        v-model="activityType"
        :options="typeOptions"
        option-label="label"
        option-value="value"
        class="w-full"
        data-test="activity-type-select"
      />
      <InputText
        v-model="subject"
        :placeholder="t('activities.subject')"
        class="w-full"
        data-test="activity-subject"
      />
      <Textarea
        v-model="body"
        :placeholder="t('activities.body')"
        rows="3"
        class="w-full"
        data-test="activity-body"
      />
      <DatePicker
        v-if="needsDueDate"
        v-model="dueAt"
        show-time
        :placeholder="t('activities.dueAt')"
        class="w-full"
        data-test="activity-due-at"
      />
      <div class="flex gap-2 justify-end">
        <Button
          :label="t('common.cancel')"
          severity="secondary"
          @click="emit('update:visible', false)"
        />
        <Button
          :label="t('common.save')"
          :loading="saving"
          data-test="save-activity-btn"
          @click="save"
        />
      </div>
    </div>
  </Dialog>
</template>
