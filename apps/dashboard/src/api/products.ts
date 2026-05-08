import { api as http } from './client';

export interface ProductCategory {
  id: string;
  workspaceId: string;
  name: string;
  labelAr?: string;
  labelEn?: string;
  parentId?: string;
  children?: ProductCategory[];
  createdAt: string;
}

export interface Product {
  id: string;
  workspaceId: string;
  name: string;
  labelAr?: string;
  labelEn?: string;
  sku?: string;
  description?: string;
  unitPrice: number;
  currency: string;
  isActive: boolean;
  categoryId?: string;
  category?: ProductCategory;
  customFields: Record<string, unknown>;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductListResponse {
  items: Product[];
  nextCursor: string | null;
}

export interface ProductListParams {
  categoryId?: string;
  isActive?: boolean;
  search?: string;
  cursor?: string;
  limit?: number;
  sort?: string;
}

export const productsApi = {
  list: (params?: ProductListParams) =>
    http.get<ProductListResponse>('/products', { params }).then((r) => r.data),

  get: (id: string) =>
    http.get<Product>(`/products/${id}`).then((r) => r.data),

  create: (data: Partial<Product>) =>
    http.post<Product>('/products', data).then((r) => r.data),

  update: (id: string, data: Partial<Product>) =>
    http.patch<Product>(`/products/${id}`, data).then((r) => r.data),

  archive: (id: string) =>
    http.delete(`/products/${id}`).then((r) => r.data),

  listCategories: () =>
    http.get<ProductCategory[]>('/products/categories').then((r) => r.data),

  createCategory: (data: { name: string; labelAr?: string; labelEn?: string; parentId?: string }) =>
    http.post<ProductCategory>('/products/categories', data).then((r) => r.data),
};
