<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Dialog from 'primevue/dialog';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Button from 'primevue/button';
import { emailTemplatesApi, emailApi, type EmailTemplate } from '@/api/email-templates';

const props = defineProps<{
  visible: boolean;
  entityType?: string;
  entityId?: string;
  defaultTo?: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
  (e: 'sent'): void;
}>();

const { t } = useI18n();

const templates = ref<EmailTemplate[]>([]);
const selectedTemplateId = ref<string | null>(null);
const to = ref('');
const subject = ref('');
const body = ref('');
const sending = ref(false);

const templateOptions = computed(() => [
  { label: t('email.noTemplate'), value: null },
  ...templates.value.map((tpl) => ({ label: tpl.name, value: tpl.id })),
]);

function applyTemplate(templateId: string | null) {
  if (!templateId) return;
  const tpl = templates.value.find((t) => t.id === templateId);
  if (tpl) {
    subject.value = tpl.subject;
    body.value = tpl.body;
  }
}

async function send() {
  if (!to.value.trim() || !subject.value.trim()) return;
  sending.value = true;
  try {
    await emailApi.send({
      to: to.value.trim(),
      subject: subject.value.trim(),
      body: body.value,
      templateId: selectedTemplateId.value ?? undefined,
      entityType: props.entityType,
      entityId: props.entityId,
    });
    to.value = '';
    subject.value = '';
    body.value = '';
    selectedTemplateId.value = null;
    emit('update:visible', false);
    emit('sent');
  } finally {
    sending.value = false;
  }
}

onMounted(async () => {
  templates.value = await emailTemplatesApi.list();
  if (props.defaultTo) to.value = props.defaultTo;
});
</script>

<template>
  <Dialog
    :visible="visible"
    :header="t('email.compose')"
    modal
    class="w-full max-w-lg"
    data-test="email-composer"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-4">
      <Select
        v-model="selectedTemplateId"
        :options="templateOptions"
        option-label="label"
        option-value="value"
        :placeholder="t('email.selectTemplate')"
        class="w-full"
        data-test="email-template-select"
        @update:model-value="applyTemplate"
      />
      <InputText
        v-model="to"
        :placeholder="t('email.to')"
        class="w-full"
        data-test="email-to"
      />
      <InputText
        v-model="subject"
        :placeholder="t('email.subject')"
        class="w-full"
        data-test="email-subject"
      />
      <Textarea
        v-model="body"
        :placeholder="t('email.body')"
        rows="6"
        class="w-full"
        data-test="email-body"
      />
      <div class="flex gap-2 justify-end">
        <Button :label="t('common.cancel')" severity="secondary" @click="emit('update:visible', false)" />
        <Button
          :label="t('email.send')"
          icon="pi pi-send"
          :loading="sending"
          data-test="send-email-btn"
          @click="send"
        />
      </div>
    </div>
  </Dialog>
</template>
