<script setup lang="ts">
import { computed } from 'vue';
import MultiSelect from 'primevue/multiselect';
import { useField } from 'vee-validate';
import { useI18n } from 'vue-i18n';
import type { FieldDef } from '@/api/metadata';

type Option = { value: string; label: { ar: string; en: string } };

const props = defineProps<{
  name: string;
  label: string;
  field: FieldDef;
}>();

const { value, errorMessage } = useField<string[] | null | undefined>(
  () => props.name,
);
const { locale } = useI18n();

const options = computed<Array<{ value: string; label: string }>>(() => {
  const opts = (props.field.options as Option[] | undefined) ?? [];
  return opts.map((o) => ({
    value: o.value,
    label: locale.value === 'ar' ? o.label.ar : o.label.en,
  }));
});
</script>

<template>
  <div>
    <label class="block text-sm mb-1">
      {{ label }}<span v-if="field.required" class="text-red-500">*</span>
    </label>
    <MultiSelect
      v-model="value as string[]"
      :options="options"
      option-label="label"
      option-value="value"
      class="w-full"
      :data-test="`field-${name}`"
    />
    <p v-if="errorMessage" class="text-xs text-red-500 mt-1">{{ errorMessage }}</p>
  </div>
</template>
