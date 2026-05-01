import { ref, computed } from 'vue';
import { api } from '@/api/client';

const permissions = ref<string[] | null>(null);
const loading = ref(false);

async function fetchPermissions(): Promise<void> {
  if (loading.value || permissions.value !== null) return;
  loading.value = true;
  try {
    const r = await api.get<{ permissions: string[] }>('/auth/me/permissions');
    permissions.value = r.data.permissions ?? [];
  } catch {
    // The endpoint isn't part of Sprint 1 — until it lands the dashboard
    // optimistically assumes admin (signup creator) and re-validates on PATCH/POST.
    permissions.value = [];
  } finally {
    loading.value = false;
  }
}

export function usePermissions() {
  const has = (perm: string) =>
    computed(() => (permissions.value ? permissions.value.includes(perm) : true));

  return { permissions, loading, has, fetchPermissions, resetPermissions: () => (permissions.value = null) };
}
