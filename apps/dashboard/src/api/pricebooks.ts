import { api as http } from './client';
import type { Product } from './products';

export interface Pricebook {
  id: string;
  workspaceId: string;
  name: string;
  isDefault: boolean;
  currency: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { entries: number };
}

export interface PricebookEntry {
  id: string;
  pricebookId: string;
  productId: string;
  product?: Product;
  unitPrice: number;
  minQty: number;
  createdAt: string;
  updatedAt: string;
}

export interface PricebookDetail extends Pricebook {
  entries: PricebookEntry[];
}

export const pricebooksApi = {
  list: () =>
    http.get<Pricebook[]>('/pricebooks').then((r) => r.data),

  get: (id: string) =>
    http.get<PricebookDetail>(`/pricebooks/${id}`).then((r) => r.data),

  create: (data: { name: string; currency?: string; isDefault?: boolean }) =>
    http.post<Pricebook>('/pricebooks', data).then((r) => r.data),

  update: (id: string, data: Partial<Pricebook>) =>
    http.patch<Pricebook>(`/pricebooks/${id}`, data).then((r) => r.data),

  archive: (id: string) =>
    http.delete(`/pricebooks/${id}`).then((r) => r.data),

  setEntry: (pricebookId: string, data: { productId: string; unitPrice: number; minQty?: number }) =>
    http.post<PricebookEntry>(`/pricebooks/${pricebookId}/entries`, data).then((r) => r.data),

  removeEntry: (entryId: string) =>
    http.delete(`/pricebooks/entries/${entryId}`).then((r) => r.data),
};
