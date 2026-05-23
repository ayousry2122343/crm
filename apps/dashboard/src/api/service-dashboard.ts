import { api as http } from './client';

export interface OverviewStats {
  openTickets: number;
  pendingTickets: number;
  resolvedToday: number;
  avgResolutionHours: number;
  avgFirstResponseHours: number;
  slaComplianceRate: number;
  csatAverage: number;
}

export interface ChannelStat {
  channel: string;
  count: number;
}

export interface PriorityStat {
  priority: string;
  count: number;
}

export interface StatusStat {
  status: string;
  count: number;
}

export interface VolumeEntry {
  date: string;
  created: number;
  resolved: number;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  ticketsHandled: number;
  avgResolutionHours: number;
  avgFirstResponseHours: number;
  slaComplianceRate: number;
  csatAverage: number;
  openTickets: number;
}

export interface QueueStat {
  queueId: string;
  queueName: string;
  openTickets: number;
  avgWaitMinutes: number;
  agentsOnline: number;
}

export const serviceDashboardApi = {
  overview: () =>
    http.get<OverviewStats>('/service-dashboard/overview').then((r) => r.data),
  ticketsByChannel: () =>
    http.get<ChannelStat[]>('/service-dashboard/tickets-by-channel').then((r) => r.data),
  ticketsByPriority: () =>
    http.get<PriorityStat[]>('/service-dashboard/tickets-by-priority').then((r) => r.data),
  ticketsByStatus: () =>
    http.get<StatusStat[]>('/service-dashboard/tickets-by-status').then((r) => r.data),
  volumeOverTime: (period: string = '7d') =>
    http.get<VolumeEntry[]>('/service-dashboard/volume-over-time', { params: { period } }).then((r) => r.data),
  agentPerformance: () =>
    http.get<AgentPerformance[]>('/service-dashboard/agent-performance').then((r) => r.data),
  queueStats: () =>
    http.get<QueueStat[]>('/service-dashboard/queue-stats').then((r) => r.data),
};
