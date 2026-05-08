import { api as http } from './client';

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'EXITED';

export interface SequenceStep {
  action: string;
  templateId?: string;
  delay: number;
  delayUnit: string;
  conditions?: Record<string, unknown>;
}

export interface SequenceEnrollment {
  id: string;
  sequenceId: string;
  personId: string;
  currentStep: number;
  status: EnrollmentStatus;
  nextRunAt?: string;
  exitReason?: string;
  completedAt?: string;
  person?: { fullName: string; email?: string };
  createdAt: string;
}

export interface Sequence {
  id: string;
  name: string;
  triggerEvent?: string;
  steps: SequenceStep[];
  enabled: boolean;
  _count?: { enrollments: number };
  enrollments?: SequenceEnrollment[];
  createdAt: string;
  updatedAt: string;
}

export interface SequenceListResponse {
  items: Sequence[];
  nextCursor?: string;
  hasMore: boolean;
}

export const sequencesApi = {
  list: (params?: Record<string, unknown>) =>
    http.get<SequenceListResponse>('/sequences', { params }).then((r) => r.data),
  get: (id: string) => http.get<Sequence>(`/sequences/${id}`).then((r) => r.data),
  create: (data: Partial<Sequence>) =>
    http.post<Sequence>('/sequences', data).then((r) => r.data),
  update: (id: string, data: Partial<Sequence>) =>
    http.patch<Sequence>(`/sequences/${id}`, data).then((r) => r.data),
  enroll: (id: string, personId: string) =>
    http.post<SequenceEnrollment>(`/sequences/${id}/enroll`, { personId }).then((r) => r.data),
  pauseEnrollment: (enrollmentId: string) =>
    http.post(`/sequences/enrollments/${enrollmentId}/pause`).then((r) => r.data),
  resumeEnrollment: (enrollmentId: string) =>
    http.post(`/sequences/enrollments/${enrollmentId}/resume`).then((r) => r.data),
  exitEnrollment: (enrollmentId: string, reason?: string) =>
    http.post(`/sequences/enrollments/${enrollmentId}/exit`, { reason }).then((r) => r.data),
  archive: (id: string) => http.delete(`/sequences/${id}`).then((r) => r.data),
};
