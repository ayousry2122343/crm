import { NotFoundException } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    activity: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    deal: {
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
  const svc = new ActivityService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('ActivityService.create', () => {
  it('creates activity with workspaceId and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.activity.create.mockResolvedValue({
      id: 'a_1',
      type: 'CALL',
      subject: 'Follow up',
    });
    await tenant.run(ctx(), async () => {
      await svc.create({
        parentEntity: 'Deal',
        parentId: 'd_1',
        type: 'CALL',
        subject: 'Follow up',
      });
    });
    const args = prisma.activity.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.parentEntity).toBe('Deal');
    expect(args.data.type).toBe('CALL');
    expect(args.data.createdById).toBe('u_1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Activity', action: 'CREATE' }),
    );
  });

  it('rolls up lastActivityAt on Deal parent', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.activity.create.mockResolvedValue({ id: 'a_1', type: 'CALL', subject: 'X' });
    prisma.deal.update.mockResolvedValue({});
    await tenant.run(ctx(), async () => {
      await svc.create({
        parentEntity: 'Deal',
        parentId: 'd_1',
        type: 'CALL',
        subject: 'X',
      });
    });
    expect(prisma.deal.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'd_1' },
        data: { lastActivityAt: expect.any(Date) },
      }),
    );
  });

  it('does not rollup for Person parent', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.activity.create.mockResolvedValue({ id: 'a_1', type: 'NOTE', subject: 'X' });
    await tenant.run(ctx(), async () => {
      await svc.create({
        parentEntity: 'Person',
        parentId: 'p_1',
        type: 'NOTE',
        subject: 'X',
      });
    });
    expect(prisma.deal.update).not.toHaveBeenCalled();
  });
});

describe('ActivityService.list', () => {
  it('filters by parentEntity + parentId and paginates', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const rows = Array.from({ length: 3 }, (_, i) => ({ id: `a_${i}` }));
    prisma.activity.findMany.mockResolvedValue(rows);
    const result = await tenant.run(ctx(), async () =>
      svc.list({ parentEntity: 'Deal', parentId: 'd_1', limit: 2 }),
    );
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('a_1');
    const args = prisma.activity.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      workspaceId: 'ws_1',
      parentEntity: 'Deal',
      parentId: 'd_1',
    });
  });
});

describe('ActivityService.get', () => {
  it('returns activity when found', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.activity.findUnique.mockResolvedValue({ id: 'a_1', workspaceId: 'ws_1' });
    const result = await tenant.run(ctx(), async () => svc.get('a_1'));
    expect(result.id).toBe('a_1');
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.activity.findUnique.mockResolvedValue({ id: 'a_1', workspaceId: 'OTHER' });
    await expect(
      tenant.run(ctx(), async () => svc.get('a_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ActivityService.update', () => {
  it('updates fields and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.activity.findUnique.mockResolvedValue({ id: 'a_1', workspaceId: 'ws_1' });
    prisma.activity.update.mockResolvedValue({ id: 'a_1', subject: 'Updated' });
    await tenant.run(ctx(), async () => {
      await svc.update('a_1', { subject: 'Updated' });
    });
    const args = prisma.activity.update.mock.calls[0][0];
    expect(args.data.subject).toBe('Updated');
    expect(audit.logUpdate).toHaveBeenCalledWith('Activity', 'a_1', expect.any(Object), expect.any(Object));
  });
});

describe('ActivityService.complete', () => {
  it('sets status DONE and completedAt', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.activity.findUnique.mockResolvedValue({ id: 'a_1', workspaceId: 'ws_1' });
    prisma.activity.update.mockResolvedValue({ id: 'a_1', status: 'DONE' });
    await tenant.run(ctx(), async () => {
      await svc.complete('a_1');
    });
    const args = prisma.activity.update.mock.calls[0][0];
    expect(args.data.status).toBe('DONE');
    expect(args.data.completedAt).toBeInstanceOf(Date);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Activity', action: 'UPDATE', newValue: { status: 'DONE' } }),
    );
  });
});

describe('ActivityService.cancel', () => {
  it('sets status CANCELED', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.activity.findUnique.mockResolvedValue({ id: 'a_1', workspaceId: 'ws_1' });
    prisma.activity.update.mockResolvedValue({ id: 'a_1', status: 'CANCELED' });
    await tenant.run(ctx(), async () => {
      await svc.cancel('a_1');
    });
    const args = prisma.activity.update.mock.calls[0][0];
    expect(args.data.status).toBe('CANCELED');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ newValue: { status: 'CANCELED' } }),
    );
  });
});
