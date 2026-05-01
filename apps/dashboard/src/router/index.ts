import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/pinia/auth.store';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: { name: 'dashboard' },
    },
    {
      path: '/',
      component: () => import('@/layouts/AuthLayout.vue'),
      meta: { public: true },
      children: [
        {
          path: 'sign-up',
          name: 'sign-up',
          component: () => import('@/views/auth/SignUp.vue'),
          meta: { public: true },
        },
        {
          path: 'login',
          name: 'login',
          component: () => import('@/views/auth/Login.vue'),
          meta: { public: true },
        },
        {
          path: 'forgot-password',
          name: 'forgot-password',
          component: () => import('@/views/auth/PasswordResetRequest.vue'),
          meta: { public: true },
        },
        {
          path: 'reset-password',
          name: 'reset-password',
          component: () => import('@/views/auth/PasswordResetConfirm.vue'),
          meta: { public: true },
        },
        {
          path: 'accept-invite',
          name: 'accept-invite',
          component: () => import('@/views/auth/AcceptInvite.vue'),
          meta: { public: true },
        },
      ],
    },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/Dashboard.vue'),
        },
        {
          path: 'settings/workspace',
          name: 'settings-workspace',
          component: () => import('@/views/settings/Workspace.vue'),
        },
        {
          path: 'settings/users',
          name: 'settings-users',
          component: () => import('@/views/settings/Users.vue'),
        },
        {
          path: 'settings/custom-fields',
          name: 'settings-custom-fields',
          component: () => import('@/views/settings/CustomFields.vue'),
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  if (to.meta.public) return true;
  if (!auth.isAuthenticated) {
    try {
      await auth.fetchMe();
    } catch {
      return { name: 'login' };
    }
  }
  return true;
});
