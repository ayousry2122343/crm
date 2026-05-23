import { api as http } from './client';

export interface KBCategory {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  order: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { articles: number };
}

export interface KBArticle {
  id: string;
  workspaceId: string;
  categoryId: string | null;
  category: KBCategory | null;
  title: string;
  slug: string;
  content: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  publishedAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateKBCategoryInput {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  order?: number;
}

export interface CreateKBArticleInput {
  title: string;
  slug: string;
  content: string;
  categoryId?: string;
  status?: 'DRAFT' | 'PUBLISHED';
}

export interface UpdateKBArticleInput {
  title?: string;
  slug?: string;
  content?: string;
  categoryId?: string;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export interface KBArticleListResponse {
  items: KBArticle[];
  nextCursor: string | null;
}

export const kbApi = {
  listCategories: () =>
    http.get<KBCategory[]>('/kb/categories').then((r) => r.data),
  createCategory: (data: CreateKBCategoryInput) =>
    http.post<KBCategory>('/kb/categories', data).then((r) => r.data),
  updateCategory: (id: string, data: Partial<CreateKBCategoryInput>) =>
    http.patch<KBCategory>(`/kb/categories/${id}`, data).then((r) => r.data),
  archiveCategory: (id: string) =>
    http.delete(`/kb/categories/${id}`).then((r) => r.data),

  listArticles: (params?: Record<string, any>) =>
    http.get<KBArticleListResponse>('/kb/articles', { params }).then((r) => r.data),
  getArticle: (id: string) =>
    http.get<KBArticle>(`/kb/articles/${id}`).then((r) => r.data),
  createArticle: (data: CreateKBArticleInput) =>
    http.post<KBArticle>('/kb/articles', data).then((r) => r.data),
  updateArticle: (id: string, data: UpdateKBArticleInput) =>
    http.patch<KBArticle>(`/kb/articles/${id}`, data).then((r) => r.data),
  archiveArticle: (id: string) =>
    http.delete(`/kb/articles/${id}`).then((r) => r.data),
  feedback: (id: string, helpful: boolean) =>
    http.post(`/kb/articles/${id}/feedback`, { helpful }).then((r) => r.data),
};
