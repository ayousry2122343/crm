<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import InputSwitch from 'primevue/inputswitch';
import { pricebooksApi, type Pricebook, type PricebookDetail, type PricebookEntry } from '@/api/pricebooks';
import { productsApi, type Product } from '@/api/products';

const { t } = useI18n();

const pricebooks = ref<Pricebook[]>([]);
const products = ref<Product[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const saving = ref(false);

const newPb = ref({ name: '', currency: 'EGP', isDefault: false });

const selectedPb = ref<PricebookDetail | null>(null);
const showDetail = ref(false);
const showAddEntry = ref(false);
const entryForm = ref({ productId: '', unitPrice: 0, minQty: 1 });

async function load() {
  loading.value = true;
  try {
    const [pbRes, prodRes] = await Promise.all([
      pricebooksApi.list(),
      productsApi.list({ isActive: true, limit: 200 }),
    ]);
    pricebooks.value = pbRes;
    products.value = prodRes.items;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  if (!newPb.value.name.trim()) return;
  saving.value = true;
  try {
    await pricebooksApi.create({
      name: newPb.value.name.trim(),
      currency: newPb.value.currency,
      isDefault: newPb.value.isDefault,
    });
    showCreate.value = false;
    newPb.value = { name: '', currency: 'EGP', isDefault: false };
    await load();
  } finally {
    saving.value = false;
  }
}

async function openDetail(pb: Pricebook) {
  const detail = await pricebooksApi.get(pb.id);
  selectedPb.value = detail;
  showDetail.value = true;
}

async function handleAddEntry() {
  if (!selectedPb.value || !entryForm.value.productId) return;
  saving.value = true;
  try {
    await pricebooksApi.setEntry(selectedPb.value.id, {
      productId: entryForm.value.productId,
      unitPrice: entryForm.value.unitPrice,
      minQty: entryForm.value.minQty,
    });
    showAddEntry.value = false;
    entryForm.value = { productId: '', unitPrice: 0, minQty: 1 };
    const detail = await pricebooksApi.get(selectedPb.value.id);
    selectedPb.value = detail;
  } finally {
    saving.value = false;
  }
}

async function handleRemoveEntry(entryId: string) {
  if (!selectedPb.value) return;
  await pricebooksApi.removeEntry(entryId);
  const detail = await pricebooksApi.get(selectedPb.value.id);
  selectedPb.value = detail;
}

async function handleDeletePricebook(id: string) {
  await pricebooksApi.archive(id);
  await load();
}

onMounted(load);
</script>

<template>
  <div data-test="pricebooks-admin-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('pricebooks.title') }}</h1>
      <Button
        :label="t('pricebooks.addPricebook')"
        icon="pi pi-plus"
        data-test="add-pricebook-btn"
        @click="showCreate = true"
      />
    </div>

    <DataTable
      :value="pricebooks"
      :loading="loading"
      striped-rows
      data-test="pricebooks-table"
    >
      <Column field="name" :header="t('pricebooks.name')" sortable />
      <Column field="currency" :header="t('common.currency')" />
      <Column :header="t('pricebooks.entries')">
        <template #body="{ data }">
          {{ data._count?.entries ?? 0 }}
        </template>
      </Column>
      <Column :header="t('products.status')">
        <template #body="{ data }">
          <Tag v-if="data.isDefault" value="Default" severity="success" />
        </template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-eye"
              severity="secondary"
              size="small"
              text
              data-test="view-pricebook-btn"
              @click="openDetail(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              size="small"
              text
              data-test="delete-pricebook-btn"
              @click="handleDeletePricebook(data.id)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create Pricebook Dialog -->
    <Dialog
      v-model:visible="showCreate"
      :header="t('pricebooks.addPricebook')"
      modal
      class="w-full max-w-sm"
    >
      <div class="flex flex-col gap-4">
        <InputText v-model="newPb.name" :placeholder="t('pricebooks.name')" class="w-full" data-test="pricebook-name-input" />
        <InputText v-model="newPb.currency" :placeholder="t('common.currency')" class="w-full" />
        <div class="flex items-center gap-2">
          <InputSwitch v-model="newPb.isDefault" />
          <span>{{ t('pricebooks.default') }}</span>
        </div>
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showCreate = false" />
          <Button :label="t('common.save')" :loading="saving" data-test="save-pricebook-btn" @click="handleCreate" />
        </div>
      </div>
    </Dialog>

    <!-- Pricebook Detail Dialog -->
    <Dialog
      v-model:visible="showDetail"
      :header="selectedPb?.name ?? ''"
      modal
      class="w-full max-w-2xl"
    >
      <template v-if="selectedPb">
        <div class="flex items-center justify-between mb-4">
          <span class="text-sm text-slate-500">
            {{ t('common.currency') }}: {{ selectedPb.currency }}
          </span>
          <Button
            :label="t('pricebooks.addEntry')"
            icon="pi pi-plus"
            size="small"
            data-test="add-entry-btn"
            @click="showAddEntry = true"
          />
        </div>

        <DataTable :value="selectedPb.entries" striped-rows data-test="entries-table">
          <Column :header="t('products.name')">
            <template #body="{ data }">
              {{ data.product?.name ?? data.productId }}
            </template>
          </Column>
          <Column field="unitPrice" :header="t('products.unitPrice')">
            <template #body="{ data }">
              {{ Number(data.unitPrice).toLocaleString() }}
            </template>
          </Column>
          <Column field="minQty" :header="t('pricebooks.minQty')" />
          <Column :header="t('common.actions')">
            <template #body="{ data }">
              <Button
                icon="pi pi-trash"
                severity="danger"
                size="small"
                text
                data-test="remove-entry-btn"
                @click="handleRemoveEntry(data.id)"
              />
            </template>
          </Column>
        </DataTable>
      </template>
    </Dialog>

    <!-- Add Entry Dialog -->
    <Dialog
      v-model:visible="showAddEntry"
      :header="t('pricebooks.addEntry')"
      modal
      class="w-full max-w-sm"
    >
      <div class="flex flex-col gap-4">
        <Select
          v-model="entryForm.productId"
          :options="products"
          option-label="name"
          option-value="id"
          :placeholder="t('pricebooks.selectProduct')"
          class="w-full"
          data-test="entry-product-select"
        />
        <InputNumber
          v-model="entryForm.unitPrice"
          :placeholder="t('products.unitPrice')"
          :min-fraction-digits="2"
        />
        <InputNumber
          v-model="entryForm.minQty"
          :placeholder="t('pricebooks.minQty')"
          :min="1"
        />
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showAddEntry = false" />
          <Button :label="t('common.save')" :loading="saving" data-test="save-entry-btn" @click="handleAddEntry" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
