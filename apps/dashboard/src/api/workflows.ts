import { api } from './client';

export type WorkflowTrigger = {
  event: 'CREATED' | 'UPDATED' | 'DELETED' | 'FIELD_CHANGED' | 'MANUAL';
  fieldKey?: string;
};

export type ConditionItem = {
  field: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'notIn' | 'contains' | 'startsWith' | 'endsWith' | 'isNull' | 'isNotNull';
  value?: unknown;
};

export type ConditionGroup = {
  op: 'AND' | 'OR';
  items: Array<ConditionItem | ConditionGroup>;
};

export type WorkflowAction = {
  type: 'UPDATE_FIELD' | 'SEND_EMAIL' | 'CREATE_TASK' | 'CALL_WEBHOOK' | 'NOTIFY_USER' | 'ASSIGN';
  params: Record<string, unknown>;
};

export type Workflow = {
  id: string;
  workspaceId: string;
  name: string;
  entityType: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  conditions: ConditionGroup;
  actions: WorkflowAction[];
  createdAt: string;
  updatedAt: string;
};

export type WorkflowRun = {
  id: string;
  workflowId: string;
  triggeredByEntity: string;
  triggeredById: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED';
  log: unknown;
  error: string | null;
  triggeredAt: string;
  completedAt: string | null;
};

export const workflowsApi = {
  list: (entityType?: string) =>
    api.get<Workflow[]>('/workflows', { params: entityType ? { entityType } : {} }).then((r) => r.data),
  get: (id: string) => api.get<Workflow>(`/workflows/${id}`).then((r) => r.data),
  create: (data: Partial<Workflow>) => api.post<Workflow>('/workflows', data).then((r) => r.data),
  update: (id: string, data: Partial<Workflow>) =>
    api.patch<Workflow>(`/workflows/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/workflows/${id}`),
  runs: (workflowId: string) =>
    api.get<WorkflowRun[]>(`/workflows/${workflowId}/runs`).then((r) => r.data),
};
