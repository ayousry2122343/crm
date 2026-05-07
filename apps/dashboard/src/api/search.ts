import { api } from './client';

export type SearchResult = {
  id: string;
  entityType: string;
  title: string;
  subtitle?: string;
  highlight?: string;
};

export type SearchResponse = { items: SearchResult[] };

export const searchApi = {
  search: (q: string, types?: string[], limit?: number) =>
    api
      .get<SearchResponse>('/search', {
        params: {
          q,
          ...(types?.length ? { types: types.join(',') } : {}),
          ...(limit ? { limit } : {}),
        },
      })
      .then((r) => r.data),
};
