<script setup lang="ts">
import InputNumber from 'primevue/inputnumber';
import { useField } from 'vee-validate';
import type { FieldDef } from '@/api/metadata';

const props = defineProps<{
  name: string;
  label: string;
  field: FieldDef;
}>();

const { value, errorMessage } = useField<number | null | undefined>(
  () => props.name,
);
</script>

<template>
  <div>
    <label class="block text-sm mb-1">
      {{ label }}<span v-if="field.required" class="text-red-500">*</span>
    </label>
    <InputNumber
      v-model="value as number"
      class="w-full"
      :data-test="`field-${name}`"
      :min-fraction-digits="2"
      :max-fraction-digits="6"
    />
    <p v-if="errorMessage" class="text-xs text-red-500 mt-1">{{ errorMessage }}</p>
  </div>
</template>
