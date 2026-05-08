<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import InputSwitch from 'primevue/inputswitch';
import { productsApi, type Product, type ProductCategory } from '@/api/products';

const { t } = useI18n();

const products = ref<Product[]>([]);
const categories = ref<ProductCategory[]>([]);
const loading = ref(true);
const showCreate = ref(false);
const showEdit = ref(false);
const saving = ref(false);
const showCategoryDialog = ref(false);
const newCategoryName = ref('');

const form = ref({
  name: '',
  labelAr: '',
  labelEn: '',
  sku: '',
  description: '',
  unitPrice: 0,
  currency: 'EGP',
  isActive: true,
  categoryId: null as string | null,
});

const editId = ref('');

function resetForm() {
  form.value = {
    name: '',
    labelAr: '',
    labelEn: '',
    sku: '',
    description: '',
    unitPrice: 0,
    currency: 'EGP',
    isActive: true,
    categoryId: null,
  };
  editId.value = '';
}

async function load() {
  loading.value = true;
  try {
    const [prodRes, catRes] = await Promise.all([
      productsApi.list(),
      productsApi.listCategories(),
    ]);
    products.value = prodRes.items;
    categories.value = catRes;
  } finally {
    loading.value = false;
  }
}

async function handleCreate() {
  if (!form.value.name.trim()) return;
  saving.value = true;
  try {
    await productsApi.create({
      name: form.value.name.trim(),
      labelAr: form.value.labelAr || undefined,
      labelEn: form.value.labelEn || undefined,
      sku: form.value.sku || undefined,
      description: form.value.description || undefined,
      unitPrice: form.value.unitPrice,
      currency: form.value.currency,
      isActive: form.value.isActive,
      categoryId: form.value.categoryId || undefined,
    } as any);
    showCreate.value = false;
    resetForm();
    await load();
  } finally {
    saving.value = false;
  }
}

function openEdit(product: Product) {
  editId.value = product.id;
  form.value = {
    name: product.name,
    labelAr: product.labelAr ?? '',
    labelEn: product.labelEn ?? '',
    sku: product.sku ?? '',
    description: product.description ?? '',
    unitPrice: Number(product.unitPrice),
    currency: product.currency,
    isActive: product.isActive,
    categoryId: product.categoryId ?? null,
  };
  showEdit.value = true;
}

