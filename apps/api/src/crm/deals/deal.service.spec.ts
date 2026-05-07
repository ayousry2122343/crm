import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DealService } from './deal.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    pipeline: { findUnique: jest.fn() },
    stage: { findUnique: jest.fn(), findMany: jest.fn() },
    deal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    activity: { create: jest.fn() },
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
  const svc = new DealService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('DealService.create', () => {
  it('creates deal after verifying pipeline and stage', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.pipeline.findUnique.mockResolvedValue({ id: 'pip_1', workspaceId: 'ws_1' });
    prisma.stage.findUnique.mockResolvedValue({ id: 's_1', pipelineId: 'pip_1', probability: 20 });
    prisma.deal.create.mockResolvedValue({
      id: 'd_1',
      name: 'Big Deal',
      stageId: 's_1',
      stage: { id: 's_1' },
    });
    await tenant.run(ctx(), async () => {
      await svc.create({ name: 'Big Deal', pipelineId: 'pip_1', stageId: 's_1' });
    });
    const args = prisma.deal.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.name).toBe('Big Deal');
    expect(args.data.probability).toBe(20);
    expect(args.data.createdById).toBe('u_1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Deal', action: 'CREATE' }),
    );
  });

  it('throws when pipeline not in workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pipeline.findUnique.mockResolvedValue({ id: 'pip_1', workspaceId: 'OTHER' });
    await expect(
      tenant.run(ctx(), async () =>
        svc.create({ name: 'X', pipelineId: 'pip_1', stageId: 's_1' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when stage not in pipeline', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pipeline.findUnique.mockResolvedValue({ id: 'pip_1', workspaceId: 'ws_1' });
    prisma.stage.findUnique.mockResolvedValue({ id: 's_1', pipelineId: 'pip_OTHER' });
    await expect(
      tenant.run(ctx(), async () =>
        svc.create({ name: 'X', pipelineId: 'pip_1', stageId: 's_1' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('DealService.list', () => {
  it('filters by pipeline, status, and paginates', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const rows = Array.from({ length: 3 }, (_, i) => ({ id: `d_${i}`, name: `D${i}`, stage: {} }));
    prisma.deal.findMany.mockResolvedValue(rows);
    const result = await tenant.run(ctx(), async () =>
      svc.list({ pipelineId: 'pip_1', status: 'OPEN', limit: 2 }),
    );
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('d_1');
    const args = prisma.deal.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      workspaceId: 'ws_1',
      pipelineId: 'pip_1',
      status: 'OPEN',
      archivedAt: null,
    });
  });
});

describe('DealService.get', () => {
  it('returns deal with relations', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({
      id: 'd_1',
      workspaceId: 'ws_1',
      archivedAt: null,
      stage: {},
      pipeline: {},
    });
    const result = await tenant.run(ctx(), async () => svc.get('d_1'));
    expect(result.id).toBe('d_1');
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({ id: 'd_1', workspaceId: 'OTHER', archivedAt: null });
    await expect(
      tenant.run(ctx(), async () => svc.get('d_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('DealService.update', () => {
  it('updates fields and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({ id: 'd_1', workspaceId: 'ws_1' });
    prisma.deal.update.mockResolvedValue({ id: 'd_1', name: 'Updated', stage: {} });
    await tenant.run(ctx(), async () => {
      await svc.update('d_1', { name: 'Updated', amount: 5000 });
    });
    const args = prisma.deal.update.mock.calls[0][0];
    expect(args.data.name).toBe('Updated');
    expect(args.data.amount).toBe(5000);
    expect(audit.logUpdate).toHaveBeenCalledWith('Deal', 'd_1', expect.any(Object), expect.any(Object));
  });
});

describe('DealService.moveStage', () => {
  it('moves to Won stage, sets status WON and wonAt', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({ id: 'd_1', workspaceId: 'ws_1', pipelineId: 'pip_1' });
    prisma.stage.findUnique.mockResolvedValue({
      id: 's_won',
      pipelineId: 'pip_1',
      name: 'Won',
      probability: 100,
      isWon: true,
      isLost: false,
    });
    prisma.deal.update.mockResolvedValue({ id: 'd_1', status: 'WON', stage: {} });
    prisma.activity.create.mockResolvedValue({ id: 'a_1' });
    await tenant.run(ctx(), async () => {
      await svc.moveStage('d_1', { stageId: 's_won', wonReason: 'Best price' });
    });
    const args = prisma.deal.update.mock.calls[0][0];
    expect(args.data.status).toBe('WON');
    expect(args.data.wonAt).toBeInstanceOf(Date);
    expect(args.data.wonReason).toBe('Best price');
    expect(prisma.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'SYSTEM', subject: 'Stage changed to Won' }),
      }),
    );
  });

  it('moves to Lost stage, sets status LOST and lostAt', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({ id: 'd_1', workspaceId: 'ws_1', pipelineId: 'pip_1' });
    prisma.stage.findUnique.mockResolvedValue({
      id: 's_lost',
      pipelineId: 'pip_1',
      name: 'Lost',
      probability: 0,
      isWon: false,
      isLost: true,
    });
    prisma.deal.update.mockResolvedValue({ id: 'd_1', status: 'LOST', stage: {} });
    prisma.activity.create.mockResolvedValue({ id: 'a_1' });
    await tenant.run(ctx(), async () => {
      await svc.moveStage('d_1', { stageId: 's_lost', lostReason: 'Too expensive' });
    });
    const args = prisma.deal.update.mock.calls[0][0];
    expect(args.data.status).toBe('LOST');
    expect(args.data.lostAt).toBeInstanceOf(Date);
  });

  it('throws when moving to Won without wonReason', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({ id: 'd_1', workspaceId: 'ws_1', pipelineId: 'pip_1' });
    prisma.stage.findUnique.mockResolvedValue({
      id: 's_won',
      pipelineId: 'pip_1',
      name: 'Won',
      isWon: true,
      isLost: false,
    });
    await expect(
      tenant.run(ctx(), async () => svc.moveStage('d_1', { stageId: 's_won' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when moving to Lost without lostReason', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({ id: 'd_1', workspaceId: 'ws_1', pipelineId: 'pip_1' });
    prisma.stage.findUnique.mockResolvedValue({
      id: 's_lost',
      pipelineId: 'pip_1',
      name: 'Lost',
      isWon: false,
      isLost: true,
    });
    await expect(
      tenant.run(ctx(), async () => svc.moveStage('d_1', { stageId: 's_lost' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resets to OPEN when moving to regular stage', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({ id: 'd_1', workspaceId: 'ws_1', pipelineId: 'pip_1' });
    prisma.stage.findUnique.mockResolvedValue({
      id: 's_reg',
      pipelineId: 'pip_1',
      name: 'Proposal',
      probability: 40,
      isWon: false,
      isLost: false,
    });
    prisma.deal.update.mockResolvedValue({ id: 'd_1', status: 'OPEN', stage: {} });
    prisma.activity.create.mockResolvedValue({ id: 'a_1' });
    await tenant.run(ctx(), async () => {
      await svc.moveStage('d_1', { stageId: 's_reg' });
    });
    const args = prisma.deal.update.mock.calls[0][0];
    expect(args.data.status).toBe('OPEN');
    expect(args.data.wonAt).toBeNull();
    expect(args.data.lostAt).toBeNull();
  });

  it('throws when stage not in same pipeline', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({ id: 'd_1', workspaceId: 'ws_1', pipelineId: 'pip_1' });
    prisma.stage.findUnique.mockResolvedValue({ id: 's_x', pipelineId: 'pip_OTHER', isWon: false, isLost: false });
    await expect(
      tenant.run(ctx(), async () => svc.moveStage('d_1', { stageId: 's_x' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('DealService.archive', () => {
  it('sets archivedAt and audits DELETE', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({ id: 'd_1', workspaceId: 'ws_1' });
    prisma.deal.update.mockResolvedValue({ id: 'd_1', archivedAt: new Date() });
    await tenant.run(ctx(), async () => {
      await svc.archive('d_1');
    });
    expect(prisma.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'd_1' },
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Deal', action: 'DELETE' }),
    );
  });
});

describe('DealService.kanban', () => {
  it('returns stages with grouped deals', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pipeline.findUnique.mockResolvedValue({ id: 'pip_1', workspaceId: 'ws_1' });
    prisma.stage.findMany.mockResolvedValue([
      { id: 's_1', name: 'Qualified', order: 0 },
      { id: 's_2', name: 'Proposal', order: 1 },
    ]);
    prisma.deal.findMany.mockResolvedValue([
      { id: 'd_1', stageId: 's_1' },
      { id: 'd_2', stageId: 's_1' },
      { id: 'd_3', stageId: 's_2' },
    ]);
    const result = await tenant.run(ctx(), async () => svc.kanban('pip_1'));
    expect(result.stages[0].deals).toHaveLength(2);
    expect(result.stages[1].deals).toHaveLength(1);
  });
});
