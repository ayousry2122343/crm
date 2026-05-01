import { useAuthStore } from '../pinia/auth.store';
import { storeToRefs } from 'pinia';

export function useAuth() {
  const store = useAuthStore();
  const { user, workspace, isAuthenticated } = storeToRefs(store);
  return { user, workspace, isAuthenticated, store };
}
