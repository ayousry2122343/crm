import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ForecastService } from './forecast.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    deal: { findMany: jest.fn(), groupBy: jest.fn() },
    forecastPeriod: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
    forecastEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    forecastSnapshot: {
      create: jest.fn(),
      findMany: jest.fn(),
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
  const svc = new ForecastService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('ForecastService.generateForecast', () => {
  it('creates period and entries from deal data', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();

    prisma.forecastPeriod.findFirst.mockResolvedValue(null);
    prisma.forecastPeriod.create.mockResolvedValue({
      id: 'fp_1',
      workspaceId: 'ws_1',
      periodType: 'MONTHLY',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-31'),
    });

    prisma.deal.findMany.mockResolvedValue([
      { id: 'd_1', ownerId: 'u_1', amount: { toNumber: () => 5000 }, status: 'OPEN', probability: 90, forecastCategory: null },
      { id: 'd_2', ownerId: 'u_1', amount: { toNumber: () => 3000 }, status: 'OPEN', probability: 70, forecastCategory: null },
      { id: 'd_3', ownerId: 'u_2', amount: { toNumber: () => 10000 }, status: 'WON', probability: 100, forecastCategory: null },
    ]);

    prisma.forecastEntry.deleteMany.mockResolvedValue({ count: 0 });
    prisma.forecastEntry.createMany.mockResolvedValue({ count: 3 });
    prisma.forecastPeriod.findUnique.mockResolvedValue({
      id: 'fp_1',
      entries: [
        { userId: 'u_1', category: 'COMMIT', amount: 5000 },
        { userId: 'u_1', category: 'BEST_CASE', amount: 3000 },
        { userId: 'u_2', category: 'CLOSED_WON', amount: 10000 },
      ],
    });

    const result = await tenant.run(ctx(), async () =>
      svc.generateForecast({ periodType: 'MONTHLY', date: '2026-05' }),
    );

    expect(prisma.forecastPeriod.create).toHaveBeenCalled();
    expect(prisma.deal.findMany).toHaveBeenCalled();
    expect(prisma.forecastEntry.createMany).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'ForecastPeriod', action: 'CREATE' }),
    );
  });

  it('reuses existing period when regenerating', async () => {
    const { svc, tenant, prisma } = buildSvc();

    prisma.forecastPeriod.findFirst.mockResolvedValue({
      id: 'fp_1',
      workspaceId: 'ws_1',
      periodType: 'MONTHLY',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-31'),
    });

    prisma.deal.findMany.mockResolvedValue([]);
    prisma.forecastEntry.deleteMany.mockResolvedValue({ count: 0 });
    prisma.forecastEntry.createMany.mockResolvedValue({ count: 0 });
    prisma.forecastPeriod.findUnique.mockResolvedValue({
      id: 'fp_1',
      entries: [],
    });

    await tenant.run(ctx(), async () =>
      svc.generateForecast({ periodType: 'MONTHLY', date: '2026-05' }),
    );

    expect(prisma.forecastPeriod.create).not.toHaveBeenCalled();
  });

  it('filters by pipelineId when provided', async () => {
    const { svc, tenant, prisma } = buildSvc();

    prisma.forecastPeriod.findFirst.mockResolvedValue({
      id: 'fp_1',
      workspaceId: 'ws_1',
    });
    prisma.deal.findMany.mockResolvedValue([]);
    prisma.forecastEntry.deleteMany.mockResolvedValue({ count: 0 });
    prisma.forecastEntry.createMany.mockResolvedValue({ count: 0 });
    prisma.forecastPeriod.findUnique.mockResolvedValue({ id: 'fp_1', entries: [] });

    await tenant.run(ctx(), async () =>
      svc.generateForecast({ periodType: 'QUARTERLY', date: '2026-Q2', pipelineId: 'pipe_1' }),
    );

    const dealQuery = prisma.deal.findMany.mock.calls[0][0];
    expect(dealQuery.where.pipelineId).toBe('pipe_1');
  });
});

