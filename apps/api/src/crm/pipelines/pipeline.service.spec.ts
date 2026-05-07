import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    pipeline: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    stage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    deal: {
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
  const svc = new PipelineService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('PipelineService.create', () => {
  it('creates pipeline with workspaceId and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.pipeline.create.mockResolvedValue({
      id: 'pip_1',
      name: 'Sales',
      entityType: 'Deal',
      isDefault: false,
      stages: [],
    });
    await tenant.run(ctx(), async () => {
      await svc.create({ name: 'Sales' });
    });
    const args = prisma.pipeline.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.name).toBe('Sales');
    expect(args.data.entityType).toBe('Deal');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Pipeline', action: 'CREATE' }),
    );
  });
});

describe('PipelineService.list', () => {
  it('filters by entityType and excludes archived by default', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pipeline.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () => {
      await svc.list({ entityType: 'Deal' });
    });
    const args = prisma.pipeline.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      workspaceId: 'ws_1',
      entityType: 'Deal',
      archivedAt: null,
    });
  });

  it('includes archived when requested', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pipeline.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () => {
      await svc.list({ includeArchived: true });
    });
    const args = prisma.pipeline.findMany.mock.calls[0][0];
    expect(args.where.archivedAt).toBeUndefined();
  });
});

describe('PipelineService.get', () => {
  it('returns pipeline with stages when found', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pipeline.findUnique.mockResolvedValue({
      id: 'pip_1',
      workspaceId: 'ws_1',
      stages: [{ id: 's_1', name: 'Qualified' }],
    });
    const result = await tenant.run(ctx(), async () => svc.get('pip_1'));
    expect(result.id).toBe('pip_1');
  });

  it('throws NotFoundException when not in workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pipeline.findUnique.mockResolvedValue({ id: 'pip_1', workspaceId: 'OTHER' });
    await expect(
      tenant.run(ctx(), async () => svc.get('pip_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PipelineService.update', () => {
  it('updates name and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.pipeline.findUnique.mockResolvedValue({ id: 'pip_1', workspaceId: 'ws_1', name: 'Old' });
    prisma.pipeline.update.mockResolvedValue({ id: 'pip_1', name: 'New', stages: [] });
    await tenant.run(ctx(), async () => {
      await svc.update('pip_1', { name: 'New' });
    });
    expect(prisma.pipeline.update.mock.calls[0][0].data.name).toBe('New');
    expect(audit.logUpdate).toHaveBeenCalledWith('Pipeline', 'pip_1', expect.any(Object), expect.any(Object));
  });
});

describe('PipelineService.createStage', () => {
  it('creates stage linked to pipeline after verifying workspace', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.pipeline.findUnique.mockResolvedValue({ id: 'pip_1', workspaceId: 'ws_1' });
    prisma.stage.create.mockResolvedValue({ id: 's_1', name: 'Qualified', pipelineId: 'pip_1' });
    await tenant.run(ctx(), async () => {
      await svc.createStage('pip_1', { name: 'Qualified', order: 0 });
    });
    const args = prisma.stage.create.mock.calls[0][0];
    expect(args.data.pipelineId).toBe('pip_1');
    expect(args.data.name).toBe('Qualified');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Stage', action: 'CREATE' }),
    );
  });

  it('throws NotFoundException if pipeline not in workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pipeline.findUnique.mockResolvedValue({ id: 'pip_1', workspaceId: 'OTHER' });
    await expect(
      tenant.run(ctx(), async () => svc.createStage('pip_1', { name: 'X', order: 0 })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PipelineService.updateStage', () => {
  it('updates stage fields after verifying workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.stage.findUnique.mockResolvedValue({
      id: 's_1',
      pipelineId: 'pip_1',
      pipeline: { workspaceId: 'ws_1' },
    });
    prisma.stage.update.mockResolvedValue({ id: 's_1', name: 'Updated' });
    await tenant.run(ctx(), async () => {
      await svc.updateStage('s_1', { name: 'Updated', probability: 50 });
    });
    const args = prisma.stage.update.mock.calls[0][0];
    expect(args.data.name).toBe('Updated');
    expect(args.data.probability).toBe(50);
  });
});

describe('PipelineService.deleteStage', () => {
  it('deletes stage when no deals are in it', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.stage.findUnique.mockResolvedValue({
      id: 's_1',
      name: 'Empty',
      pipelineId: 'pip_1',
      pipeline: { workspaceId: 'ws_1' },
    });
    prisma.deal.count.mockResolvedValue(0);
    await tenant.run(ctx(), async () => {
      await svc.deleteStage('s_1');
    });
    expect(prisma.stage.delete).toHaveBeenCalledWith({ where: { id: 's_1' } });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Stage', action: 'DELETE' }),
    );
  });

  it('throws BadRequest when deals exist in stage', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.stage.findUnique.mockResolvedValue({
      id: 's_1',
      name: 'Active',
      pipelineId: 'pip_1',
      pipeline: { workspaceId: 'ws_1' },
    });
    prisma.deal.count.mockResolvedValue(3);
    await expect(
      tenant.run(ctx(), async () => svc.deleteStage('s_1')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('PipelineService.seedDefault', () => {
  it('creates default pipeline with 5 stages when none exists', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pipeline.findFirst.mockResolvedValue(null);
    prisma.pipeline.create.mockResolvedValue({
      id: 'pip_default',
      name: 'Sales Pipeline',
      isDefault: true,
      stages: [],
    });
    await tenant.run(ctx(), async () => {
      await svc.seedDefault();
    });
    const args = prisma.pipeline.create.mock.calls[0][0];
    expect(args.data.name).toBe('Sales Pipeline');
    expect(args.data.isDefault).toBe(true);
    expect(args.data.stages.createMany.data).toHaveLength(5);
    expect(args.data.stages.createMany.data[3].isWon).toBe(true);
    expect(args.data.stages.createMany.data[4].isLost).toBe(true);
  });

  it('returns existing default pipeline without creating', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const existing = { id: 'pip_existing', isDefault: true };
    prisma.pipeline.findFirst.mockResolvedValue(existing);
    const result = await tenant.run(ctx(), async () => svc.seedDefault());
    expect(result).toBe(existing);
    expect(prisma.pipeline.create).not.toHaveBeenCalled();
  });
});
