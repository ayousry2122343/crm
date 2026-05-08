import { api as http } from './client';

export interface RuleItem {
  field: string;
  operator: string;
  value: any;
  points: number;
}

export interface ScoringRule {
  id: string;
  workspaceId: string;
  name: string;
  entityType: 'PERSON' | 'DEAL';
  isActive: boolean;
  rules: RuleItem[];
  maxScore: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScoringRuleListResponse {
  items: ScoringRule[];
  nextCursor: string | null;
}

export interface CreateScoringRuleInput {
  name: string;
  entityType: string;
  rules: RuleItem[];
  maxScore?: number;
}

export const scoringApi = {
  listRules: (params?: { entityType?: string; isActive?: string; cursor?: string; limit?: number }) =>
    http.get<ScoringRuleListResponse>('/scoring-rules', { params }).then((r) => r.data),

  getRule: (id: string) =>
    http.get<ScoringRule>(`/scoring-rules/${id}`).then((r) => r.data),

  createRule: (data: CreateScoringRuleInput) =>
    http.post<ScoringRule>('/scoring-rules', data).then((r) => r.data),

  updateRule: (id: string, data: Partial<CreateScoringRuleInput> & { isActive?: boolean }) =>
    http.patch<ScoringRule>(`/scoring-rules/${id}`, data).then((r) => r.data),

  archiveRule: (id: string) =>
    http.delete(`/scoring-rules/${id}`).then((r) => r.data),

  scoreEntity: (entityType: string, entityId: string) =>
    http.post(`/scoring/score/${entityType}/${entityId}`).then((r) => r.data),

  bulkRescore: (entityType: string) =>
    http.post<{ processed: number; updated: number }>(`/scoring/rescore/${entityType}`).then((r) => r.data),
};