describe('ForecastService.getByPeriod', () => {
  it('returns period with entries', async () => {
    const { svc, tenant, prisma } = buildSvc();

    prisma.forecastPeriod.findFirst.mockResolvedValue({
      id: 'fp_1',
      workspaceId: 'ws_1',
      entries: [{ id: 'fe_1', category: 'COMMIT', amount: 5000 }],
    });

    const result = await tenant.run(ctx(), async () =>
      svc.getByPeriod('MONTHLY', '2026-05'),
    );

    expect(result.id).toBe('fp_1');
  });

  it('throws NotFoundException when period not found', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.forecastPeriod.findFirst.mockResolvedValue(null);

    await expect(
      tenant.run(ctx(), async () => svc.getByPeriod('MONTHLY', '2026-05')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ForecastService.updateEntry', () => {
  it('updates adjustedAmount and note', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();

    prisma.forecastEntry.findUnique.mockResolvedValue({
      id: 'fe_1',
      forecastPeriod: { workspaceId: 'ws_1' },
      amount: 5000,
    });
    prisma.forecastEntry.update.mockResolvedValue({
      id: 'fe_1',
      adjustedAmount: 6000,
      note: 'Manager override',
    });

    await tenant.run(ctx(), async () => {
      await svc.updateEntry('fe_1', { adjustedAmount: 6000, note: 'Manager override' });
    });

    expect(prisma.forecastEntry.update).toHaveBeenCalledWith({
      where: { id: 'fe_1' },
      data: { adjustedAmount: 6000, note: 'Manager override' },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'ForecastEntry', action: 'UPDATE' }),
    );
  });

  it('throws when entry not in workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();

    prisma.forecastEntry.findUnique.mockResolvedValue({
      id: 'fe_1',
      forecastPeriod: { workspaceId: 'OTHER' },
    });

    await expect(
      tenant.run(ctx(), async () =>
        svc.updateEntry('fe_1', { adjustedAmount: 100 }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ForecastService.takeSnapshot', () => {
  it('creates snapshot from current entries', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();

    prisma.forecastPeriod.findUnique.mockResolvedValue({
      id: 'fp_1',
      workspaceId: 'ws_1',
    });
    prisma.forecastEntry.findMany.mockResolvedValue([
      { id: 'fe_1', userId: 'u_1', category: 'COMMIT', amount: 5000, adjustedAmount: null },
    ]);
    prisma.forecastSnapshot.create.mockResolvedValue({
      id: 'fs_1',
      forecastPeriodId: 'fp_1',
      snapshotDate: new Date(),
      data: [],
    });

    await tenant.run(ctx(), async () => {
      await svc.takeSnapshot('fp_1');
    });

    expect(prisma.forecastSnapshot.create).toHaveBeenCalled();
    const args = prisma.forecastSnapshot.create.mock.calls[0][0];
    expect(args.data.forecastPeriodId).toBe('fp_1');
  });

  it('throws when period not in workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.forecastPeriod.findUnique.mockResolvedValue({
      id: 'fp_1',
      workspaceId: 'OTHER',
    });

    await expect(
      tenant.run(ctx(), async () => svc.takeSnapshot('fp_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ForecastService.getSnapshots', () => {
  it('returns snapshots for period', async () => {
    const { svc, tenant, prisma } = buildSvc();

    prisma.forecastPeriod.findUnique.mockResolvedValue({
      id: 'fp_1',
      workspaceId: 'ws_1',
    });
    prisma.forecastSnapshot.findMany.mockResolvedValue([
      { id: 'fs_1', snapshotDate: new Date(), data: [] },
      { id: 'fs_2', snapshotDate: new Date(), data: [] },
    ]);

    const result = await tenant.run(ctx(), async () =>
      svc.getSnapshots('fp_1'),
    );

    expect(result).toHaveLength(2);
  });
});
