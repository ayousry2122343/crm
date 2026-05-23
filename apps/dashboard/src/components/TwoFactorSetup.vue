<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import { twoFactorApi } from '@/api/two-factor';

const { t } = useI18n();
const emit = defineEmits<{ enabled: []; disabled: [] }>();

const step = ref<'idle' | 'qr' | 'backup'>('idle');
const qrUri = ref('');
const secret = ref('');
const code = ref('');
const backupCodes = ref<string[]>([]);
const loading = ref(false);
const error = ref('');
const showDialog = ref(false);

async function startSetup() {
  loading.value = true;
  error.value = '';
  try {
    const res = await twoFactorApi.setup();
    qrUri.value = res.qrCodeUri;
    secret.value = res.secret;
    step.value = 'qr';
    showDialog.value = true;
  } catch (e: any) {
    error.value = e.response?.data?.message || t('errors.generic');
  } finally {
    loading.value = false;
  }
}

async function confirmSetup() {
  loading.value = true;
  error.value = '';
  try {
    const res = await twoFactorApi.confirm(code.value);
    backupCodes.value = res.backupCodes;
    step.value = 'backup';
    emit('enabled');
  } catch (e: any) {
    error.value = e.response?.data?.message || t('twoFactor.invalidCode');
  } finally {
    loading.value = false;
  }
}

function closeDialog() {
  showDialog.value = false;
  step.value = 'idle';
  code.value = '';
  error.value = '';
}
</script>

<template>
  <div>
    <Button
      :label="t('twoFactor.enable')"
      icon="pi pi-shield"
      @click="startSetup"
      :loading="loading"
    />

    <Dialog
      v-model:visible="showDialog"
      :header="t('twoFactor.setup')"
      :closable="step !== 'backup'"
      modal
      class="w-[480px]"
    >
      <div v-if="step === 'qr'" class="flex flex-col items-center gap-4">
        <p>{{ t('twoFactor.scanQR') }}</p>
        <img
          :src="`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrUri)}&size=200x200`"
          alt="QR Code"
          width="200"
          height="200"
        />
        <p class="text-sm text-gray-500">
          {{ t('twoFactor.manualEntry') }}:
          <code class="bg-gray-100 px-2 py-1 rounded select-all">{{ secret }}</code>
        </p>
        <InputText
          v-model="code"
          :placeholder="t('twoFactor.enterCode')"
          maxlength="6"
          class="text-center text-lg tracking-widest"
        />
        <small v-if="error" class="text-red-500">{{ error }}</small>
        <Button
          :label="t('twoFactor.verify')"
          @click="confirmSetup"
          :loading="loading"
          class="w-full"
        />
      </div>

      <div v-if="step === 'backup'" class="flex flex-col gap-4">
        <p class="font-bold text-orange-600">{{ t('twoFactor.saveBackupCodes') }}</p>
        <div class="grid grid-cols-2 gap-2 font-mono bg-gray-100 p-4 rounded">
          <span v-for="bc in backupCodes" :key="bc">{{ bc }}</span>
        </div>
        <p class="text-sm text-gray-500">{{ t('twoFactor.backupWarning') }}</p>
        <Button :label="t('common.done')" @click="closeDialog" class="w-full" />
      </div>
    </Dialog>
  </div>
</template>
