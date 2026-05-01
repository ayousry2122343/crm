import { ConflictException, NotFoundException } from '@nestjs/common';
import { TagService } from './tag.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    tag: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    entityTag: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
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
  const svc = new TagService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('TagService.create', () => {
  it('creates a tag with default color when not given', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.tag.findFirst.mockResolvedValue(null);
    prisma.tag.create.mockResolvedValue({ id: 't1', name: 'VIP', color: '#6366f1' });
    await tenant.run(ctx(), async () => {
      await svc.create({ name: 'VIP' });
    });
    const args = prisma.tag.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.name).toBe('VIP');
  });

  it('rejects duplicate name in workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.tag.findFirst.mockResolvedValue({ id: 'existing', name: 'VIP' });
    await expect(
      tenant.run(ctx(), async () => svc.create({ name: 'VIP' })),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('TagService.list', () => {
  it('lists tags scoped by workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.tag.findMany.mockResolvedValue([{ id: 't1', name: 'VIP' }]);
    await tenant.run(ctx(), async () => svc.list());
    expect(prisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: 'ws_1' } }),
    );
  });
});

describe('TagService.update', () => {
  it('renames + recolors', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.tag.findUnique.mockResolvedValue({ id: 't1', workspaceId: 'ws_1', name: 'VIP', color: '#fff' });
    prisma.tag.update.mockResolvedValue({ id: 't1', name: 'VIP+', color: '#000' });
    await tenant.run(ctx(), async () => {
      await svc.update('t1', { name: 'VIP+', color: '#000' });
    });
    expect(prisma.tag.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 't1' }, data: { name: 'VIP+', color: '#000' } }),
    );
  });

  it('throws NotFound when tag not in workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.tag.findUnique.mockResolvedValue({ id: 't1', workspaceId: 'OTHER' });
    await expect(
      tenant.run(ctx(), async () => svc.update('t1', { name: 'X' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('TagService.delete', () => {
  it('deletes tag (cascade handled by prisma onDelete)', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.tag.findUnique.mockResolvedValue({ id: 't1', workspaceId: 'ws_1' });
    prisma.tag.delete.mockResolvedValue({ id: 't1' });
    await tenant.run(ctx(), async () => svc.delete('t1'));
    expect(prisma.tag.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
  });
});

describe('TagService.assign', () => {
  it('bulk-creates EntityTag rows for multiple entityIds (skipDuplicates)', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.tag.findUnique.mockResolvedValue({ id: 't1', workspaceId: 'ws_1' });
    prisma.entityTag.createMany.mockResolvedValue({ count: 2 });
    await tenant.run(ctx(), async () => {
      await svc.assign('t1', { entityType: 'Person', entityIds: ['p1', 'p2'] });
    });
    const args = prisma.entityTag.createMany.mock.calls[0][0];
    expect(args.skipDuplicates).toBe(true);
    expect(args.data).toEqual([
      { workspaceId: 'ws_1', tagId: 't1', entityType: 'Person', entityId: 'p1' },
      { workspaceId: 'ws_1', tagId: 't1', entityType: 'Person', entityId: 'p2' },
    ]);
  });

  it('throws NotFound when tag missing', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.tag.findUnique.mockResolvedValue(null);
    await expect(
      tenant.run(ctx(), async () => svc.assign('t-missing', { entityType: 'Person', entityIds: ['p1'] })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('TagService.unassign', () => {
  it('bulk-deletes EntityTag rows', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.tag.findUnique.mockResolvedValue({ id: 't1', workspaceId: 'ws_1' });
    prisma.entityTag.deleteMany.mockResolvedValue({ count: 2 });
    await tenant.run(ctx(), async () => {
      await svc.unassign('t1', { entityType: 'Person', entityIds: ['p1', 'p2'] });
    });
    expect(prisma.entityTag.deleteMany).toHaveBeenCalledWith({
      where: {
        workspaceId: 'ws_1',
        tagId: 't1',
        entityType: 'Person',
        entityId: { in: ['p1', 'p2'] },
      },
    });
  });
});
