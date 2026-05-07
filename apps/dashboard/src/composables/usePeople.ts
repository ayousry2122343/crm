import { ref, reactive, computed, watch } from 'vue';
import { peopleApi, type Person, type PersonListResponse } from '@/api/people';

export type PeopleFilters = {
  isCompany?: boolean;
  lifecycleStage?: string;
  ownerId?: string;
  search?: string;
};

export function usePeople(defaultFilters: PeopleFilters = {}) {
  const items = ref<Person[]>([]);
  const loading = ref(false);
  const error = ref<unknown>(null);
  const nextCursor = ref<string | undefined>();
  const hasMore = computed(() => !!nextCursor.value);
  const filters = reactive<PeopleFilters>({ ...defaultFilters });
  const sort = ref<string>('-createdAt');
  const selected = ref<Person[]>([]);

  async function fetch(append = false) {
    loading.value = true;
    error.value = null;
    try {
      const params: Record<string, unknown> = {
        limit: 50,
        sort: sort.value,
      };
      if (append && nextCursor.value) params.cursor = nextCursor.value;
      if (filters.isCompany !== undefined) params.isCompany = filters.isCompany;
      if (filters.lifecycleStage) params.lifecycleStage = filters.lifecycleStage;
      if (filters.ownerId) params.ownerId = filters.ownerId;
      if (filters.search) params.search = filters.search;

      const res: PersonListResponse = await peopleApi.list(params);
      if (append) {
        items.value = [...items.value, ...res.items];
      } else {
        items.value = res.items;
      }
      nextCursor.value = res.nextCursor;
    } catch (e) {
      error.value = e;
    } finally {
      loading.value = false;
    }
  }

  function loadMore() {
    if (hasMore.value && !loading.value) return fetch(true);
  }

  function setSort(s: string) {
    sort.value = s;
    return fetch();
  }

  async function archiveSelected() {
    const ids = selected.value.map((p) => p.id);
    await Promise.all(ids.map((id) => peopleApi.archive(id)));
    selected.value = [];
    return fetch();
  }

  watch(
    () => ({ ...filters }),
    () => fetch(),
    { deep: true },
  );

  return {
    items,
    loading,
    error,
    filters,
    sort,
    selected,
    hasMore,
    fetch,
    loadMore,
    setSort,
    archiveSelected,
  };
}
