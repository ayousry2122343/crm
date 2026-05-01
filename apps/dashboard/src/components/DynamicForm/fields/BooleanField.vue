<script setup lang="ts">
import ToggleSwitch from 'primevue/toggleswitch';
import { useField } from 'vee-validate';
import type { FieldDef } from '@/api/metadata';

const props = defineProps<{
  name: string;
  label: string;
  field: FieldDef;
}>();

const { value, errorMessage } = useField<boolean | null | undefined>(
  () => props.name,
);
</script>

<template>
  <div class="flex items-center gap-2">
    <ToggleSwitch
      v-model="value as boolean"
      :data-test="`field-${name}`"
    />
    <label class="text-sm">
      {{ label }}<span v-if="field.required" class="text-red-500">*</span>
    </label>
    <p v-if="errorMessage" class="text-xs text-red-500 ms-2">{{ errorMessage }}</p>
  </div>
</template>
