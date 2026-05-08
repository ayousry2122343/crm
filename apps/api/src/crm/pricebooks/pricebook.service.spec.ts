import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { PricebookService } from './pricebook.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    pricebook: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    pricebookEntry: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
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
  const svc = new PricebookService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

// ─── Pricebook CRUD ───

describe('PricebookService.create', () => {
  it('creates pricebook with workspace scope', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.pricebook.findFirst.mockResolvedValue(null);
    prisma.pricebook.create.mockResolvedValue({
      id: 'pb_1',
      workspaceId: 'ws_1',
      name: 'Standard',
      isDefault: false,
    });
    const result = await tenant.run(ctx(), async () =>
      svc.create({ name: 'Standard', currency: 'EGP' }),
    );
    expect(result.id).toBe('pb_1');
    const args = prisma.pricebook.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Pricebook', action: 'CREATE' }),
    );
  });

  it('throws ConflictException on duplicate name', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pricebook.findFirst.mockResolvedValue({ id: 'pb_x' });
    await expect(
      tenant.run(ctx(), async () => svc.create({ name: 'Dup', currency: 'EGP' })),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('unsets other defaults when creating a default pricebook', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pricebook.findFirst.mockResolvedValue(null);
    prisma.pricebook.create.mockResolvedValue({
      id: 'pb_1',
      workspaceId: 'ws_1',
      name: 'Default',
      isDefault: true,
    });
    await tenant.run(ctx(), async () =>
      svc.create({ name: 'Default', currency: 'EGP', isDefault: true }),
    );
    expect(prisma.pricebook.updateMany).toHaveBeenCalledWith({
      where: { workspaceId: 'ws_1', isDefault: true },
      data: { isDefault: false },
    });
  });
});

describe('PricebookService.list', () => {
  it('returns all non-archived pricebooks', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pricebook.findMany.mockResolvedValue([
      { id: 'pb_1', name: 'Standard' },
    ]);
    const result = await tenant.run(ctx(), async () => svc.list());
    expect(result).toHaveLength(1);
    const args = prisma.pricebook.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      workspaceId: 'ws_1',
      archivedAt: null,
    });
  });
});

describe('PricebookService.get', () => {
  it('returns pricebook with entries', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pricebook.findUnique.mockResolvedValue({
      id: 'pb_1',
      workspaceId: 'ws_1',
      archivedAt: null,
      entries: [],
    });
    const result = await tenant.run(ctx(), async () => svc.get('pb_1'));
    expect(result.id).toBe('pb_1');
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pricebook.findUnique.mockResolvedValue({
      id: 'pb_1',
      workspaceId: 'OTHER',
      archivedAt: null,
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('pb_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PricebookService.update', () => {
  it('updates pricebook and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.pricebook.findUnique.mockResolvedValue({
      id: 'pb_1',
      workspaceId: 'ws_1',
      name: 'Old',
    });
    prisma.pricebook.update.mockResolvedValue({
      id: 'pb_1',
      name: 'New',
    });
    await tenant.run(ctx(), async () => {
      await svc.update('pb_1', { name: 'New' });
    });
    expect(audit.logUpdate).toHaveBeenCalledWith(
      'Pricebook',
      'pb_1',
      expect.any(Object),
      expect.any(Object),
    );
  });
});

describe('PricebookService.archive', () => {
  it('sets archivedAt and audits DELETE', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.pricebook.findUnique.mockResolvedValue({
      id: 'pb_1',
      workspaceId: 'ws_1',
    });
    prisma.pricebook.update.mockResolvedValue({
      id: 'pb_1',
      archivedAt: new Date(),
    });
    await tenant.run(ctx(), async () => {
      await svc.archive('pb_1');
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Pricebook', action: 'DELETE' }),
    );
  });
});

// ─── PricebookEntry ───

describe('PricebookService.setEntry', () => {
  it('creates/updates entry after validating product', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pricebook.findUnique.mockResolvedValue({
      id: 'pb_1',
      workspaceId: 'ws_1',
      archivedAt: null,
    });
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod_1',
      workspaceId: 'ws_1',
      archivedAt: null,
    });
    prisma.pricebookEntry.upsert.mockResolvedValue({
      id: 'pbe_1',
      pricebookId: 'pb_1',
      productId: 'prod_1',
      unitPrice: 99,
      minQty: 1,
    });
    const result = await tenant.run(ctx(), async () =>
      svc.setEntry('pb_1', {
        productId: 'prod_1',
        unitPrice: 99,
        minQty: 1,
      }),
    );
    expect(result.unitPrice).toBe(99);
  });

  it('throws when product not in workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pricebook.findUnique.mockResolvedValue({
      id: 'pb_1',
      workspaceId: 'ws_1',
      archivedAt: null,
    });
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod_1',
      workspaceId: 'OTHER',
    });
    await expect(
      tenant.run(ctx(), async () =>
        svc.setEntry('pb_1', { productId: 'prod_1', unitPrice: 99 }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when pricebook not found', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pricebook.findUnique.mockResolvedValue(null);
    await expect(
      tenant.run(ctx(), async () =>
        svc.setEntry('bad', { productId: 'prod_1', unitPrice: 99 }),
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('PricebookService.removeEntry', () => {
  it('removes entry after validating ownership', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pricebookEntry.findUnique.mockResolvedValue({
      id: 'pbe_1',
      workspaceId: 'ws_1',
    });
    prisma.pricebookEntry.delete.mockResolvedValue({ id: 'pbe_1' });
    await tenant.run(ctx(), async () => {
      await svc.removeEntry('pbe_1');
    });
    expect(prisma.pricebookEntry.delete).toHaveBeenCalledWith({
      where: { id: 'pbe_1' },
    });
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.pricebookEntry.findUnique.mockResolvedValue({
      id: 'pbe_1',
      workspaceId: 'OTHER',
    });
    await expect(
      tenant.run(ctx(), async () => svc.removeEntry('pbe_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
