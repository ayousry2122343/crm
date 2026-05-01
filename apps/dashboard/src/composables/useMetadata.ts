import { ref } from 'vue';
import { api } from '@/api/client';
import type { EntityDef } from '@/api/metadata';

const cache = new Map<string, EntityDef>();

export function useMetadata(entityType: string) {
  const data = ref<EntityDef | null>(cache.get(entityType) ?? null);
  const loading = ref(!data.value);
  const error = ref<unknown>(null);

  async function fetch(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      const r = await api.get<EntityDef>(`/metadata/${entityType}`);
      cache.set(entityType, r.data);
      data.value = r.data;
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  if (!data.value) {
    fetch();
  }

  return { data, loading, error, refetch: fetch };
}

export function invalidateMetadata(entityType?: string): void {
  if (entityType) cache.delete(entityType);
  else cache.clear();
}
