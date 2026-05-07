<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import Dialog from 'primevue/dialog';
import DynamicForm from '@/components/DynamicForm/DynamicForm.vue';
import { peopleApi, type Person } from '@/api/people';

const props = defineProps<{
  id: string;
  isCompany?: boolean;
}>();

const { t, locale } = useI18n();
const router = useRouter();

const person = ref<Person | null>(null);
const loading = ref(true);
const editMode = ref(false);
const saving = ref(false);

const displayName = computed(() => {
  if (!person.value) return '';
  return props.isCompany ? person.value.companyName : person.value.fullName;
});

const initials = computed(() => {
  const name = displayName.value ?? '';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
});

async function load() {
  loading.value = true;
  try {
    person.value = await peopleApi.get(props.id);
  } finally {
    loading.value = false;
  }
}

async function handleUpdate(data: Record<string, unknown>) {
  saving.value = true;
  try {
    person.value = await peopleApi.update(props.id, data as Partial<Person>);
    editMode.value = false;
  } finally {
    saving.value = false;
  }
}

function goBack() {
  router.push({ name: props.isCompany ? 'companies' : 'people' });
}

onMounted(load);
</script>

<template>
  <div data-test="person-detail-page">
    <div v-if="loading" class="text-slate-500" data-test="loading">
      {{ t('common.loading') }}
    </div>
    <template v-else-if="person">
      <!-- Record Header -->
      <div class="flex items-center gap-4 mb-6" data-test="record-header">
        <Button
          icon="pi pi-arrow-left"
          severity="secondary"
          text
          rounded
          data-test="back-btn"
          @click="goBack"
        />
        <div
          class="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold"
          data-test="avatar"
        >
          {{ initials }}
        </div>
        <div class="flex-1">
          <h1 class="text-2xl font-bold" data-test="display-name">{{ displayName }}</h1>
          <div class="text-sm text-slate-500">
            <span v-if="person.email">{{ person.email }}</span>
            <span v-if="person.email && person.phone" class="mx-2">|</span>
            <span v-if="person.phone">{{ person.phone }}</span>
          </div>
        </div>
        <Button
          :label="t('people.editRecord')"
          icon="pi pi-pencil"
          severity="secondary"
          data-test="edit-btn"
          @click="editMode = true"
        />
      </div>

      <!-- Tabs -->
      <TabView data-test="tabs">
        <TabPanel :header="t('people.overview')" value="overview">
          <div class="grid grid-cols-2 gap-4" data-test="overview-tab">
            <div>
              <span class="text-sm text-slate-500">{{ t('people.fullName') }}</span>
              <p>{{ person.fullName }}</p>
            </div>
            <div>
              <span class="text-sm text-slate-500">{{ t('people.email') }}</span>
              <p>{{ person.email ?? '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-slate-500">{{ t('people.phone') }}</span>
              <p>{{ person.phone ?? '—' }}</p>
            </div>
            <div>
              <span class="text-sm text-slate-500">{{ t('people.stage') }}</span>
              <p>{{ person.lifecycleStage }}</p>
            </div>
            <template v-if="isCompany">
              <div>
                <span class="text-sm text-slate-500">{{ t('people.industry') }}</span>
                <p>{{ person.industry ?? '—' }}</p>
              </div>
            </template>
            <template v-if="person.customFields && Object.keys(person.customFields).length">
              <div v-for="(val, key) in person.customFields" :key="String(key)">
                <span class="text-sm text-slate-500">{{ key }}</span>
                <p>{{ val ?? '—' }}</p>
              </div>
            </template>
          </div>
        </TabPanel>
        <TabPanel :header="t('people.activities')" value="activities">
          <p class="text-slate-500" data-test="activities-tab">
            {{ t('people.noActivities') }}
          </p>
        </TabPanel>
        <TabPanel :header="t('people.deals')" value="deals">
          <p class="text-slate-500" data-test="deals-tab">
            {{ t('people.noDeals') }}
          </p>
        </TabPanel>
        <TabPanel :header="t('people.files')" value="files">
          <p class="text-slate-500" data-test="files-tab">
            {{ t('people.noFiles') }}
          </p>
        </TabPanel>
        <TabPanel v-if="isCompany" :header="t('people.employees')" value="employees">
          <p class="text-slate-500" data-test="employees-tab">
            {{ t('people.noEmployees') }}
          </p>
        </TabPanel>
      </TabView>

      <!-- Edit Dialog -->
      <Dialog
        v-model:visible="editMode"
        :header="t('people.editRecord')"
        modal
        class="w-full max-w-xl"
        data-test="edit-dialog"
      >
        <DynamicForm
          :entity-type="isCompany ? 'Company' : 'Person'"
          :initial-values="person as Record<string, any>"
          :loading="saving"
          @submit="handleUpdate"
          @cancel="editMode = false"
        />
      </Dialog>
    </template>
  </div>
</template>
