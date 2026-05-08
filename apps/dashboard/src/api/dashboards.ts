import { api as http } from './client';

export interface Widget {
  id: string;
  type: 'NUMBER' | 'CHART' | 'LIST' | 'KANBAN';
  title: { ar: string; en: string };
  reportId: string;
  filters?: Record<string, unknown>;
  chartType?: 'bar' | 'line' | 'pie' | 'donut';
  grid: { x: number; y: number; w: number; h: number };
}

export interface DashboardLayout {
  widgets: Widget[];
}

export interface Dashboard {
  id: string;
  name: string;
  ownerId: string;
  layout: DashboardLayout;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const dashboardsApi = {
  list: async (): Promise<Dashboard[]> => {
    const r = await http.get('/dashboards');
    return r.data;
  },
  get: async (id: string): Promise<Dashboard> => {
    const r = await http.get(`/dashboards/${id}`);
    return r.data;
  },
  create: async (data: { name: string; layout?: DashboardLayout }): Promise<Dashboard> => {
    const r = await http.post('/dashboards', data);
    return r.data;
  },
  update: async (id: string, data: Partial<{ name: string; layout: DashboardLayout; isDefault: boolean }>): Promise<Dashboard> => {
    const r = await http.patch(`/dashboards/${id}`, data);
    return r.data;
  },
  delete: (id: string) => http.delete(`/dashboards/${id}`),
};
