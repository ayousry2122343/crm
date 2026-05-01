<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { usersApi, type UserSummary, type PendingInvite } from '@/api/users';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Message from 'primevue/message';

const { t } = useI18n();

const users = ref<UserSummary[]>([]);
const pending = ref<PendingInvite[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const dialogVisible = ref(false);
const inviteForm = ref({ email: '', fullName: '' });
const inviting = ref(false);
const inviteError = ref<string | null>(null);

async function fetchAll() {
  loading.value = true;
  error.value = null;
  try {
    const r = await usersApi.list();
    users.value = r.members ?? [];
    pending.value = r.invites ?? [];
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    error.value = err?.response?.data?.message ?? err?.message ?? t('auth.errors.unknown');
  } finally {
    loading.value = false;
  }
}

async function submitInvite() {
  inviting.value = true;
  inviteError.value = null;
  try {
    await usersApi.invite(inviteForm.value);
    dialogVisible.value = false;
    inviteForm.value = { email: '', fullName: '' };
    await fetchAll();
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string };
    inviteError.value = err?.response?.data?.message ?? err?.message ?? t('auth.errors.unknown');
  } finally {
    inviting.value = false;
  }
}

onMounted(fetchAll);
</script>

<template>
  <div class="max-w-4xl">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold">{{ t('settings.users.title') }}</h1>
      <Button
        :label="t('settings.users.invite')"
        data-test="invite-user"
        @click="dialogVisible = true"
      />
    </div>
    <Message v-if="error" severity="error">{{ error }}</Message>

    <div v-if="loading" class="text-slate-500">{{ t('common.loading') }}</div>

    <template v-else>
      <DataTable :value="users" striped-rows class="mb-6">
        <Column field="fullName" :header="t('auth.fields.fullName')" />
        <Column field="email" :header="t('auth.fields.email')" />
        <Column field="status" :header="t('settings.users.status')" />
        <Column field="lastLoginAt" :header="t('settings.users.lastLogin')" />
      </DataTable>

      <h2 class="text-lg font-bold mb-2">
        {{ t('settings.users.pendingInvites') }} ({{ pending.length }})
      </h2>
      <DataTable :value="pending" striped-rows>
        <Column field="fullName" :header="t('auth.fields.fullName')" />
        <Column field="email" :header="t('auth.fields.email')" />
        <Column field="expiresAt" :header="t('settings.users.expiresAt')" />
      </DataTable>
    </template>

    <Dialog
      v-model:visible="dialogVisible"
      :header="t('settings.users.invite')"
      :style="{ width: '24rem' }"
    >
      <div class="flex flex-col gap-3">
        <InputText
          v-model="inviteForm.fullName"
          :placeholder="t('auth.fields.fullName')"
          data-test="invite-name"
        />
        <InputText
          v-model="inviteForm.email"
          :placeholder="t('auth.fields.email')"
          data-test="invite-email"
        />
        <Message v-if="inviteError" severity="error">{{ inviteError }}</Message>
        <Button
          :label="t('settings.users.invite')"
          :loading="inviting"
          data-test="invite-submit"
          @click="submitInvite"
        />
      </div>
    </Dialog>
  </div>
</template>
