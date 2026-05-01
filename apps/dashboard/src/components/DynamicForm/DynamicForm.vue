<script setup lang="ts" generic="T extends Record<string, any>">
import { computed, watch } from 'vue';
import { useForm } from 'vee-validate';
import { toTypedSchema } from '@vee-validate/zod';
import Button from 'primevue/button';
import { useI18n } from 'vue-i18n';
import { useMetadata } from '@/composables/useMetadata';
import { buildZodSchema } from '@/composables/useFormFromMetadata';
import type { FieldDef } from '@/api/metadata';
import TextField from './fields/TextField.vue';
import LongTextField from './fields/LongTextField.vue';
import NumberField from './fields/NumberField.vue';
import DecimalField from './fields/DecimalField.vue';
import BooleanField from './fields/BooleanField.vue';
import DateField from './fields/DateField.vue';
import DateTimeField from './fields/DateTimeField.vue';
import PicklistField from './fields/PicklistField.vue';
import MultiPicklistField from './fields/MultiPicklistField.vue';
import LookupField from './fields/LookupField.vue';
import EmailField from './fields/EmailField.vue';
import PhoneField from './fields/PhoneField.vue';
import UrlField from './fields/UrlField.vue';
import FileField from './fields/FileField.vue';

const props = defineProps<{
  entityType: string;
  initialValues?: Partial<T>;
  submitLabel?: string;
  loading?: boolean;
}>();
const emit = defineEmits<{
  (e: 'submit', payload: T): void;
  (e: 'cancel'): void;
}>();

const { t, locale } = useI18n();
const { data: meta, loading: metaLoading } = useMetadata(props.entityType);

const fieldsToShow = computed<FieldDef[]>(() => meta.value?.fields ?? []);

const schema = computed(() => {
  return fieldsToShow.value.length > 0
    ? toTypedSchema(buildZodSchema(fieldsToShow.value))
    : undefined;
});

const { handleSubmit, errors, setValues } = useForm<Record<string, any>>({
  validationSchema: schema as any,
  initialValues: (props.initialValues ?? {}) as Record<string, any>,
});

watch(
  () => props.initialValues,
  (n) => {
    if (n) setValues(n as Record<string, any>);
  },
);

const onSubmit = handleSubmit((values) => {
  emit('submit', values as T);
});

function lbl(label: { ar: string; en: string }): string {
  return locale.value === 'ar' ? label.ar : label.en;
}

const fieldComponentMap: Record<string, unknown> = {
  TEXT: TextField,
  LONG_TEXT: LongTextField,
  NUMBER: NumberField,
  DECIMAL: DecimalField,
  BOOLEAN: BooleanField,
  DATE: DateField,
  DATETIME: DateTimeField,
  PICKLIST: PicklistField,
  MULTI_PICKLIST: MultiPicklistField,
  LOOKUP: LookupField,
  EMAIL: EmailField,
  PHONE: PhoneField,
  URL: UrlField,
  FILE: FileField,
};

// Errors are referenced via template binding to keep field reactive lookups
// alive even when individual components don't read errors directly.
void errors;
</script>

<template>
  <form
    class="flex flex-col gap-4"
    data-test="dynamic-form"
    @submit.prevent="onSubmit"
  >
    <div v-if="metaLoading" class="text-slate-500" data-test="meta-loading">
      {{ t('common.loading') }}
    </div>
    <template v-else>
      <component
        :is="(fieldComponentMap[field.type] as any) ?? TextField"
        v-for="field in fieldsToShow"
        :key="field.key"
        :field="field"
        :label="lbl(field.label)"
        :name="field.key"
      />
      <div class="flex gap-2 justify-end mt-4">
        <Button
          type="button"
          :label="t('common.cancel')"
          severity="secondary"
          @click="emit('cancel')"
        />
        <Button
          type="submit"
          :label="props.submitLabel ?? t('common.save')"
          :loading="props.loading"
          data-test="submit"
        />
      </div>
    </template>
  </form>
</template>
