import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AuditTrailDashboard from './AuditTrailDashboard.vue';
import PrimeVue from 'primevue/config';
import { createI18n } from 'vue-i18n';
import en from '@/i18n/en.json';
import { createRouter, createWebHistory } from 'vue-router';

vi.mock('@/api/audit', () => ({
  auditApi: {
    list: vi.fn().mockResolvedValue({
      items: [
        { id: 'a1', entityType: 'Ticket', action: 'CREATE', fieldKey: null, oldValue: null, newValue: { subject: 'Test' }, userId: 'u1', createdAt: new Date().toISOString() },
      ],
      nextCursor: null,
    }),
  },
}));

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } });
const router = createRouter({ history: createWebHistory(), routes: [{ path: '/', component: { template: '<div />' } }] });

describe('AuditTrailDashboard.vue', () => {
  it('renders page title', async () => {
    const w = mount(AuditTrailDashboard, {
      global: { plugins: [PrimeVue, i18n, router] },
    });
    await vi.dynamicImportSettled();
    expect(w.text()).toContain('Audit Trail');
  });

  it('shows entity type filter', () => {
    const w = mount(AuditTrailDashboard, {
      global: { plugins: [PrimeVue, i18n, router] },
    });
    expect(w.find('[data-test="audit-entity-filter"]').exists()).toBe(true);
  });

  it('loads audit logs on mount', async () => {
    const { auditApi } = await import('@/api/audit');
    mount(AuditTrailDashboard, {
      global: { plugins: [PrimeVue, i18n, router] },
    });
    await vi.dynamicImportSettled();
    expect(auditApi.list).toHaveBeenCalled();
  });
});
