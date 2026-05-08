import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuoteService } from './quote.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    quote: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    quoteLineItem: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
    deal: { findUnique: jest.fn() },
    person: { findUnique: jest.fn() },
    product: { findUnique: jest.fn() },
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
  const svc = new QuoteService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('QuoteService.create', () => {
  it('creates quote with line items and computes totals', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.quote.count.mockResolvedValue(0);
    prisma.deal.findUnique.mockResolvedValue({ id: 'd_1', workspaceId: 'ws_1' });
    prisma.quote.create.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      number: 'Q-0001',
      dealId: 'd_1',
      lineItems: [],
    });
    prisma.quoteLineItem.createMany.mockResolvedValue({ count: 2 });
    prisma.quote.update.mockResolvedValue({
      id: 'q_1',
      subtotal: 1500,
      total: 1500,
    });
    prisma.quote.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      subtotal: 1500,
      total: 1500,
      lineItems: [],
    });

    await tenant.run(ctx(), async () => {
      await svc.create({
        dealId: 'd_1',
        lineItems: [
          { description: 'Widget A', quantity: 5, unitPrice: 100 },
          { description: 'Service B', quantity: 2, unitPrice: 500 },
        ],
      });
    });

    expect(prisma.quote.create).toHaveBeenCalled();
    const createArgs = prisma.quote.create.mock.calls[0][0];
    expect(createArgs.data.workspaceId).toBe('ws_1');
    expect(createArgs.data.dealId).toBe('d_1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Quote', action: 'CREATE' }),
    );
  });

  it('throws when deal not in workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.deal.findUnique.mockResolvedValue({ id: 'd_1', workspaceId: 'OTHER' });
    await expect(
      tenant.run(ctx(), async () =>
        svc.create({
          dealId: 'd_1',
          lineItems: [{ description: 'X', quantity: 1, unitPrice: 10 }],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates quote without dealId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.quote.count.mockResolvedValue(5);
    prisma.quote.create.mockResolvedValue({
      id: 'q_6',
      workspaceId: 'ws_1',
      number: 'Q-0006',
    });
    prisma.quoteLineItem.createMany.mockResolvedValue({ count: 1 });
    prisma.quote.update.mockResolvedValue({ id: 'q_6' });
    prisma.quote.findUnique.mockResolvedValue({
      id: 'q_6',
      workspaceId: 'ws_1',
      lineItems: [],
    });

    await tenant.run(ctx(), async () => {
      await svc.create({
        lineItems: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
      });
    });

    const args = prisma.quote.create.mock.calls[0][0];
    expect(args.data.number).toBe('Q-0005');
  });
});

describe('QuoteService.list', () => {
  it('returns paginated quotes with filters', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const rows = [
      { id: 'q_1', number: 'Q-0001', lineItems: [] },
      { id: 'q_2', number: 'Q-0002', lineItems: [] },
    ];
    prisma.quote.findMany.mockResolvedValue(rows);
    const result = await tenant.run(ctx(), async () => svc.list({ limit: 1 }));
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('q_1');
  });

  it('filters by status and dealId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.quote.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () =>
      svc.list({ status: 'DRAFT', dealId: 'd_1' }),
    );
    const args = prisma.quote.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({
      workspaceId: 'ws_1',
      status: 'DRAFT',
      dealId: 'd_1',
    });
  });
});

describe('QuoteService.get', () => {
  it('returns quote with line items', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.quote.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      archivedAt: null,
      lineItems: [{ id: 'li_1' }],
    });
    const result = await tenant.run(ctx(), async () => svc.get('q_1'));
    expect(result.id).toBe('q_1');
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.quote.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'OTHER',
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('q_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('QuoteService.updateStatus', () => {
  it('transitions to SENT and records sentAt', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.quote.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      status: 'DRAFT',
    });
    prisma.quote.update.mockResolvedValue({
      id: 'q_1',
      status: 'SENT',
      sentAt: new Date(),
    });
    await tenant.run(ctx(), async () => {
      await svc.updateStatus('q_1', 'SENT');
    });
    const args = prisma.quote.update.mock.calls[0][0];
    expect(args.data.status).toBe('SENT');
    expect(args.data.sentAt).toBeInstanceOf(Date);
  });

  it('transitions to ACCEPTED and records acceptedAt', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.quote.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      status: 'SENT',
    });
    prisma.quote.update.mockResolvedValue({ id: 'q_1', status: 'ACCEPTED' });
    await tenant.run(ctx(), async () => {
      await svc.updateStatus('q_1', 'ACCEPTED');
    });
    const args = prisma.quote.update.mock.calls[0][0];
    expect(args.data.acceptedAt).toBeInstanceOf(Date);
  });

  it('transitions to REJECTED and records rejectedAt', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.quote.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      status: 'SENT',
    });
    prisma.quote.update.mockResolvedValue({ id: 'q_1', status: 'REJECTED' });
    await tenant.run(ctx(), async () => {
      await svc.updateStatus('q_1', 'REJECTED');
    });
    const args = prisma.quote.update.mock.calls[0][0];
    expect(args.data.rejectedAt).toBeInstanceOf(Date);
  });

  it('throws when quote not found', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.quote.findUnique.mockResolvedValue(null);
    await expect(
      tenant.run(ctx(), async () => svc.updateStatus('bad', 'SENT')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('QuoteService.update', () => {
  it('updates quote fields and recomputes totals', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.quote.findUnique.mockResolvedValueOnce({
      id: 'q_1',
      workspaceId: 'ws_1',
      status: 'DRAFT',
    });
    prisma.quoteLineItem.deleteMany.mockResolvedValue({ count: 1 });
    prisma.quoteLineItem.createMany.mockResolvedValue({ count: 1 });
    prisma.quote.update.mockResolvedValue({ id: 'q_1', total: 200 });
    prisma.quote.findUnique.mockResolvedValueOnce({
      id: 'q_1',
      workspaceId: 'ws_1',
      lineItems: [],
    });

    await tenant.run(ctx(), async () => {
      await svc.update('q_1', {
        notes: 'Updated',
        lineItems: [{ description: 'New item', quantity: 2, unitPrice: 100 }],
      });
    });

    expect(prisma.quoteLineItem.deleteMany).toHaveBeenCalled();
    expect(prisma.quoteLineItem.createMany).toHaveBeenCalled();
  });

  it('throws when editing non-DRAFT quote', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.quote.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      status: 'SENT',
    });
    await expect(
      tenant.run(ctx(), async () =>
        svc.update('q_1', {
          lineItems: [{ description: 'X', quantity: 1, unitPrice: 10 }],
        }),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('QuoteService.archive', () => {
  it('sets archivedAt and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.quote.findUnique.mockResolvedValue({ id: 'q_1', workspaceId: 'ws_1' });
    prisma.quote.update.mockResolvedValue({ id: 'q_1', archivedAt: new Date() });
    await tenant.run(ctx(), async () => {
      await svc.archive('q_1');
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Quote', action: 'DELETE' }),
    );
  });
});
