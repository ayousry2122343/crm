<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useBranding } from '@/composables/useBranding';
import { useAppToast } from '@/composables/useAppToast';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import ColorPicker from 'primevue/colorpicker';
import FileUpload from 'primevue/fileupload';

const { t } = useI18n();
const { branding, save } = useBranding();
const toast = useAppToast();

const form = ref({
  primaryColor: '',
  secondaryColor: '',
  companyName: '',
  logo: '',
  favicon: '',
});
const saving = ref(false);

onMounted(() => {
  form.value = {
    primaryColor: branding.value.primaryColor.replace('#', ''),
    secondaryColor: branding.value.secondaryColor.replace('#', ''),
    companyName: branding.value.companyName ?? '',
    logo: branding.value.logo ?? '',
    favicon: branding.value.favicon ?? '',
  };
});

const previewPrimary = computed(() => `#${form.value.primaryColor}`);
const previewSecondary = computed(() => `#${form.value.secondaryColor}`);

async function handleSave() {
  saving.value = true;
  try {
    await save({
      primaryColor: `#${form.value.primaryColor}`,
      secondaryColor: `#${form.value.secondaryColor}`,
      companyName: form.value.companyName || undefined,
      logo: form.value.logo || undefined,
      favicon: form.value.favicon || undefined,
    });
    toast.success(t('branding.saved'));
  } catch {
    toast.error(t('errors.generic'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="max-w-3xl">
    <h1 class="text-2xl font-bold mb-6">{{ t('branding.title') }}</h1>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Form -->
      <div class="flex flex-col gap-5">
        <div>
          <label class="block text-sm font-medium mb-1">{{ t('branding.companyName') }}</label>
          <InputText
            v-model="form.companyName"
            :placeholder="t('branding.companyNameHint')"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">{{ t('branding.primaryColor') }}</label>
          <div class="flex items-center gap-3">
            <ColorPicker v-model="form.primaryColor" />
            <InputText v-model="form.primaryColor" class="w-28 font-mono" maxlength="6" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">{{ t('branding.secondaryColor') }}</label>
          <div class="flex items-center gap-3">
            <ColorPicker v-model="form.secondaryColor" />
            <InputText v-model="form.secondaryColor" class="w-28 font-mono" maxlength="6" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">{{ t('branding.logoUrl') }}</label>
          <InputText
            v-model="form.logo"
            :placeholder="t('branding.logoHint')"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">{{ t('branding.faviconUrl') }}</label>
          <InputText
            v-model="form.favicon"
            :placeholder="t('branding.faviconHint')"
            class="w-full"
          />
        </div>

        <Button
          :label="t('common.save')"
          icon="pi pi-check"
          :loading="saving"
          @click="handleSave"
          class="mt-2 w-fit"
        />
      </div>

      <!-- Live Preview -->
      <div>
        <label class="block text-sm font-medium mb-2">{{ t('branding.preview') }}</label>
        <div class="rounded-lg overflow-hidden border shadow-sm">
          <!-- Sidebar preview -->
          <div
            class="p-4 text-white"
            :style="{ backgroundColor: previewSecondary }"
          >
            <div class="flex items-center gap-2 mb-4">
              <img
                v-if="form.logo"
                :src="form.logo"
                class="w-8 h-8 rounded object-contain"
                alt="Logo"
              />
              <span class="font-bold text-sm">
                {{ form.companyName || t('app.title') }}
              </span>
            </div>
            <div class="flex flex-col gap-1 text-xs">
              <div class="px-2 py-1 rounded bg-white/10">{{ t('nav.home') }}</div>
              <div class="px-2 py-1 rounded bg-white/5">{{ t('nav.people') }}</div>
              <div class="px-2 py-1 rounded bg-white/5">{{ t('nav.deals') }}</div>
            </div>
          </div>
          <!-- Content preview -->
          <div class="p-4 bg-white">
            <button
              class="px-4 py-2 rounded text-white text-sm font-medium"
              :style="{ backgroundColor: previewPrimary }"
            >
              {{ t('branding.sampleButton') }}
            </button>
            <p class="mt-2 text-sm">
              <a href="#" :style="{ color: previewPrimary }">{{ t('branding.sampleLink') }}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
