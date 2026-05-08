import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GoalService } from './goal.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    goal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    deal: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    activity: {
      count: jest.fn(),
    },
  };
}

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const svc = new GoalService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('GoalService.create', () => {
  it('creates a goal with valid data', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.goal.create.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
      name: 'Q2 Revenue',
      metric: 'REVENUE',
      targetValue: 100000,
      currentValue: 0,
      status: 'ON_TRACK',
    });

    await tenant.run(ctx(), async () => {
      await svc.create({
        name: 'Q2 Revenue',
        metric: 'REVENUE',
        targetValue: 100000,
        period: '2026-Q2',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2026-06-30'),
      });
    });

    expect(prisma.goal.create).toHaveBeenCalled();
    const args = prisma.goal.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.name).toBe('Q2 Revenue');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Goal', action: 'CREATE' }),
    );
  });

  it('creates a goal with owner and team', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.create.mockResolvedValue({
      id: 'g_2',
      workspaceId: 'ws_1',
      ownerId: 'u_2',
      teamId: 't_1',
    });

    await tenant.run(ctx(), async () => {
      await svc.create({
        name: 'Team Goal',
        metric: 'DEAL_COUNT',
        targetValue: 50,
        period: '2026-05',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-05-31'),
        ownerId: 'u_2',
        teamId: 't_1',
      });
    });

    const args = prisma.goal.create.mock.calls[0][0];
    expect(args.data.ownerId).toBe('u_2');
    expect(args.data.teamId).toBe('t_1');
  });
});

describe('GoalService.list', () => {
  it('returns paginated goals with filters', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const rows = [
      { id: 'g_1', name: 'Goal 1' },
      { id: 'g_2', name: 'Goal 2' },
    ];
    prisma.goal.findMany.mockResolvedValue(rows);
    const result = await tenant.run(ctx(), async () => svc.list({ limit: 1 }));
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('g_1');
  });

  it('filters by status', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () => svc.list({ status: 'ON_TRACK' }));
    const args = prisma.goal.findMany.mock.calls[0][0];
    expect(args.where.status).toBe('ON_TRACK');
  });

  it('filters by ownerId and teamId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () =>
      svc.list({ ownerId: 'u_2', teamId: 't_1' }),
    );
    const args = prisma.goal.findMany.mock.calls[0][0];
    expect(args.where.ownerId).toBe('u_2');
    expect(args.where.teamId).toBe('t_1');
  });
});

