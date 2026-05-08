<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { sequencesApi, type Sequence, type SequenceStep } from '@/api/sequences';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';

const props = defineProps<{ id: string }>();
const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const sequence = ref<Sequence | null>(null);
const loading = ref(false);

const delayUnitOptions = [
  { label: t('sequences.hours'), value: 'hours' },
  { label: t('sequences.days'), value: 'days' },
];

const actionOptions = [
  { label: t('sequences.actionSendEmail'), value: 'send_email' },
  { label: t('sequences.actionUpdateField'), value: 'update_field' },
  { label: t('sequences.actionNotify'), value: 'notify' },
];

const newStep = ref<SequenceStep>({ action: 'send_email', delay: 1, delayUnit: 'days' });

async function load() {
  loading.value = true;
  try {
    sequence.value = await sequencesApi.get(props.id || (route.params.id as string));
  } finally {
    loading.value = false;
  }
}

async function addStep() {
  if (!sequence.value) return;
  const updatedSteps = [...sequence.value.steps, { ...newStep.value }];
  sequence.value = await sequencesApi.update(sequence.value.id, { steps: updatedSteps });
  newStep.value = { action: 'send_email', delay: 1, delayUnit: 'days' };
}

async function removeStep(idx: number) {
  if (!sequence.value) return;
  const updatedSteps = sequence.value.steps.filter((_, i) => i !== idx);
  sequence.value = await sequencesApi.update(sequence.value.id, { steps: updatedSteps });
}

async function toggleEnabled() {
  if (!sequence.value) return;
  sequence.value = await sequencesApi.update(sequence.value.id, {
    enabled: !sequence.value.enabled,
  });
}

const enrollmentSeverity: Record<string, string> = {
  ACTIVE: 'success',
  COMPLETED: 'info',
  PAUSED: 'warn',
  EXITED: 'danger',
};

onMounted(load);
</script>

<template>
  <div data-test="sequence-detail-page">
    <div class="flex items-center gap-3 mb-4">
      <Button
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        rounded
        @click="router.push({ name: 'sequences' })"
      />
      <h1 class="text-2xl font-bold" data-test="sequence-name">
        {{ sequence?.name }}
      </h1>
      <Tag
        v-if="sequence"
        :value="sequence.enabled ? t('sequences.enabled') : t('sequences.disabled')"
        :severity="sequence.enabled ? 'success' : 'warn'"
      />
      <div class="ml-auto flex gap-2">
        <Button
          v-if="sequence"
          :label="sequence.enabled ? t('sequences.disable') : t('sequences.enable')"
          :severity="sequence.enabled ? 'warn' : 'success'"
          size="small"
          data-test="toggle-enabled-btn"
          @click="toggleEnabled"
        />
      </div>
    </div>

    <div v-if="sequence" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h2 class="text-lg font-semibold mb-3">{{ t('sequences.steps') }}</h2>
        <div
          v-for="(step, idx) in sequence.steps"
          :key="idx"
          class="flex items-center gap-3 p-3 border rounded mb-2"
          data-test="step-item"
        >
          <span class="font-mono text-sm bg-slate-100 px-2 py-1 rounded">{{ idx + 1 }}</span>
          <span>{{ step.action }}</span>
          <span class="text-sm text-slate-500">
            {{ t('sequences.after') }} {{ step.delay }} {{ step.delayUnit }}
          </span>
          <Button
            icon="pi pi-trash"
            severity="danger"
            text
            rounded
            size="small"
            @click="removeStep(idx)"
          />
        </div>
        <div class="flex items-end gap-2 mt-3" data-test="add-step-form">
          <Select
            v-model="newStep.action"
            :options="actionOptions"
            option-label="label"
            option-value="value"
            class="w-40"
          />
          <InputNumber v-model="newStep.delay" :min="1" class="w-20" />
          <Select
            v-model="newStep.delayUnit"
            :options="delayUnitOptions"
            option-label="label"
            option-value="value"
            class="w-28"
          />
          <Button
            :label="t('sequences.addStep')"
            icon="pi pi-plus"
            size="small"
            data-test="add-step-btn"
            @click="addStep"
          />
        </div>
      </div>

      <div>
        <h2 class="text-lg font-semibold mb-3">{{ t('sequences.enrollments') }}</h2>
        <DataTable
          :value="sequence.enrollments ?? []"
          data-test="enrollments-table"
        >
          <Column field="person.fullName" :header="t('sequences.contact')" />
          <Column field="currentStep" :header="t('sequences.currentStep')" />
          <Column field="status" :header="t('sequences.enrollmentStatus')">
            <template #body="{ data }">
              <Tag :value="data.status" :severity="enrollmentSeverity[data.status] ?? 'info'" />
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>
