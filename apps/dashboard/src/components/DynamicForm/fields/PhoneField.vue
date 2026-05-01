<script setup lang="ts">
import InputText from 'primevue/inputtext';
import { useField } from 'vee-validate';
import type { FieldDef } from '@/api/metadata';

const props = defineProps<{
  name: string;
  label: string;
  field: FieldDef;
}>();

const { value, errorMessage } = useField<string | null | undefined>(
  () => props.name,
);
</script>

<template>
  <div>
    <label class="block text-sm mb-1">
      {{ label }}<span v-if="field.required" class="text-red-500">*</span>
    </label>
    <InputText
      v-model="value as string"
      type="tel"
      class="w-full"
      :data-test="`field-${name}`"
    />
    <p v-if="errorMessage" class="text-xs text-red-500 mt-1">{{ errorMessage }}</p>
  </div>
</template>
