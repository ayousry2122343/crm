<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import InputSwitch from 'primevue/inputswitch';
import Tag from 'primevue/tag';
import { formsApi, type CrmForm, type FormField } from '@/api/forms';

const props = defineProps<{ id: string }>();

const { t } = useI18n();
const router = useRouter();

const form = ref<CrmForm | null>(null);
const loading = ref(true);
const saving = ref(false);

const fieldTypeOptions = [
  { label: 'Text', value: 'text' as const },
  { label: 'Email', value: 'email' as const },
  { label: 'Phone', value: 'phone' as const },
  { label: 'Number', value: 'number' as const },
  { label: 'Date', value: 'date' as const },
  { label: 'Select', value: 'select' as const },
  { label: 'Checkbox', value: 'checkbox' as const },
  { label: 'Textarea', value: 'textarea' as const },
];

const embedSnippet = computed(() => {
  if (!form.value) return '';
  return `<script src="/forms/embed.js" defer><\/script>\n<div data-crm-form="${form.value.slug}"></div>`;
});

async function load() {
  loading.value = true;
  try {
    form.value = await formsApi.get(props.id);
  } finally {
    loading.value = false;
  }
}

function addField() {
  if (!form.value) return;
  const key = `field_${form.value.fields.length + 1}`;
  form.value.fields.push({
    key,
    label: { ar: '', en: '' },
    type: 'text',
    required: false,
  });
}

function removeField(index: number) {
  if (!form.value) return;
  form.value.fields.splice(index, 1);
}

function moveField(index: number, direction: -1 | 1) {
  if (!form.value) return;
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= form.value.fields.length) return;
  const fields = form.value.fields;
  [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
}

async function save() {
  if (!form.value) return;
  saving.value = true;
  try {
    await formsApi.update(form.value.id, {
      name: form.value.name,
      isPublic: form.value.isPublic,
      fields: form.value.fields,
      redirectUrl: form.value.redirectUrl,
    });
  } finally {
    saving.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div data-test="form-editor-page">
    <div class="flex items-center gap-2 mb-4">
      <Button icon="pi pi-arrow-left" severity="secondary" size="small" @click="router.push({ name: 'forms' })" />
      <h1 class="text-2xl font-bold">{{ form?.name ?? t('common.loading') }}</h1>
    </div>

    <div v-if="form" class="grid grid-cols-3 gap-6">
      <!-- Field Builder -->
      <div class="col-span-2">
        <div class="bg-white rounded-lg border p-4">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold">{{ t('forms.fields') }}</h2>
            <Button :label="t('forms.addField')" icon="pi pi-plus" size="small" @click="addField" data-test="add-field-btn" />
          </div>

          <div v-if="form.fields.length === 0" class="text-center py-8 text-slate-400">
            {{ t('forms.noFields') }}
          </div>

          <div v-for="(field, idx) in form.fields" :key="idx" class="border rounded-lg p-3 mb-3" data-test="form-field-row">
            <div class="flex items-center gap-2 mb-2">
              <Button icon="pi pi-arrow-up" severity="secondary" size="small" text :disabled="idx === 0" @click="moveField(idx, -1)" />
              <Button icon="pi pi-arrow-down" severity="secondary" size="small" text :disabled="idx === form.fields.length - 1" @click="moveField(idx, 1)" />
              <Tag :value="field.type" severity="info" class="text-xs" />
              <span class="text-sm text-slate-500">{{ field.key }}</span>
              <div class="flex-1" />
              <Button icon="pi pi-trash" severity="danger" size="small" text @click="removeField(idx)" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <InputText v-model="field.key" placeholder="key" size="small" />
              <Select v-model="field.type" :options="fieldTypeOptions" option-label="label" option-value="value" size="small" />
              <InputText v-model="field.label.en" placeholder="English label" size="small" />
              <InputText v-model="field.label.ar" placeholder="Arabic label" size="small" />
            </div>
            <div class="mt-2 flex items-center gap-4">
              <label class="flex items-center gap-2 text-sm">
                <InputSwitch v-model="field.required" />
                {{ t('settings.customFields.required') }}
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings Sidebar -->
      <div class="col-span-1">
        <div class="bg-white rounded-lg border p-4 flex flex-col gap-4">
          <h2 class="font-semibold">{{ t('forms.settings') }}</h2>
          <div>
            <label class="text-sm font-medium mb-1 block">{{ t('forms.formName') }}</label>
            <InputText v-model="form.name" class="w-full" size="small" />
          </div>
          <div>
            <label class="text-sm font-medium mb-1 block">{{ t('forms.slug') }}</label>
            <InputText :model-value="form.slug" class="w-full" size="small" disabled />
          </div>
          <label class="flex items-center gap-2 text-sm">
            <InputSwitch v-model="form.isPublic" />
            {{ t('forms.public') }}
          </label>
          <div>
            <label class="text-sm font-medium mb-1 block">{{ t('forms.redirectUrl') }}</label>
            <InputText v-model="form.redirectUrl" class="w-full" size="small" placeholder="https://..." />
          </div>
          <Button :label="t('common.save')" :loading="saving" @click="save" data-test="save-form-btn" />

          <div class="mt-4">
            <h3 class="text-sm font-medium mb-2">{{ t('forms.embedCode') }}</h3>
            <Textarea :model-value="embedSnippet" rows="3" class="w-full font-mono text-xs" readonly />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
