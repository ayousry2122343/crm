import { api as http } from './client';
import type { Deal } from './deals';
import type { Product } from './products';

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  productId?: string;
  product?: Product;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  total: number;
  sortOrder: number;
}

export interface Quote {
  id: string;
  workspaceId: string;
  number: string;
  dealId?: string;
  deal?: Deal;
  contactId?: string;
  contact?: { id: string; fullName: string; email?: string };
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  validUntil?: string;
  subtotal: number;
  discountPct: number;
  discountAmt: number;
  taxPct: number;
  taxAmt: number;
  total: number;
  currency: string;
  notes?: string;
  sentAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  lineItems: QuoteLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface QuoteListResponse {
  items: Quote[];
  nextCursor: string | null;
}

export interface LineItemInput {
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct?: number;
}

export interface CreateQuoteInput {
  dealId?: string;
  contactId?: string;
  currency?: string;
  validUntil?: string;
  discountPct?: number;
  taxPct?: number;
  notes?: string;
  lineItems: LineItemInput[];
}

export const quotesApi = {
  list: (params?: { dealId?: string; status?: string; cursor?: string; limit?: number }) =>
    http.get<QuoteListResponse>('/quotes', { params }).then((r) => r.data),

  get: (id: string) =>
    http.get<Quote>(`/quotes/${id}`).then((r) => r.data),

  create: (data: CreateQuoteInput) =>
    http.post<Quote>('/quotes', data).then((r) => r.data),

  update: (id: string, data: Partial<CreateQuoteInput>) =>
    http.patch<Quote>(`/quotes/${id}`, data).then((r) => r.data),

  send: (id: string) =>
    http.post<Quote>(`/quotes/${id}/send`).then((r) => r.data),

  accept: (id: string) =>
    http.post<Quote>(`/quotes/${id}/accept`).then((r) => r.data),

  reject: (id: string) =>
    http.post<Quote>(`/quotes/${id}/reject`).then((r) => r.data),

  archive: (id: string) =>
    http.delete(`/quotes/${id}`).then((r) => r.data),
};
