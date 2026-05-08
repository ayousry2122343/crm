import { api as http } from './client';

export interface BlogCategory {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface Blog {
  id: string;
  workspaceId: string;
  title: string;
  slug: string;
  body: string;
  authorId: string;
  author?: { id: string; fullName: string };
  status: 'DRAFT' | 'PUBLISHED';
  publishedAt?: string;
  tags: string[];
  metaDescription?: string;
  categoryId?: string;
  category?: BlogCategory;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogWithHtml extends Blog {
  bodyHtml: string;
}

export interface BlogListResponse {
  items: Blog[];
  nextCursor: string | null;
}

export interface BlogListParams {
  status?: 'DRAFT' | 'PUBLISHED';
  categoryId?: string;
  search?: string;
  cursor?: string;
  limit?: number;
  sort?: string;
}

export const blogsApi = {
  list: (params?: BlogListParams) =>
    http.get<BlogListResponse>('/blogs', { params }).then((r) => r.data),

  get: (id: string) =>
    http.get<Blog>(`/blogs/${id}`).then((r) => r.data),

  getBySlug: (slug: string) =>
    http.get<Blog>(`/blogs/slug/${slug}`).then((r) => r.data),

  render: (id: string) =>
    http.get<BlogWithHtml>(`/blogs/${id}/render`).then((r) => r.data),

  create: (data: Partial<Blog>) =>
    http.post<Blog>('/blogs', data).then((r) => r.data),

  update: (id: string, data: Partial<Blog>) =>
    http.patch<Blog>(`/blogs/${id}`, data).then((r) => r.data),

  publish: (id: string) =>
    http.post<Blog>(`/blogs/${id}/publish`).then((r) => r.data),

  unpublish: (id: string) =>
    http.post<Blog>(`/blogs/${id}/unpublish`).then((r) => r.data),

  archive: (id: string) =>
    http.delete(`/blogs/${id}`).then((r) => r.data),

  listCategories: () =>
    http.get<BlogCategory[]>('/blogs/categories').then((r) => r.data),

  createCategory: (data: { name: string }) =>
    http.post<BlogCategory>('/blogs/categories', data).then((r) => r.data),
};
