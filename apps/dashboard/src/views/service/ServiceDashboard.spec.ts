import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import ServiceDashboard from './ServiceDashboard.vue';

vi.mock('@/api/service-dashboard', () => ({
  serviceDashboardApi: {
    overview: vi.fn().mockResolvedValue({
      openTickets: 42,
      pendingTickets: 12,
      resolvedToday: 8,
      avgResolutionHours: 4.5,
      avgFirstResponseHours: 1.2,
      slaComplianceRate: 92.5,
      csatAverage: 4.2,
    }),
    ticketsByChannel: vi.fn().mockResolvedValue([
      { channel: 'EMAIL', count: 120 },
    ]),
    volumeOverTime: vi.fn().mockResolvedValue([
      { date: '2026-05-10', created: 12, resolved: 8 },
    ]),
    agentPerformance: vi.fn().mockResolvedValue([
      { agentId: 'u1', agentName: 'Ahmed', ticketsHandled: 45, avgResolutionHours: 3.2, avgFirstResponseHours: 0.8, slaComplianceRate: 95, csatAverage: 4.5, openTickets: 8 },
    ]),
    queueStats: vi.fn().mockResolvedValue([
      { queueId: 'q1', queueName: 'General', openTickets: 15, avgWaitMinutes: 22, agentsOnline: 3 },
    ]),
  },
}));

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  messages: {
    en: {
      serviceDashboard: {
        title: 'Service Dashboard',
        openTickets: 'Open Tickets',
        avgResolution: 'Avg Resolution Time',
        slaCompliance: 'SLA Compliance',
        csatAverage: 'CSAT Average',
        ticketsByChannel: 'Tickets by Channel',
        volumeOverTime: 'Volume Over Time',
        agentPerformance: 'Agent Performance',
        queueStats: 'Queue Statistics',
        period7d: 'Last 7 days',
        period30d: 'Last 30 days',
        period90d: 'Last 90 days',
        created: 'Created',
        resolved: 'Resolved',
        ticketsHandled: 'Tickets Handled',
        avgFirstResponse: 'Avg First Response',
      },
    },
  },
});

function factory() {
  return mount(ServiceDashboard, {
    global: {
      plugins: [i18n],
      stubs: {
        Chart: { template: '<div class="chart-stub" />' },
        DataTable: { template: '<div class="datatable-stub"><slot /></div>' },
        Column: { template: '<div />' },
        SelectButton: { template: '<div class="select-stub" />' },
      },
    },
  });
}

describe('ServiceDashboard.vue', () => {
  it('renders dashboard title', async () => {
    const wrapper = factory();
    await vi.dynamicImportSettled();
    expect(wrapper.find('[data-test="dashboard-title"]').text()).toBe('Service Dashboard');
  });

  it('renders stat cards', async () => {
    const wrapper = factory();
    await vi.dynamicImportSettled();
    const cards = wrapper.find('[data-test="stat-cards"]');
    expect(cards.exists()).toBe(true);
  });

  it('renders period selector', async () => {
    const wrapper = factory();
    await vi.dynamicImportSettled();
    const selector = wrapper.find('[data-test="period-selector"]');
    expect(selector.exists()).toBe(true);
  });
});