async function handleUpdate() {
  saving.value = true;
  try {
    await productsApi.update(editId.value, {
      name: form.value.name.trim(),
      labelAr: form.value.labelAr || undefined,
      labelEn: form.value.labelEn || undefined,
      sku: form.value.sku || undefined,
      description: form.value.description || undefined,
      unitPrice: form.value.unitPrice,
      currency: form.value.currency,
      isActive: form.value.isActive,
      categoryId: form.value.categoryId || undefined,
    } as any);
    showEdit.value = false;
    resetForm();
    await load();
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id: string) {
  await productsApi.archive(id);
  await load();
}

async function handleCreateCategory() {
  if (!newCategoryName.value.trim()) return;
  await productsApi.createCategory({ name: newCategoryName.value.trim() });
  newCategoryName.value = '';
  showCategoryDialog.value = false;
  const catRes = await productsApi.listCategories();
  categories.value = catRes;
}

onMounted(load);
</script>

<template>
  <div data-test="products-admin-page">
    <div class="flex items-center justify-between mb-4">
      <h1 class="text-2xl font-bold">{{ t('products.title') }}</h1>
      <div class="flex gap-2">
        <Button
          :label="t('products.addCategory')"
          icon="pi pi-tag"
          severity="secondary"
          data-test="add-category-btn"
          @click="showCategoryDialog = true"
        />
        <Button
          :label="t('products.addProduct')"
          icon="pi pi-plus"
          data-test="add-product-btn"
          @click="showCreate = true"
        />
      </div>
    </div>

    <DataTable
      :value="products"
      :loading="loading"
      striped-rows
      data-test="products-table"
    >
      <Column field="name" :header="t('products.name')" sortable />
      <Column field="sku" :header="t('products.sku')" sortable />
      <Column field="unitPrice" :header="t('products.unitPrice')" sortable>
        <template #body="{ data }">
          {{ Number(data.unitPrice).toLocaleString() }} {{ data.currency }}
        </template>
      </Column>
      <Column :header="t('products.category')">
        <template #body="{ data }">
          <Tag v-if="data.category" :value="data.category.name" />
          <span v-else class="text-slate-400">—</span>
        </template>
      </Column>
      <Column :header="t('products.status')">
        <template #body="{ data }">
          <Tag
            :value="data.isActive ? t('products.active') : t('products.inactive')"
            :severity="data.isActive ? 'success' : 'danger'"
          />
        </template>
      </Column>
      <Column :header="t('common.actions')">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              icon="pi pi-pencil"
              severity="secondary"
              size="small"
              text
              data-test="edit-product-btn"
              @click="openEdit(data)"
            />
            <Button
              icon="pi pi-trash"
              severity="danger"
              size="small"
              text
              data-test="delete-product-btn"
              @click="handleDelete(data.id)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Create Dialog -->
    <Dialog
      v-model:visible="showCreate"
      :header="t('products.addProduct')"
      modal
      class="w-full max-w-lg"
    >
      <div class="flex flex-col gap-4">
        <InputText v-model="form.name" :placeholder="t('products.name')" class="w-full" data-test="product-name-input" />
        <div class="grid grid-cols-2 gap-4">
          <InputText v-model="form.labelAr" :placeholder="t('products.labelAr')" />
          <InputText v-model="form.labelEn" :placeholder="t('products.labelEn')" />
        </div>
        <InputText v-model="form.sku" :placeholder="t('products.sku')" />
        <Textarea v-model="form.description" :placeholder="t('products.description')" rows="3" class="w-full" />
        <div class="grid grid-cols-2 gap-4">
          <InputNumber v-model="form.unitPrice" :placeholder="t('products.unitPrice')" :min-fraction-digits="2" />
          <InputText v-model="form.currency" :placeholder="t('common.currency')" />
        </div>
        <Select
          v-model="form.categoryId"
          :options="categories"
          option-label="name"
          option-value="id"
          :placeholder="t('products.selectCategory')"
          show-clear
          class="w-full"
        />
        <div class="flex items-center gap-2">
          <InputSwitch v-model="form.isActive" />
          <span>{{ t('products.active') }}</span>
        </div>
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showCreate = false" />
          <Button :label="t('common.save')" :loading="saving" data-test="save-product-btn" @click="handleCreate" />
        </div>
      </div>
    </Dialog>

    <!-- Edit Dialog -->
    <Dialog
      v-model:visible="showEdit"
      :header="t('products.editProduct')"
      modal
      class="w-full max-w-lg"
    >
      <div class="flex flex-col gap-4">
        <InputText v-model="form.name" :placeholder="t('products.name')" class="w-full" />
        <div class="grid grid-cols-2 gap-4">
          <InputText v-model="form.labelAr" :placeholder="t('products.labelAr')" />
          <InputText v-model="form.labelEn" :placeholder="t('products.labelEn')" />
        </div>
        <InputText v-model="form.sku" :placeholder="t('products.sku')" />
        <Textarea v-model="form.description" :placeholder="t('products.description')" rows="3" class="w-full" />
        <div class="grid grid-cols-2 gap-4">
          <InputNumber v-model="form.unitPrice" :placeholder="t('products.unitPrice')" :min-fraction-digits="2" />
          <InputText v-model="form.currency" :placeholder="t('common.currency')" />
        </div>
        <Select
          v-model="form.categoryId"
          :options="categories"
          option-label="name"
          option-value="id"
          :placeholder="t('products.selectCategory')"
          show-clear
          class="w-full"
        />
        <div class="flex items-center gap-2">
          <InputSwitch v-model="form.isActive" />
          <span>{{ t('products.active') }}</span>
        </div>
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showEdit = false" />
          <Button :label="t('common.save')" :loading="saving" @click="handleUpdate" />
        </div>
      </div>
    </Dialog>

    <!-- Category Dialog -->
    <Dialog
      v-model:visible="showCategoryDialog"
      :header="t('products.addCategory')"
      modal
      class="w-full max-w-sm"
    >
      <div class="flex flex-col gap-4">
        <InputText v-model="newCategoryName" :placeholder="t('products.categoryName')" class="w-full" data-test="category-name-input" />
        <div class="flex gap-2 justify-end">
          <Button :label="t('common.cancel')" severity="secondary" @click="showCategoryDialog = false" />
          <Button :label="t('common.save')" data-test="save-category-btn" @click="handleCreateCategory" />
        </div>
      </div>
    </Dialog>
  </div>
</template>
