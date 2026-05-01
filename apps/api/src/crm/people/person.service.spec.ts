import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PersonService } from './person.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    person: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (fn: any) => {
      // Run with a fake tx that proxies onto prisma itself.
      return fn(prismaSingleton);
    }),
  };
}

let prismaSingleton: any;

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
  };
}

function makeMetadata(allowedFieldKeys = ['fullName', 'email', 'phone', 'industry', 'website']) {
  return {
    getEntity: jest.fn().mockResolvedValue({
      entityType: 'Person',
      labelSingular: { ar: '', en: '' },
      labelPlural: { ar: '', en: '' },
      fields: allowedFieldKeys.map((k) => ({ key: k, label: { ar: '', en: '' }, type: 'TEXT' })),
    }),
  };
}

function buildSvc(opts?: { allowedFieldKeys?: string[] }) {
  prismaSingleton = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const metadata = makeMetadata(opts?.allowedFieldKeys);
  const svc = new PersonService(prismaSingleton as any, tenant, audit as any, metadata as any);
  return { svc, tenant, prisma: prismaSingleton, audit, metadata };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('PersonService.create', () => {
  it('populates workspaceId from tenant context, normalizes email/phone, computes fullName', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.person.create.mockResolvedValue({
      id: 'p_1',
      fullName: 'Ahmed Yousry',
      lifecycleStage: 'LEAD',
      isCompany: false,
    });
    await tenant.run(ctx(), async () => {
      await svc.create({
        firstName: 'Ahmed',
        lastName: 'Yousry',
        email: ' Foo@Bar.COM ',
        phone: '+20 (10) 1234-5678',
      });
    });
    const args = prisma.person.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.fullName).toBe('Ahmed Yousry');
    expect(args.data.emailNormalized).toBe('foo@bar.com');
    expect(args.data.phoneNormalized).toBe('+201012345678');
    expect(args.data.createdById).toBe('u_1');
  });

  it('uses companyName for fullName when isCompany=true', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.person.create.mockResolvedValue({
      id: 'c_1',
      fullName: 'Acme Inc',
      isCompany: true,
      lifecycleStage: 'LEAD',
    });
    await tenant.run(ctx(), async () => {
      await svc.create({ isCompany: true, companyName: 'Acme Inc' });
    });
    const args = prisma.person.create.mock.calls[0][0];
    expect(args.data.fullName).toBe('Acme Inc');
    expect(args.data.isCompany).toBe(true);
  });

  it('throws BadRequest when person has no name/email/companyName', async () => {
    const { svc, tenant } = buildSvc();
    await expect(
      tenant.run(ctx(), async () => {
        await svc.create({});
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws BadRequest when isCompany=true but no companyName', async () => {
    const { svc, tenant } = buildSvc();
    await expect(
      tenant.run(ctx(), async () => {
        await svc.create({ isCompany: true });
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unknown customField keys via metadata validation', async () => {
    const { svc, tenant } = buildSvc({ allowedFieldKeys: ['fullName', 'email'] });
    await expect(
      tenant.run(ctx(), async () => {
        await svc.create({
          firstName: 'Ahmed',
          customFields: { evil: 'value', industry: 'tech' },
        });
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('writes CREATE audit log on create', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.person.create.mockResolvedValue({
      id: 'p_2',
      fullName: 'Sara',
      lifecycleStage: 'LEAD',
      isCompany: false,
    });
    await tenant.run(ctx(), async () => {
      await svc.create({ firstName: 'Sara' });
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Person',
        entityId: 'p_2',
        action: 'CREATE',
      }),
    );
  });
});

describe('PersonService.list', () => {
  it('filters by isCompany, ownerId, lifecycleStage and excludes archived', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.person.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () => {
      await svc.list({ isCompany: false, ownerId: 'u_owner', lifecycleStage: 'LEAD' });
    });
    const args = prisma.person.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      workspaceId: 'ws_1',
      archivedAt: null,
      isCompany: false,
      ownerId: 'u_owner',
      lifecycleStage: 'LEAD',
    });
  });

  it('cursor-paginates with nextCursor when hasMore', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const rows = Array.from({ length: 3 }, (_, i) => ({ id: `p_${i}`, fullName: `P${i}` }));
    prisma.person.findMany.mockResolvedValue(rows);
    const result = await tenant.run(ctx(), async () => {
      return svc.list({ limit: 2 });
    });
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('p_1');
  });
});

describe('PersonService.update', () => {
  it('recomputes fullName when name fields change', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.person.findUnique.mockResolvedValue({
      id: 'p_1',
      workspaceId: 'ws_1',
      isCompany: false,
      firstName: 'Ahmed',
      lastName: 'Yousry',
      email: null,
      companyName: null,
    });
    prisma.person.update.mockResolvedValue({ id: 'p_1', fullName: 'Ahmed Khaled', isCompany: false });
    await tenant.run(ctx(), async () => {
      await svc.update('p_1', { lastName: 'Khaled' });
    });
    const args = prisma.person.update.mock.calls[0][0];
    expect(args.data.fullName).toBe('Ahmed Khaled');
  });

  it('audits via logUpdate', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.person.findUnique.mockResolvedValue({
      id: 'p_1',
      workspaceId: 'ws_1',
      isCompany: false,
      firstName: 'A',
      lastName: 'B',
      email: null,
      companyName: null,
    });
    prisma.person.update.mockResolvedValue({ id: 'p_1' });
    await tenant.run(ctx(), async () => {
      await svc.update('p_1', { firstName: 'A2' });
    });
    expect(audit.logUpdate).toHaveBeenCalledWith('Person', 'p_1', expect.any(Object), expect.any(Object));
  });

  it('throws NotFound when not in workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.person.findUnique.mockResolvedValue({ id: 'p_1', workspaceId: 'OTHER' });
    await expect(
      tenant.run(ctx(), async () => {
        await svc.update('p_1', { firstName: 'X' });
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PersonService.archive', () => {
  it('sets archivedAt and writes DELETE audit', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.person.findUnique.mockResolvedValue({ id: 'p_1', workspaceId: 'ws_1', isCompany: false });
    prisma.person.update.mockResolvedValue({ id: 'p_1', archivedAt: new Date() });
    await tenant.run(ctx(), async () => {
      await svc.archive('p_1');
    });
    expect(prisma.person.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p_1' },
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Person', entityId: 'p_1', action: 'DELETE' }),
    );
  });
});

describe('PersonService.findDuplicates', () => {
  it('searches by emailNormalized OR phoneNormalized in same workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.person.findMany.mockResolvedValue([{ id: 'p_dup' }]);
    await tenant.run(ctx(), async () => {
      await svc.findDuplicates('Foo@bar.com', '+20 10 1234');
    });
    const args = prisma.person.findMany.mock.calls[0][0];
    expect(args.where.workspaceId).toBe('ws_1');
    expect(args.where.archivedAt).toBeNull();
    expect(args.where.OR).toEqual([
      { emailNormalized: 'foo@bar.com' },
      { phoneNormalized: '+20101234' },
    ]);
  });

  it('returns empty when no email/phone provided', async () => {
    const { svc, tenant } = buildSvc();
    const result = await tenant.run(ctx(), async () => svc.findDuplicates());
    expect(result.items).toEqual([]);
  });
});

describe('PersonService.merge', () => {
  it('archives merged people and audits each', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.person.findUnique.mockImplementation(async ({ where }: any) => {
      if (where.id === 'primary') return { id: 'primary', workspaceId: 'ws_1' };
      if (where.id === 'm1') return { id: 'm1', workspaceId: 'ws_1' };
      return null;
    });
    prisma.person.update.mockResolvedValue({ id: 'm1', archivedAt: new Date() });
    await tenant.run(ctx(), async () => {
      await svc.merge({ primaryId: 'primary', mergedIds: ['m1'] });
    });
    expect(prisma.person.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm1' },
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Person',
        entityId: 'm1',
        action: 'DELETE',
        newValue: { mergedInto: 'primary' },
      }),
    );
  });

  it('rejects merging primary into itself', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.person.findUnique.mockResolvedValue({ id: 'primary', workspaceId: 'ws_1' });
    await expect(
      tenant.run(ctx(), async () => {
        await svc.merge({ primaryId: 'primary', mergedIds: ['primary'] });
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
