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
        {
          path: 'people',
          name: 'people',
          component: () => import('@/views/people/PeopleList.vue'),
        },
        {
          path: 'people/:id',
          name: 'person-detail',
          component: () => import('@/views/people/PersonDetail.vue'),
          props: true,
        },
        {
          path: 'companies',
          name: 'companies',
          component: () => import('@/views/people/PeopleList.vue'),
          props: { isCompany: true },
        },
        {
          path: 'companies/:id',
          name: 'company-detail',
          component: () => import('@/views/people/PersonDetail.vue'),
          props: (route) => ({ id: route.params.id, isCompany: true }),
        },
        {
          path: 'lists',
          name: 'lists',
          component: () => import('@/views/lists/ListsIndex.vue'),
        },
        {
          path: 'lists/:id',
          name: 'list-detail',
          component: () => import('@/views/lists/ListEditor.vue'),
          props: true,
        },
        {
          path: 'deals',
          name: 'deals-kanban',
          component: () => import('@/views/deals/DealsKanban.vue'),
        },
        {
          path: 'deals/list',
          name: 'deals-list',
          component: () => import('@/views/deals/DealsList.vue'),
        },
        {
          path: 'deals/:id',
          name: 'deal-detail',
          component: () => import('@/views/deals/DealDetail.vue'),
          props: true,
        },
        {
          path: 'settings/pipelines',
          name: 'settings-pipelines',
          component: () => import('@/views/settings/Pipelines.vue'),
        },
        {
          path: 'settings/won-lost-reasons',
          name: 'settings-won-lost-reasons',
          component: () => import('@/views/settings/WonLostReasons.vue'),
        },
        {
          path: 'calendar',
          name: 'calendar',
          component: () => import('@/views/activities/ActivityCalendar.vue'),
        },
        {
          path: 'settings/email-templates',
          name: 'settings-email-templates',
          component: () => import('@/views/settings/EmailTemplates.vue'),
        },
        {
          path: 'forms',
          name: 'forms',
          component: () => import('@/views/forms/FormsIndex.vue'),
        },
        {
          path: 'forms/:id',
          name: 'form-editor',
          component: () => import('@/views/forms/FormEditor.vue'),
          props: true,
        },
        {
          path: 'automation/workflows',
          name: 'workflows',
          component: () => import('@/views/automation/WorkflowsIndex.vue'),
        },
        {
          path: 'automation/workflows/:id',
          name: 'workflow-editor',
          component: () => import('@/views/automation/WorkflowEditor.vue'),
          props: true,
        },
        {
          path: 'automation/webhooks',
          name: 'webhooks',
          component: () => import('@/views/automation/WebhooksAdmin.vue'),
        },
        {
          path: 'settings/products',
          name: 'settings-products',
          component: () => import('@/views/settings/Products.vue'),
        },
        {
          path: 'settings/pricebooks',
          name: 'settings-pricebooks',
          component: () => import('@/views/settings/Pricebooks.vue'),
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/reports/ReportsIndex.vue'),
        },
        {
          path: 'dashboards',
          name: 'dashboards',
          component: () => import('@/views/dashboards/DashboardsIndex.vue'),
        },
        {
          path: 'dashboards/:id',
          name: 'dashboard-editor',
          component: () => import('@/views/dashboards/DashboardEditor.vue'),
          props: true,
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
