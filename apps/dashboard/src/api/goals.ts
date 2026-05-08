import { api as http } from './client';

export interface Goal {
  id: string;
  workspaceId: string;
  name: string;
  metric: 'REVENUE' | 'DEAL_COUNT' | 'ACTIVITY_COUNT' | 'WON_DEAL_COUNT' | 'AVG_DEAL_SIZE' | 'CUSTOM';
  targetValue: number;
  currentValue: number;
  period: string;
  startDate: string;
  endDate: string;
  ownerId: string | null;
  owner: { id: string; fullName: string } | null;
  teamId: string | null;
  team: { id: string; name: string } | null;
  status: 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'ACHIEVED';
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoalListResponse {
  items: Goal[];
  nextCursor: string | null;
}

export interface CreateGoalInput {
  name: string;
  metric: string;
  targetValue: number;
  period: string;
  startDate: string;
  endDate: string;
  ownerId?: string;
  teamId?: string;
}

export const goalsApi = {
  list: (params?: { status?: string; ownerId?: string; teamId?: string; cursor?: string; limit?: number }) =>
    http.get<GoalListResponse>('/goals', { params }).then((r) => r.data),

  get: (id: string) =>
    http.get<Goal>(`/goals/${id}`).then((r) => r.data),

  create: (data: CreateGoalInput) =>
    http.post<Goal>('/goals', data).then((r) => r.data),

  update: (id: string, data: Partial<CreateGoalInput> & { currentValue?: number }) =>
    http.patch<Goal>(`/goals/${id}`, data).then((r) => r.data),

  archive: (id: string) =>
    http.delete(`/goals/${id}`).then((r) => r.data),

  recalculate: (id: string) =>
    http.post<Goal>(`/goals/${id}/recalculate`).then((r) => r.data),
};
