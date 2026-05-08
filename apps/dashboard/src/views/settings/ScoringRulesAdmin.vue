<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import ToggleSwitch from 'primevue/toggleswitch';
import Tag from 'primevue/tag';
import { scoringApi, type ScoringRule, type RuleItem, type CreateScoringRuleInput } from '@/api/scoring';
import { useAppToast } from '@/composables/useAppToast';

const { t } = useI18n();
const toast = useAppToast();

const rules = ref<ScoringRule[]>([]);
const loading = ref(true);
const showDialog = ref(false);
const editing = ref<ScoringRule | null>(null);
const saving = ref(false);
const entityTypeFilter = ref<string | null>(null);

const form = ref<CreateScoringRuleInput>({
  name: '',
  entityType: 'PERSON',
  rules: [],
  maxScore: 100,
});

const entityTypeOptions = [
  { label: 'Person', value: 'PERSON' },
  { label: 'Deal', value: 'DEAL' },
];

const personFieldOptions = computed(() => [
  { label: 'lifecycleStage', value: 'lifecycleStage' },
  { label: 'industry', value: 'industry' },
  { label: 'source', value: 'source' },
  { label: 'email', value: 'email' },
  { label: 'phone', value: 'phone' },
  { label: 'title', value: 'title' },
]);

const dealFieldOptions = computed(() => [
  { label: 'amount', value: 'amount' },
  { label: 'probability', value: 'probability' },
  { label: 'status', value: 'status' },
  { label: 'source', value: 'source' },
  { label: 'stageId', value: 'stageId' },
]);

const fieldOptions = computed(() =>
  form.value.entityType === 'DEAL' ? dealFieldOptions.value : personFieldOptions.value,
);

const operatorOptions = [
  { label: t('scoring.operators.equals'), value: 'EQUALS' },
  { label: t('scoring.operators.notEquals'), value: 'NOT_EQUALS' },
  { label: t('scoring.operators.contains'), value: 'CONTAINS' },
  { label: t('scoring.operators.gt'), value: 'GT' },
  { label: t('scoring.operators.lt'), value: 'LT' },
  { label: t('scoring.operators.gte'), value: 'GTE' },
  { label: t('scoring.operators.lte'), value: 'LTE' },
  { label: t('scoring.operators.in'), value: 'IN' },
  { label: t('scoring.operators.notIn'), value: 'NOT_IN' },
  { label: t('scoring.operators.isSet'), value: 'IS_SET' },
  { label: t('scoring.operators.isNotSet'), value: 'IS_NOT_SET' },
];

async function fetch() {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (entityTypeFilter.value) params.entityType = entityTypeFilter.value;
    const res = await scoringApi.listRules(params);
    rules.value = res.items;
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editing.value = null;
  form.value = { name: '', entityType: 'PERSON', rules: [], maxScore: 100 };
  showDialog.value = true;
}

function openEdit(rule: ScoringRule) {
  editing.value = rule;
  form.value = {
    name: rule.name,
    entityType: rule.entityType,
    rules: [...rule.rules],
    maxScore: rule.maxScore,
  };
  showDialog.value = true;
}

function addRuleItem() {
  form.value.rules.push({ field: '', operator: 'EQUALS', value: '', points: 0 });
}

function removeRuleItem(index: number) {
  form.value.rules.splice(index, 1);
}

async function save() {
  saving.value = true;
  try {
    if (editing.value) {
      await scoringApi.updateRule(editing.value.id, form.value);
      toast.success(t('scoring.ruleUpdated'));
    } else {
      await scoringApi.createRule(form.value);
      toast.success(t('scoring.ruleCreated'));
    }
    showDialog.value = false;
    await fetch();
  } finally {
    saving.value = false;
  }
}

async function toggleActive(rule: ScoringRule) {
  await scoringApi.updateRule(rule.id, { isActive: !rule.isActive });
  await fetch();
}

async function archive(rule: ScoringRule) {
  await scoringApi.archiveRule(rule.id);
  toast.success(t('scoring.ruleArchived'));
  await fetch();
}

async function rescore(entityType: string) {
  await scoringApi.bulkRescore(entityType);
  toast.success(t('scoring.rescoreStarted'));
}

onMounted(fetch);
</script>

