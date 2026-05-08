import { NotFoundException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    dashboard: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const svc = new DashboardService(prisma as any, tenant);
  return { svc, tenant, prisma };
}

const ctx = (workspaceId = 'ws_1') => ({
  workspaceId,
  userId: 'u_1',
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('DashboardService.create', () => {
  it('creates a dashboard with workspaceId and ownerId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.dashboard.create.mockResolvedValue({ id: 'd1', name: 'My Dashboard' });
    await tenant.run(ctx(), async () => {
      const result = await svc.create({ name: 'My Dashboard' });
      expect(result.name).toBe('My Dashboard');
      const data = prisma.dashboard.create.mock.calls[0][0].data;
      expect(data.workspaceId).toBe('ws_1');
      expect(data.ownerId).toBe('u_1');
      expect(data.layout).toEqual({ widgets: [] });
    });
  });

  it('accepts custom layout with widgets', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const layout = { widgets: [{ id: 'w1', type: 'NUMBER', reportId: 'pipeline-funnel' }] };
    prisma.dashboard.create.mockResolvedValue({ id: 'd1', layout });
    await tenant.run(ctx(), async () => {
      await svc.create({ name: 'Custom', layout });
      const data = prisma.dashboard.create.mock.calls[0][0].data;
      expect(data.layout.widgets).toHaveLength(1);
    });
  });
});

describe('DashboardService.get', () => {
  it('returns dashboard belonging to workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.dashboard.findUnique.mockResolvedValue({ id: 'd1', workspaceId: 'ws_1', name: 'Sales' });
    await tenant.run(ctx(), async () => {
      const result = await svc.get('d1');
      expect(result.name).toBe('Sales');
    });
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.dashboard.findUnique.mockResolvedValue({ id: 'd1', workspaceId: 'ws_other' });
    await tenant.run(ctx(), async () => {
      await expect(svc.get('d1')).rejects.toThrow(NotFoundException);
    });
  });

  it('throws NotFoundException when not found', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.dashboard.findUnique.mockResolvedValue(null);
    await tenant.run(ctx(), async () => {
      await expect(svc.get('d_missing')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('DashboardService.list', () => {
  it('lists dashboards for the workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.dashboard.findMany.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }]);
    await tenant.run(ctx(), async () => {
      const list = await svc.list();
      expect(list).toHaveLength(2);
      expect(prisma.dashboard.findMany.mock.calls[0][0].where.workspaceId).toBe('ws_1');
    });
  });
});

describe('DashboardService.update', () => {
  it('updates name and layout', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.dashboard.findUnique.mockResolvedValue({ id: 'd1', workspaceId: 'ws_1' });
    prisma.dashboard.update.mockResolvedValue({ id: 'd1', name: 'Updated' });
    await tenant.run(ctx(), async () => {
      const result = await svc.update('d1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });
  });
});

describe('DashboardService.delete', () => {
  it('deletes a dashboard', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.dashboard.findUnique.mockResolvedValue({ id: 'd1', workspaceId: 'ws_1' });
    prisma.dashboard.delete.mockResolvedValue({ id: 'd1' });
    await tenant.run(ctx(), async () => {
      await svc.delete('d1');
      expect(prisma.dashboard.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    });
  });
});
