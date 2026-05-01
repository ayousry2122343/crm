import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ListService } from './list.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

const fields = (keys: string[]) =>
  keys.map((k) => ({ key: k, label: { ar: '', en: '' }, type: 'TEXT' }));

function makePrisma() {
  return {
    list: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    person: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
  };
}

function makeMetadata(allowed = ['email', 'fullName', 'lifecycleStage', 'customFields.industry']) {
  return {
    getEntity: jest.fn().mockResolvedValue({
      entityType: 'Person',
      labelSingular: { ar: '', en: '' },
      labelPlural: { ar: '', en: '' },
      fields: fields(allowed.filter((k) => !k.startsWith('customFields.'))).concat(
        allowed
          .filter((k) => k.startsWith('customFields.'))
          .map((k) => ({ key: k.slice('customFields.'.length), label: { ar: '', en: '' }, type: 'TEXT' })),
      ),
    }),
  };
}

function buildSvc(opts?: { allowed?: string[] }) {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const metadata = makeMetadata(opts?.allowed);
  const svc = new ListService(prisma as any, tenant, audit as any, metadata as any);
  return { svc, tenant, prisma, audit, metadata };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_owner') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('ListService.create', () => {
  it('creates active list with validated query against metadata', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.list.create.mockResolvedValue({ id: 'l_1', isActive: true });
    await tenant.run(ctx(), async () => {
      await svc.create({
        entityType: 'Person',
        name: 'Hot Leads',
        isActive: true,
        query: {
          filters: { op: 'AND', items: [{ field: 'lifecycleStage', op: 'eq', value: 'LEAD' }] },
        },
      });
    });
    const args = prisma.list.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.entityType).toBe('Person');
    expect(args.data.name).toBe('Hot Leads');
    expect(args.data.isActive).toBe(true);
    expect(args.data.ownerId).toBe('u_owner');
  });

  it('rejects query referencing unknown fields', async () => {
    const { svc, tenant } = buildSvc({ allowed: ['email'] });
    await expect(
      tenant.run(ctx(), async () => {
        await svc.create({
          entityType: 'Person',
          name: 'Bad',
          query: { filters: { op: 'AND', items: [{ field: 'unknown', op: 'eq', value: 1 }] } },
        });
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('snapshots memberIds when isActive=false', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.person.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    prisma.list.create.mockResolvedValue({ id: 'l_2', isActive: false, memberIds: ['p1', 'p2'] });
    await tenant.run(ctx(), async () => {
      await svc.create({
        entityType: 'Person',
        name: 'Snapshot',
        isActive: false,
        query: {
          filters: { op: 'AND', items: [{ field: 'lifecycleStage', op: 'eq', value: 'LEAD' }] },
        },
      });
    });
    const args = prisma.list.create.mock.calls[0][0];
    expect(args.data.memberIds).toEqual(['p1', 'p2']);
  });
});

describe('ListService.list', () => {
  it('filters by entityType', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.list.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () => svc.list({ entityType: 'Person' }));
    expect(prisma.list.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: 'ws_1', entityType: 'Person' }),
      }),
    );
  });
});

describe('ListService.members', () => {
  it('runs query for active lists', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.list.findUnique.mockResolvedValue({
      id: 'l_1',
      workspaceId: 'ws_1',
      entityType: 'Person',
      isActive: true,
      query: {
        filters: { op: 'AND', items: [{ field: 'lifecycleStage', op: 'eq', value: 'LEAD' }] },
      },
    });
    prisma.person.findMany.mockResolvedValue([{ id: 'p1' }]);
    const result = await tenant.run(ctx(), async () => svc.members('l_1', {}));
    expect(prisma.person.findMany).toHaveBeenCalled();
    expect(result.items).toEqual([{ id: 'p1' }]);
  });

  it('returns memberIds slice for static lists', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.list.findUnique.mockResolvedValue({
      id: 'l_2',
      workspaceId: 'ws_1',
      entityType: 'Person',
      isActive: false,
      memberIds: ['p1', 'p2', 'p3', 'p4'],
    });
    prisma.person.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    const result = await tenant.run(ctx(), async () => svc.members('l_2', { limit: 2 }));
    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: { in: ['p1', 'p2'] } }) }),
    );
    expect(result.items).toHaveLength(2);
  });

  it('throws NotFound when list not in workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.list.findUnique.mockResolvedValue({ id: 'l_1', workspaceId: 'OTHER' });
    await expect(
      tenant.run(ctx(), async () => svc.members('l_1', {})),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ListService.archive', () => {
  it('soft-deletes list and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.list.findUnique.mockResolvedValue({ id: 'l_1', workspaceId: 'ws_1', entityType: 'Person' });
    prisma.list.update.mockResolvedValue({ id: 'l_1', archivedAt: new Date() });
    await tenant.run(ctx(), async () => svc.archive('l_1'));
    expect(prisma.list.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'l_1' },
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'List', entityId: 'l_1', action: 'DELETE' }),
    );
  });
});
