import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ProductService } from './product.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    productCategory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
  const svc = new ProductService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

// ─── ProductCategory ───

describe('ProductService.createCategory', () => {
  it('creates a category with workspace scope', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.productCategory.findFirst.mockResolvedValue(null);
    prisma.productCategory.create.mockResolvedValue({
      id: 'cat_1',
      workspaceId: 'ws_1',
      name: 'Software',
    });
    const result = await tenant.run(ctx(), async () =>
      svc.createCategory({ name: 'Software' }),
    );
    expect(result.id).toBe('cat_1');
    const args = prisma.productCategory.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
  });

  it('throws ConflictException on duplicate name', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.productCategory.findFirst.mockResolvedValue({ id: 'cat_x' });
    await expect(
      tenant.run(ctx(), async () => svc.createCategory({ name: 'Dup' })),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('ProductService.listCategories', () => {
  it('returns categories for workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.productCategory.findMany.mockResolvedValue([
      { id: 'cat_1', name: 'Hardware' },
    ]);
    const result = await tenant.run(ctx(), async () => svc.listCategories());
    expect(result).toHaveLength(1);
    const args = prisma.productCategory.findMany.mock.calls[0][0];
    expect(args.where.workspaceId).toBe('ws_1');
  });
});

// ─── Product ───

describe('ProductService.create', () => {
  it('creates a product with workspace scope and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.product.create.mockResolvedValue({
      id: 'prod_1',
      workspaceId: 'ws_1',
      name: 'Widget',
      sku: 'WDG-001',
      unitPrice: 100,
    });
    await tenant.run(ctx(), async () => {
      await svc.create({
        name: 'Widget',
        sku: 'WDG-001',
        unitPrice: 100,
      });
    });
    const args = prisma.product.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.name).toBe('Widget');
    expect(args.data.sku).toBe('WDG-001');
    expect(args.data.createdById).toBe('u_1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Product', action: 'CREATE' }),
    );
  });

  it('throws ConflictException on duplicate SKU', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.product.create.mockRejectedValue({ code: 'P2002' });
    await expect(
      tenant.run(ctx(), async () =>
        svc.create({ name: 'X', sku: 'DUP', unitPrice: 10 }),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('validates categoryId belongs to workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.productCategory.findUnique.mockResolvedValue({
      id: 'cat_1',
      workspaceId: 'OTHER',
    });
    await expect(
      tenant.run(ctx(), async () =>
        svc.create({ name: 'X', unitPrice: 10, categoryId: 'cat_1' }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ProductService.list', () => {
  it('returns paginated products with filters', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: `p_${i}`,
      name: `P${i}`,
    }));
    prisma.product.findMany.mockResolvedValue(rows);
    const result = await tenant.run(ctx(), async () =>
      svc.list({ isActive: true, limit: 2 }),
    );
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('p_1');
    const args = prisma.product.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      workspaceId: 'ws_1',
      archivedAt: null,
      isActive: true,
    });
  });

  it('filters by categoryId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.product.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () =>
      svc.list({ categoryId: 'cat_1' }),
    );
    const args = prisma.product.findMany.mock.calls[0][0];
    expect(args.where.categoryId).toBe('cat_1');
  });

  it('supports search filter', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.product.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () => svc.list({ search: 'widget' }));
    const args = prisma.product.findMany.mock.calls[0][0];
    expect(args.where.OR).toBeDefined();
  });
});

describe('ProductService.get', () => {
  it('returns product by id', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod_1',
      workspaceId: 'ws_1',
      archivedAt: null,
    });
    const result = await tenant.run(ctx(), async () => svc.get('prod_1'));
    expect(result.id).toBe('prod_1');
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod_1',
      workspaceId: 'OTHER',
      archivedAt: null,
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('prod_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException for archived product', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod_1',
      workspaceId: 'ws_1',
      archivedAt: new Date(),
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('prod_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProductService.update', () => {
  it('updates fields and audits changes', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod_1',
      workspaceId: 'ws_1',
      name: 'Old',
    });
    prisma.product.update.mockResolvedValue({
      id: 'prod_1',
      name: 'New',
      category: null,
    });
    await tenant.run(ctx(), async () => {
      await svc.update('prod_1', { name: 'New', unitPrice: 200 });
    });
    const args = prisma.product.update.mock.calls[0][0];
    expect(args.data.name).toBe('New');
    expect(args.data.unitPrice).toBe(200);
    expect(audit.logUpdate).toHaveBeenCalledWith(
      'Product',
      'prod_1',
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('throws NotFoundException for non-existent product', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(
      tenant.run(ctx(), async () => svc.update('bad', { name: 'X' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProductService.archive', () => {
  it('sets archivedAt and audits DELETE', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod_1',
      workspaceId: 'ws_1',
    });
    prisma.product.update.mockResolvedValue({
      id: 'prod_1',
      archivedAt: new Date(),
    });
    await tenant.run(ctx(), async () => {
      await svc.archive('prod_1');
    });
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Product', action: 'DELETE' }),
    );
  });
});
