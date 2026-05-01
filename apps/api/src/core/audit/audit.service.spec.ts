import { AuditService } from './audit.service';
import { TenantContextService } from '../tenant/tenant-context.service';

describe('AuditService', () => {
  let prisma: any;
  let tenant: TenantContextService;
  let svc: AuditService;

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'al_1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    tenant = new TenantContextService();
    svc = new AuditService(prisma, tenant);
  });

  it('log creates an AuditLog row using tenant context workspaceId', async () => {
    await tenant.run(
      { workspaceId: 'ws_1', userId: 'u_1', profileIds: [], permissionKeys: new Set() },
      async () => {
        await svc.log({
          entityType: 'Person',
          entityId: 'p_1',
          action: 'CREATE',
          newValue: { fullName: 'Ahmed' },
        });
      }
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'ws_1',
        entityType: 'Person',
        entityId: 'p_1',
        action: 'CREATE',
        userId: 'u_1',
      }),
    });
  });

  it('log skips silently when no tenant context and no override', async () => {
    await svc.log({
      entityType: 'Person',
      entityId: 'p_1',
      action: 'CREATE',
    });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('log uses workspaceId override when provided (even outside tenant context)', async () => {
    await svc.log(
      {
        entityType: 'Person',
        entityId: 'p_1',
        action: 'DELETE',
      },
      { workspaceId: 'ws_override', userId: 'u_admin' }
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'ws_override',
        userId: 'u_admin',
      }),
    });
  });

  it('logUpdate computes diff and writes one row per changed field', async () => {
    await tenant.run(
      { workspaceId: 'ws_1', userId: 'u_1', profileIds: [], permissionKeys: new Set() },
      async () => {
        await svc.logUpdate(
          'Person',
          'p_1',
          { fullName: 'Old', email: 'a@b.com', age: 30 },
          { fullName: 'New', email: 'a@b.com', age: 31 }
        );
      }
    );
    // fullName + age changed (email unchanged) → 2 calls.
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(2);
    const fields = prisma.auditLog.create.mock.calls.map((c: any) => c[0].data.fieldKey).sort();
    expect(fields).toEqual(['age', 'fullName']);
  });

  it('logUpdate writes nothing when before == after', async () => {
    await tenant.run(
      { workspaceId: 'ws_1', userId: 'u_1', profileIds: [], permissionKeys: new Set() },
      async () => {
        await svc.logUpdate('Person', 'p_1', { fullName: 'Same' }, { fullName: 'Same' });
      }
    );
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('listForRecord queries auditLog by entityType + entityId', async () => {
    await svc.listForRecord('Person', 'p_1');
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
      where: { entityType: 'Person', entityId: 'p_1' },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  });
});
