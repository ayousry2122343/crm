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
        {
          path: 'two-factor',
          name: 'two-factor-verify',
          component: () => import('@/views/auth/TwoFactorVerify.vue'),
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
          path: 'settings/api-keys',
          name: 'settings-api-keys',
          component: () => import('@/views/settings/ApiKeysSettings.vue'),
        },
        {
          path: 'settings/currency',
          name: 'settings-currency',
          component: () => import('@/views/settings/CurrencySettings.vue'),
        },
        {
          path: 'settings/branding',
          name: 'settings-branding',
          component: () => import('@/views/settings/BrandingSettings.vue'),
        },
        {
          path: 'settings/channels',
          name: 'settings-channels',
          component: () => import('@/views/settings/ChannelSettings.vue'),
        },
        {
          path: 'conversations',
          name: 'conversations',
          component: () => import('@/views/conversations/ConversationsInbox.vue'),
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
          path: 'settings/email-accounts',
          name: 'settings-email-accounts',
          component: () => import('@/views/settings/EmailAccounts.vue'),
        },
        {
          path: 'settings/portal',
          name: 'settings-portal',
          component: () => import('@/views/settings/PortalSettings.vue'),
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
          path: 'quotes',
          name: 'quotes',
          component: () => import('@/views/quotes/QuotesList.vue'),
        },
        {
          path: 'quotes/new',
          name: 'quote-builder',
          component: () => import('@/views/quotes/QuoteBuilder.vue'),
        },
        {
          path: 'quotes/:id',
          name: 'quote-detail',
          component: () => import('@/views/quotes/QuoteDetail.vue'),
          props: true,
        },
        {
          path: 'campaigns',
          name: 'campaigns',
          component: () => import('@/views/campaigns/CampaignsIndex.vue'),
        },
        {
          path: 'campaigns/:id',
          name: 'campaign-detail',
          component: () => import('@/views/campaigns/CampaignDetail.vue'),
          props: true,
        },
        {
          path: 'sequences',
          name: 'sequences',
          component: () => import('@/views/sequences/SequencesIndex.vue'),
        },
        {
          path: 'sequences/:id',
          name: 'sequence-detail',
          component: () => import('@/views/sequences/SequenceDetail.vue'),
          props: true,
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
          path: 'blogs',
          name: 'blogs',
          component: () => import('@/views/blogs/BlogsIndex.vue'),
        },
        {
          path: 'blogs/:id',
          name: 'blog-editor',
          component: () => import('@/views/blogs/BlogEditor.vue'),
          props: true,
        },
        {
          path: 'blog/:slug',
          name: 'blog-view',
          component: () => import('@/views/blogs/BlogView.vue'),
          props: true,
        },
        {
          path: 'notifications',
          name: 'notifications',
          component: () => import('@/views/notifications/NotificationsList.vue'),
        },
        {
          path: 'settings/notification-preferences',
          name: 'settings-notification-preferences',
          component: () => import('@/views/settings/NotificationPreferences.vue'),
        },
        {
          path: 'forecasts',
          name: 'forecasts',
          component: () => import('@/views/forecasts/ForecastView.vue'),
        },
        {
          path: 'goals',
          name: 'goals',
          component: () => import('@/views/goals/GoalsPage.vue'),
        },
        {
          path: 'tickets',
          name: 'tickets',
          component: () => import('@/views/tickets/TicketsList.vue'),
        },
        {
          path: 'tickets/:id',
          name: 'ticket-detail',
          component: () => import('@/views/tickets/TicketDetail.vue'),
          props: true,
        },
        {
          path: 'settings/scoring-rules',
          name: 'settings-scoring-rules',
          component: () => import('@/views/settings/ScoringRulesAdmin.vue'),
        },
        {
          path: 'settings/queues',
          name: 'settings-queues',
          component: () => import('@/views/settings/QueuesAdmin.vue'),
        },
        {
          path: 'settings/business-hours',
          name: 'settings-business-hours',
          component: () => import('@/views/settings/BusinessHoursAdmin.vue'),
        },
        {
          path: 'settings/sla-policies',
          name: 'settings-sla-policies',
          component: () => import('@/views/settings/SLAPoliciesAdmin.vue'),
        },
        {
          path: 'settings/macros',
          name: 'settings-macros',
          component: () => import('@/views/settings/MacrosAdmin.vue'),
        },
        {
          path: 'settings/audit-trail',
          name: 'settings-audit-trail',
          component: () => import('@/views/settings/AuditTrailDashboard.vue'),
        },
        {
          path: 'settings/csat',
          name: 'settings-csat',
          component: () => import('@/views/settings/CSATDashboard.vue'),
        },
        {
          path: 'settings/email-to-case',
          name: 'settings-email-to-case',
          component: () => import('@/views/settings/EmailToCaseAdmin.vue'),
        },
        {
          path: 'chat',
          name: 'chat-inbox',
          component: () => import('@/views/service/ChatInbox.vue'),
        },
        {
          path: 'service-dashboard',
          name: 'service-dashboard',
          component: () => import('@/views/service/ServiceDashboard.vue'),
        },
        {
          path: 'kb',
          name: 'kb',
          component: () => import('@/views/kb/KBArticlesList.vue'),
        },
        {
          path: 'kb/new',
          name: 'kb-new',
          component: () => import('@/views/kb/KBArticleEditor.vue'),
        },
        {
          path: 'kb/:id',
          name: 'kb-editor',
          component: () => import('@/views/kb/KBArticleEditor.vue'),
          props: true,
        },
        {
          path: 'kb/categories',
          name: 'kb-categories',
          component: () => import('@/views/kb/KBCategoriesAdmin.vue'),
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('@/views/reports/ReportsIndex.vue'),
        },
        {
          path: 'reports/saved',
          name: 'saved-reports',
          component: () => import('@/views/reports/SavedReportsList.vue'),
        },
        {
          path: 'reports/builder',
          name: 'report-builder',
          component: () => import('@/views/reports/ReportBuilder.vue'),
        },
        {
          path: 'reports/builder/:id',
          name: 'report-edit',
          component: () => import('@/views/reports/ReportBuilder.vue'),
          props: true,
        },
        {
          path: 'reports/view/:id',
          name: 'report-view',
          component: () => import('@/views/reports/ReportView.vue'),
          props: true,
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
