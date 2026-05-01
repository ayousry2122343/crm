<script setup lang="ts">
import FileUpload from 'primevue/fileupload';
import { useField } from 'vee-validate';
import type { FieldDef } from '@/api/metadata';

const props = defineProps<{
  name: string;
  label: string;
  field: FieldDef;
}>();

const { value, errorMessage, setValue } = useField<unknown>(() => props.name);

function onSelect(event: { files: File[] }) {
  setValue(event.files?.[0] ?? null);
}
</script>

<template>
  <div>
    <label class="block text-sm mb-1">
      {{ label }}<span v-if="field.required" class="text-red-500">*</span>
    </label>
    <FileUpload
      mode="basic"
      :auto="false"
      :data-test="`field-${name}`"
      @select="onSelect"
    />
    <p v-if="value && (value as File).name" class="text-xs text-slate-500 mt-1">
      {{ (value as File).name }}
    </p>
    <p v-if="errorMessage" class="text-xs text-red-500 mt-1">{{ errorMessage }}</p>
  </div>
</template>
