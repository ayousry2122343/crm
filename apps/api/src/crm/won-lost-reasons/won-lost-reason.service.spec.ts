import { NotFoundException } from '@nestjs/common';
import { WonLostReasonService } from './won-lost-reason.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    wonLostReason: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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
  const svc = new WonLostReasonService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('WonLostReasonService.create', () => {
  it('creates reason with workspaceId and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.wonLostReason.create.mockResolvedValue({
      id: 'wlr_1',
      kind: 'WON',
      label: 'Best price',
    });
    await tenant.run(ctx(), async () => {
      await svc.create({ kind: 'WON', label: 'Best price' });
    });
    const args = prisma.wonLostReason.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.kind).toBe('WON');
    expect(args.data.label).toBe('Best price');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'WonLostReason', action: 'CREATE' }),
    );
  });
});

describe('WonLostReasonService.list', () => {
  it('filters by kind and excludes archived', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.wonLostReason.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () => {
      await svc.list({ kind: 'LOST' });
    });
    const args = prisma.wonLostReason.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      workspaceId: 'ws_1',
      kind: 'LOST',
      archivedAt: null,
    });
  });

  it('includes archived when requested', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.wonLostReason.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () => {
      await svc.list({ includeArchived: true });
    });
    const args = prisma.wonLostReason.findMany.mock.calls[0][0];
    expect(args.where.archivedAt).toBeUndefined();
  });
});

describe('WonLostReasonService.get', () => {
  it('returns reason when found', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.wonLostReason.findUnique.mockResolvedValue({ id: 'wlr_1', workspaceId: 'ws_1' });
    const result = await tenant.run(ctx(), async () => svc.get('wlr_1'));
    expect(result.id).toBe('wlr_1');
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.wonLostReason.findUnique.mockResolvedValue({ id: 'wlr_1', workspaceId: 'OTHER' });
    await expect(
      tenant.run(ctx(), async () => svc.get('wlr_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('WonLostReasonService.update', () => {
  it('updates label and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.wonLostReason.findUnique.mockResolvedValue({ id: 'wlr_1', workspaceId: 'ws_1' });
    prisma.wonLostReason.update.mockResolvedValue({ id: 'wlr_1', label: 'New label' });
    await tenant.run(ctx(), async () => {
      await svc.update('wlr_1', { label: 'New label' });
    });
    const args = prisma.wonLostReason.update.mock.calls[0][0];
    expect(args.data.label).toBe('New label');
    expect(audit.logUpdate).toHaveBeenCalled();
  });
});

describe('WonLostReasonService.archive', () => {
  it('sets archivedAt and audits DELETE', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.wonLostReason.findUnique.mockResolvedValue({ id: 'wlr_1', workspaceId: 'ws_1' });
    prisma.wonLostReason.update.mockResolvedValue({ id: 'wlr_1', archivedAt: new Date() });
    await tenant.run(ctx(), async () => {
      await svc.archive('wlr_1');
    });
    expect(prisma.wonLostReason.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'WonLostReason', action: 'DELETE' }),
    );
  });
});