<template>
  <div data-test="scoring-rules-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('scoring.title') }}</h1>
      <div class="flex gap-2">
        <Button
          :label="t('scoring.bulkRescore') + ' (Person)'"
          icon="pi pi-refresh"
          severity="secondary"
          data-test="rescore-person-btn"
          @click="rescore('PERSON')"
        />
        <Button
          :label="t('scoring.bulkRescore') + ' (Deal)'"
          icon="pi pi-refresh"
          severity="secondary"
          data-test="rescore-deal-btn"
          @click="rescore('DEAL')"
        />
        <Button
          :label="t('scoring.createRule')"
          icon="pi pi-plus"
          data-test="create-rule-btn"
          @click="openCreate"
        />
      </div>
    </div>

    <div class="mb-4">
      <Select
        v-model="entityTypeFilter"
        :options="[{ label: 'All', value: null }, ...entityTypeOptions]"
        option-label="label"
        option-value="value"
        :placeholder="t('scoring.entityType')"
        class="w-48"
        data-test="entity-type-filter"
        @change="fetch()"
      />
    </div>

    <DataTable
      :value="rules"
      :loading="loading"
      data-test="rules-table"
    >
      <Column field="name" :header="t('scoring.name')" />
      <Column field="entityType" :header="t('scoring.entityType')">
        <template #body="{ data }">
          <Tag :value="data.entityType" severity="info" />
        </template>
      </Column>
      <Column :header="t('scoring.rules')">
        <template #body="{ data }">
          {{ data.rules.length }}
        </template>
      </Column>
      <Column field="maxScore" :header="t('scoring.maxScore')" />
      <Column :header="t('scoring.isActive')">
        <template #body="{ data }">
          <ToggleSwitch
            :model-value="data.isActive"
            data-test="active-toggle"
            @update:model-value="toggleActive(data)"
          />
        </template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              text
              size="small"
              @click="openEdit(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              text
              size="small"
              @click="archive(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <Dialog
      v-model:visible="showDialog"
      :header="editing ? t('scoring.editRule') : t('scoring.createRule')"
      modal
      class="w-full max-w-2xl"
      data-test="rule-dialog"
    >
      <div class="flex flex-col gap-4">
        <div>
          <label class="text-sm font-medium">{{ t('scoring.name') }}</label>
          <InputText v-model="form.name" class="w-full mt-1" data-test="rule-name-input" />
        </div>
        <div class="flex gap-4">
          <div class="flex-1">
            <label class="text-sm font-medium">{{ t('scoring.entityType') }}</label>
            <Select
              v-model="form.entityType"
              :options="entityTypeOptions"
              option-label="label"
              option-value="value"
              class="w-full mt-1"
              :disabled="!!editing"
              data-test="entity-type-select"
            />
          </div>
          <div class="flex-1">
            <label class="text-sm font-medium">{{ t('scoring.maxScore') }}</label>
            <InputNumber v-model="form.maxScore" class="w-full mt-1" data-test="max-score-input" />
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium">{{ t('scoring.rules') }}</label>
            <Button
              :label="t('scoring.addRule')"
              icon="pi pi-plus"
              severity="secondary"
              size="small"
              data-test="add-rule-btn"
              @click="addRuleItem"
            />
          </div>
          <div v-if="form.rules.length === 0" class="text-slate-500 text-sm">
            {{ t('scoring.noRules') }}
          </div>
          <div
            v-for="(item, idx) in form.rules"
            :key="idx"
            class="flex gap-2 items-end mb-2"
            data-test="rule-row"
          >
            <div class="flex-1">
              <label class="text-xs text-slate-500">{{ t('scoring.field') }}</label>
              <Select
                v-model="item.field"
                :options="fieldOptions"
                option-label="label"
                option-value="value"
                editable
                class="w-full"
                data-test="field-select"
              />
            </div>
            <div class="flex-1">
              <label class="text-xs text-slate-500">{{ t('scoring.operator') }}</label>
              <Select
                v-model="item.operator"
                :options="operatorOptions"
                option-label="label"
                option-value="value"
                class="w-full"
                data-test="operator-select"
              />
            </div>
            <div class="flex-1">
              <label class="text-xs text-slate-500">{{ t('scoring.value') }}</label>
              <InputText v-model="item.value" class="w-full" data-test="value-input" />
            </div>
            <div class="w-24">
              <label class="text-xs text-slate-500">{{ t('scoring.points') }}</label>
              <InputNumber v-model="item.points" class="w-full" data-test="points-input" />
            </div>
            <Button
              icon="pi pi-times"
              severity="danger"
              text
              size="small"
              data-test="remove-rule-btn"
              @click="removeRuleItem(idx)"
            />
          </div>
        </div>

        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showDialog = false" />
          <Button :label="t('common.save')" :loading="saving" data-test="save-rule-btn" @click="save" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
