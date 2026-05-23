import { api as http } from './client';

export interface BusinessHoursSchedule {
  day: number;
  startTime: string;
  endTime: string;
}

export interface BusinessHoursHoliday {
  date: string;
  name: string;
}

export interface BusinessHours {
  id: string;
  name: string;
  timezone: string;
  schedule: BusinessHoursSchedule[];
  holidays: BusinessHoursHoliday[];
  isDefault: boolean;
  createdAt: string;
}

export interface SLARule {
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  firstResponseMinutes: number;
  resolutionMinutes: number;
  breachAction: 'NOTIFY' | 'ESCALATE' | 'REASSIGN';
}

export interface SLAPolicy {
  id: string;
  name: string;
  description?: string;
  businessHoursId: string;
  businessHours?: BusinessHours;
  isDefault: boolean;
  rules: SLARule[];
  createdAt: string;
}

export interface CreateBusinessHoursInput {
  name: string;
  timezone?: string;
  schedule: BusinessHoursSchedule[];
  holidays?: BusinessHoursHoliday[];
  isDefault?: boolean;
}

export interface UpdateBusinessHoursInput {
  name?: string;
  timezone?: string;
  schedule?: BusinessHoursSchedule[];
  holidays?: BusinessHoursHoliday[];
  isDefault?: boolean;
}

export interface CreateSLAPolicyInput {
  name: string;
  description?: string;
  businessHoursId: string;
  isDefault?: boolean;
  rules: SLARule[];
}

export interface UpdateSLAPolicyInput {
  name?: string;
  description?: string;
  businessHoursId?: string;
  isDefault?: boolean;
  rules?: SLARule[];
}

export const businessHoursApi = {
  list: (params?: Record<string, any>) =>
    http.get('/sla/business-hours', { params }).then((r) => r.data),
  get: (id: string) =>
    http.get(`/sla/business-hours/${id}`).then((r) => r.data),
  create: (data: CreateBusinessHoursInput) =>
    http.post('/sla/business-hours', data).then((r) => r.data),
  update: (id: string, data: UpdateBusinessHoursInput) =>
    http.patch(`/sla/business-hours/${id}`, data).then((r) => r.data),
  archive: (id: string) =>
    http.delete(`/sla/business-hours/${id}`).then((r) => r.data),
};

export const slaPolicyApi = {
  list: (params?: Record<string, any>) =>
    http.get('/sla/policies', { params }).then((r) => r.data),
  get: (id: string) =>
    http.get(`/sla/policies/${id}`).then((r) => r.data),
  create: (data: CreateSLAPolicyInput) =>
    http.post('/sla/policies', data).then((r) => r.data),
  update: (id: string, data: UpdateSLAPolicyInput) =>
    http.patch(`/sla/policies/${id}`, data).then((r) => r.data),
  archive: (id: string) =>
    http.delete(`/sla/policies/${id}`).then((r) => r.data),
};
