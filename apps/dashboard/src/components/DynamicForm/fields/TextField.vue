<script setup lang="ts">
import InputText from 'primevue/inputtext';
import { useField } from 'vee-validate';
import type { FieldDef } from '@/api/metadata';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  name: string;
  label: string;
  field: FieldDef;
}>();

const { value, errorMessage } = useField<string | null | undefined>(
  () => props.name,
);
const { locale } = useI18n();

function helpText(): string | undefined {
  const ht = props.field.helpText;
  if (!ht) return undefined;
  return locale.value === 'ar' ? ht.ar : ht.en;
}
</script>

<template>
  <div>
    <label class="block text-sm mb-1">
      {{ label }}<span v-if="field.required" class="text-red-500">*</span>
    </label>
    <InputText
      v-model="value as string"
      class="w-full"
      :data-test="`field-${name}`"
    />
    <p v-if="helpText()" class="text-xs text-slate-500 mt-1">{{ helpText() }}</p>
    <p v-if="errorMessage" class="text-xs text-red-500 mt-1">{{ errorMessage }}</p>
  </div>
</template>
