import { NotFoundException } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    webhook: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    webhookDelivery: { findMany: jest.fn() },
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
  const svc = new WebhookService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1') => ({
  workspaceId,
  userId: 'u_1',
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('WebhookService.create', () => {
  it('creates webhook with workspaceId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.webhook.create.mockResolvedValue({ id: 'wh_1', url: 'https://hook.example.com' });
    await tenant.run(ctx(), async () => {
      await svc.create({
        url: 'https://hook.example.com',
        secret: 's3cret',
        events: ['person.created'],
      });
    });
    const data = prisma.webhook.create.mock.calls[0][0].data;
    expect(data.workspaceId).toBe('ws_1');
    expect(data.url).toBe('https://hook.example.com');
  });
});

describe('WebhookService.get', () => {
  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.webhook.findUnique.mockResolvedValue({ id: 'wh_1', workspaceId: 'ws_other' });
    await tenant.run(ctx(), async () => {
      await expect(svc.get('wh_1')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('WebhookService.archive', () => {
  it('sets archivedAt', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.webhook.findUnique.mockResolvedValue({ id: 'wh_1', workspaceId: 'ws_1' });
    prisma.webhook.update.mockResolvedValue({});
    await tenant.run(ctx(), async () => {
      await svc.archive('wh_1');
    });
    const updateData = prisma.webhook.update.mock.calls[0][0].data;
    expect(updateData.archivedAt).toBeInstanceOf(Date);
  });
});

describe('WebhookService.listDeliveries', () => {
  it('returns deliveries for owned webhook', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.webhook.findUnique.mockResolvedValue({ id: 'wh_1', workspaceId: 'ws_1' });
    prisma.webhookDelivery.findMany.mockResolvedValue([{ id: 'del_1' }]);
    await tenant.run(ctx(), async () => {
      const result = await svc.listDeliveries('wh_1');
      expect(result).toHaveLength(1);
    });
  });
});
