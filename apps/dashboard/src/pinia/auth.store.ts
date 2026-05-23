import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, type AuthUser, type AuthWorkspace, type TwoFactorChallenge } from '../api/auth';
import { clearTokens, setTokens, getRefreshToken } from '../api/client';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const workspace = ref<AuthWorkspace | null>(null);
  const refreshToken = ref<string | null>(null);

  const isAuthenticated = computed(() => user.value !== null);

  async function signUp(payload: {
    email: string;
    password: string;
    fullName: string;
    workspaceName: string;
  }): Promise<void> {
    const r = await authApi.signUp(payload);
    user.value = r.user;
    workspace.value = r.workspace;
    refreshToken.value = r.refreshToken;
    setTokens(r.accessToken, r.refreshToken);
  }

  async function login(payload: {
    email: string;
    password: string;
    workspaceSlug: string;
  }): Promise<TwoFactorChallenge | void> {
    const r = await authApi.login(payload);
    if ('requiresTwoFactor' in r && r.requiresTwoFactor) {
      return r;
    }
    user.value = r.user;
    workspace.value = r.workspace;
    refreshToken.value = r.refreshToken;
    setTokens(r.accessToken, r.refreshToken);
  }

  async function logout(): Promise<void> {
    const rt = getRefreshToken();
    if (rt) {
      try {
        await authApi.logout(rt);
      } catch {
        /* ignore — best effort */
      }
    }
    user.value = null;
    workspace.value = null;
    refreshToken.value = null;
    clearTokens();
  }

  async function fetchMe(): Promise<void> {
    const me = await authApi.me();
    user.value = {
      id: me.userId,
      email: me.email,
      fullName: me.fullName,
      workspaceId: me.workspaceId,
    };
  }

  async function requestPasswordReset(payload: {
    workspaceSlug: string;
    email: string;
  }): Promise<{ ok: true }> {
    return authApi.requestPasswordReset(payload);
  }

  async function confirmPasswordReset(payload: {
    token: string;
    newPassword: string;
  }): Promise<{ ok: true }> {
    return authApi.confirmPasswordReset(payload);
  }

  function setAuthFromTokens(payload: {
    user: AuthUser;
    workspace: AuthWorkspace;
    accessToken: string;
    refreshToken: string;
  }): void {
    user.value = payload.user;
    workspace.value = payload.workspace;
    refreshToken.value = payload.refreshToken;
    setTokens(payload.accessToken, payload.refreshToken);
  }

  return {
    user,
    workspace,
    refreshToken,
    isAuthenticated,
    signUp,
    login,
    logout,
    fetchMe,
    requestPasswordReset,
    confirmPasswordReset,
    setAuthFromTokens,
  };
});
