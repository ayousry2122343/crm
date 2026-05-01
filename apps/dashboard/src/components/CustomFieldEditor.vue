<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import Message from 'primevue/message';
import type { CustomFieldDef } from '@/api/custom-fields';

const props = defineProps<{ modelValue: CustomFieldDef }>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: CustomFieldDef): void;
  (e: 'save', v: CustomFieldDef): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();

const types = [
  'TEXT',
  'LONG_TEXT',
  'NUMBER',
  'DECIMAL',
  'BOOLEAN',
  'DATE',
  'DATETIME',
  'PICKLIST',
  'MULTI_PICKLIST',
  'LOOKUP',
  'URL',
  'EMAIL',
  'PHONE',
  'FILE',
];

const v = computed({
  get: () => props.modelValue,
  set: (n) => emit('update:modelValue', n),
});

const indexableTypes = new Set(['TEXT', 'NUMBER', 'DATE']);
const indexableEntityTypes = new Set(['Person', 'Company', 'Deal', 'Activity']);
const canIndex = computed(
  () =>
    indexableTypes.has(v.value.type) &&
    indexableEntityTypes.has(v.value.entityType),
);

const isPicklist = computed(
  () => v.value.type === 'PICKLIST' || v.value.type === 'MULTI_PICKLIST',
);

const optionsText = computed({
  get: () => {
    const o = v.value.options as Record<string, unknown> | undefined;
    if (!o) return '';
    try {
      return JSON.stringify(o, null, 2);
    } catch {
      return '';
    }
  },
  set: (text: string) => {
    try {
      const parsed = text.trim() ? JSON.parse(text) : undefined;
      emit('update:modelValue', { ...v.value, options: parsed });
    } catch {
      // ignore — keep prior value, error shown below if needed
    }
  },
});

function submit() {
  emit('save', v.value);
}
</script>

<template>
  <form class="flex flex-col gap-3" @submit.prevent="submit">
    <div>
      <label class="block text-sm mb-1">{{ t('settings.customFields.key') }}</label>
      <InputText
        v-model="v.key"
        class="w-full"
        :disabled="!!v.id"
        required
        pattern="^[a-z][a-z0-9_]*$"
        data-test="cf-key"
      />
      <p class="text-xs text-slate-500 mt-1">{{ t('settings.customFields.keyHint') }}</p>
    </div>
    <div>
      <label class="block text-sm mb-1">{{ t('settings.customFields.labelAr') }}</label>
      <InputText v-model="v.label.ar" class="w-full" required data-test="cf-label-ar" />
    </div>
    <div>
      <label class="block text-sm mb-1">{{ t('settings.customFields.labelEn') }}</label>
      <InputText v-model="v.label.en" class="w-full" required data-test="cf-label-en" />
    </div>
    <div>
      <label class="block text-sm mb-1">{{ t('settings.customFields.type') }}</label>
      <Select
        v-model="v.type"
        :options="types"
        :disabled="!!v.id"
        class="w-full"
        data-test="cf-type"
      />
    </div>
    <div v-if="isPicklist">
      <label class="block text-sm mb-1">Options (JSON)</label>
      <Textarea v-model="optionsText" rows="4" class="w-full font-mono text-xs" />
    </div>
    <div class="flex items-center gap-2">
      <Checkbox v-model="v.required" input-id="req" :binary="true" data-test="cf-required" />
      <label for="req">{{ t('settings.customFields.required') }}</label>
    </div>
    <div class="flex items-center gap-2">
      <Checkbox
        v-model="v.indexed"
        input-id="idx"
        :binary="true"
        :disabled="!canIndex"
        data-test="cf-indexed"
      />
      <label for="idx" :class="{ 'text-slate-400': !canIndex }">
        {{ t('settings.customFields.indexed') }}
      </label>
    </div>
    <Message v-if="v.indexed && !canIndex" severity="warn">
      {{ t('settings.customFields.indexHint') }}
    </Message>
    <div class="flex gap-2 mt-2">
      <Button type="submit" :label="t('common.save')" data-test="save-custom-field" />
      <Button
        type="button"
        :label="t('common.cancel')"
        severity="secondary"
        @click="emit('cancel')"
      />
    </div>
  </form>
</template>