describe('GoalService.get', () => {
  it('returns goal by id', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
      archivedAt: null,
    });
    const result = await tenant.run(ctx(), async () => svc.get('g_1'));
    expect(result.id).toBe('g_1');
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'OTHER',
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('g_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException for archived goal', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
      archivedAt: new Date(),
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('g_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('GoalService.update', () => {
  it('updates goal fields', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
      archivedAt: null,
    });
    prisma.goal.update.mockResolvedValue({
      id: 'g_1',
      name: 'Updated Goal',
      targetValue: 200000,
    });

    await tenant.run(ctx(), async () => {
      await svc.update('g_1', { name: 'Updated Goal', targetValue: 200000 });
    });

    expect(prisma.goal.update).toHaveBeenCalled();
    expect(audit.logUpdate).toHaveBeenCalled();
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'OTHER',
    });
    await expect(
      tenant.run(ctx(), async () => svc.update('g_1', { name: 'X' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('GoalService.archive', () => {
  it('sets archivedAt and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
    });
    prisma.goal.update.mockResolvedValue({
      id: 'g_1',
      archivedAt: new Date(),
    });

    await tenant.run(ctx(), async () => {
      await svc.archive('g_1');
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Goal', action: 'DELETE' }),
    );
  });
});

describe('GoalService.recalculateProgress', () => {
  it('calculates REVENUE from won deals', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
      metric: 'REVENUE',
      targetValue: { toNumber: () => 100000 },
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-30'),
      archivedAt: null,
    });
    prisma.deal.aggregate.mockResolvedValue({
      _sum: { amount: { toNumber: () => 55000 } },
    });
    prisma.goal.update.mockResolvedValue({
      id: 'g_1',
      currentValue: 55000,
      status: 'ON_TRACK',
    });

    await tenant.run(ctx(), async () => {
      await svc.recalculateProgress('g_1');
    });

    expect(prisma.deal.aggregate).toHaveBeenCalled();
    expect(prisma.goal.update).toHaveBeenCalled();
  });

  it('calculates DEAL_COUNT', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
      metric: 'DEAL_COUNT',
      targetValue: { toNumber: () => 50 },
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-30'),
      archivedAt: null,
    });
    prisma.deal.count.mockResolvedValue(30);
    prisma.goal.update.mockResolvedValue({
      id: 'g_1',
      currentValue: 30,
      status: 'ON_TRACK',
    });

    await tenant.run(ctx(), async () => {
      await svc.recalculateProgress('g_1');
    });

    expect(prisma.deal.count).toHaveBeenCalled();
  });

  it('calculates WON_DEAL_COUNT', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
      metric: 'WON_DEAL_COUNT',
      targetValue: { toNumber: () => 20 },
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-30'),
      archivedAt: null,
    });
    prisma.deal.count.mockResolvedValue(15);
    prisma.goal.update.mockResolvedValue({
      id: 'g_1',
      currentValue: 15,
      status: 'ON_TRACK',
    });

    await tenant.run(ctx(), async () => {
      await svc.recalculateProgress('g_1');
    });

    const dealCountArgs = prisma.deal.count.mock.calls[0][0];
    expect(dealCountArgs.where.status).toBe('WON');
  });

  it('calculates ACTIVITY_COUNT', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
      metric: 'ACTIVITY_COUNT',
      targetValue: { toNumber: () => 100 },
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-30'),
      archivedAt: null,
    });
    prisma.activity.count.mockResolvedValue(80);
    prisma.goal.update.mockResolvedValue({
      id: 'g_1',
      currentValue: 80,
      status: 'ON_TRACK',
    });

    await tenant.run(ctx(), async () => {
      await svc.recalculateProgress('g_1');
    });

    expect(prisma.activity.count).toHaveBeenCalled();
  });

  it('calculates AVG_DEAL_SIZE', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
      metric: 'AVG_DEAL_SIZE',
      targetValue: { toNumber: () => 5000 },
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-30'),
      archivedAt: null,
    });
    prisma.deal.aggregate.mockResolvedValue({
      _avg: { amount: { toNumber: () => 4500 } },
    });
    prisma.goal.update.mockResolvedValue({
      id: 'g_1',
      currentValue: 4500,
      status: 'AT_RISK',
    });

    await tenant.run(ctx(), async () => {
      await svc.recalculateProgress('g_1');
    });

    expect(prisma.deal.aggregate).toHaveBeenCalled();
  });

  it('sets ACHIEVED when attainment >= 100%', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
      metric: 'REVENUE',
      targetValue: { toNumber: () => 100000 },
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-30'),
      archivedAt: null,
    });
    prisma.deal.aggregate.mockResolvedValue({
      _sum: { amount: { toNumber: () => 120000 } },
    });
    prisma.goal.update.mockResolvedValue({
      id: 'g_1',
      currentValue: 120000,
      status: 'ACHIEVED',
    });

    await tenant.run(ctx(), async () => {
      await svc.recalculateProgress('g_1');
    });

    const updateArgs = prisma.goal.update.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('ACHIEVED');
  });

  it('sets BEHIND when far off track', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const now = new Date();
    const startDate = new Date(now);
    startDate.setMonth(startDate.getMonth() - 2);
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1);

    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
      metric: 'REVENUE',
      targetValue: { toNumber: () => 100000 },
      startDate,
      endDate,
      archivedAt: null,
    });
    prisma.deal.aggregate.mockResolvedValue({
      _sum: { amount: { toNumber: () => 5000 } },
    });
    prisma.goal.update.mockResolvedValue({
      id: 'g_1',
      currentValue: 5000,
      status: 'BEHIND',
    });

    await tenant.run(ctx(), async () => {
      await svc.recalculateProgress('g_1');
    });

    const updateArgs = prisma.goal.update.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('BEHIND');
  });

  it('skips CUSTOM metric (no auto-calculate)', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.goal.findUnique.mockResolvedValue({
      id: 'g_1',
      workspaceId: 'ws_1',
      metric: 'CUSTOM',
      targetValue: { toNumber: () => 100 },
      currentValue: { toNumber: () => 50 },
      startDate: new Date('2026-04-01'),
      endDate: new Date('2026-06-30'),
      archivedAt: null,
    });
    prisma.goal.update.mockResolvedValue({ id: 'g_1' });

    await tenant.run(ctx(), async () => {
      await svc.recalculateProgress('g_1');
    });

    expect(prisma.deal.aggregate).not.toHaveBeenCalled();
    expect(prisma.deal.count).not.toHaveBeenCalled();
    expect(prisma.activity.count).not.toHaveBeenCalled();
  });
});
