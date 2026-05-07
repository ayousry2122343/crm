import { api } from './client';

export type Stage = {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  probability: number;
  color: string;
  isWon: boolean;
  isLost: boolean;
  requiredFieldKeys: string[];
};

export type Pipeline = {
  id: string;
  workspaceId: string;
  name: string;
  entityType: string;
  isDefault: boolean;
  stages: Stage[];
  createdAt: string;
};

export const pipelinesApi = {
  list: (entityType?: string) =>
    api
      .get<Pipeline[]>('/pipelines', { params: entityType ? { entityType } : {} })
      .then((r) => ({ items: r.data })),
  get: (id: string) => api.get<Pipeline>(`/pipelines/${id}`).then((r) => r.data),
  create: (data: { name: string; entityType?: string }) =>
    api.post<Pipeline>('/pipelines', data).then((r) => r.data),
  update: (id: string, data: Partial<Pipeline>) =>
    api.patch<Pipeline>(`/pipelines/${id}`, data).then((r) => r.data),
  archive: (id: string) => api.delete(`/pipelines/${id}`),
  createStage: (pipelineId: string, data: Partial<Stage>) =>
    api.post<Stage>(`/pipelines/${pipelineId}/stages`, data).then((r) => r.data),
  updateStage: (stageId: string, data: Partial<Stage>) =>
    api.patch<Stage>(`/pipelines/stages/${stageId}`, data).then((r) => r.data),
  deleteStage: (stageId: string) =>
    api.delete(`/pipelines/stages/${stageId}`),
  seedDefault: () =>
    api.post<Pipeline>('/pipelines/seed-default').then((r) => r.data),
};
