import { api as http } from './client';

export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  provider: string;
  model: string;
  systemPrompt: string;
  tools: string[];
  enabled: boolean;
  queueIds: string[];
  maxTurnsBeforeEscalation: number;
  confidenceThreshold: number;
  responseLanguage: string;
  createdAt: string;
}

export interface AgentDashboardStats {
  totalSessions: number;
  activeSessions: number;
  escalatedSessions: number;
  resolvedSessions: number;
  resolutionRate: number;
  escalationRate: number;
}

export const agentConfigsApi = {
  list: () =>
    http.get<AgentConfig[]>('/agent-configs').then((r) => r.data),
  get: (id: string) =>
    http.get<AgentConfig>(`/agent-configs/${id}`).then((r) => r.data),
  create: (data: Partial<AgentConfig>) =>
    http.post<AgentConfig>('/agent-configs', data).then((r) => r.data),
  update: (id: string, data: Partial<AgentConfig>) =>
    http.patch<AgentConfig>(`/agent-configs/${id}`, data).then((r) => r.data),
  dashboard: () =>
    http.get<AgentDashboardStats>('/agent-configs/dashboard').then((r) => r.data),
};
