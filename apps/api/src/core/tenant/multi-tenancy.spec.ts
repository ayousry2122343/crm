import { NotFoundException } from '@nestjs/common';
import { PersonService } from '../../crm/people/person.service';
import { DealService } from '../../crm/deals/deal.service';
import { TenantContextService } from './tenant-context.service';

const ctx = (workspaceId: string, userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('Multi-tenancy isolation', () => {
  describe('PersonService', () => {
    function build() {
      const prisma = {
        person: {
          create: jest.fn(),
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        entityTag: {
          findMany: jest.fn().mockResolvedValue([]),
          createMany: jest.fn().mockResolvedValue({ count: 0 }),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        },
        $transaction: jest.fn(async (fn: any) => fn(prisma)),
      };
      const tenant = new TenantContextService();
      const audit = { log: jest.fn().mockResolvedValue(undefined), logUpdate: jest.fn().mockResolvedValue(undefined) };
      const metadata = {
        getEntity: jest.fn().mockResolvedValue({
          entityType: 'Person',
          labelSingular: { ar: '', en: '' },
          labelPlural: { ar: '', en: '' },
          fields: [{ key: 'fullName', label: { ar: '', en: '' }, type: 'TEXT' }],
        }),
      };
      const svc = new PersonService(prisma as any, tenant, audit as any, metadata as any);
      return { svc, tenant, prisma };
    }

    it('list only returns data for current workspace', async () => {
      const { svc, tenant, prisma } = build();
      prisma.person.findMany.mockResolvedValue([]);
      await tenant.run(ctx('ws_A'), async () => svc.list({}));
      expect(prisma.person.findMany.mock.calls[0][0].where.workspaceId).toBe('ws_A');
    });

    it('get rejects person from different workspace', async () => {
      const { svc, tenant, prisma } = build();
      prisma.person.findUnique.mockResolvedValue({ id: 'p_1', workspaceId: 'ws_B', archivedAt: null });
      await expect(
        tenant.run(ctx('ws_A'), async () => svc.get('p_1')),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('update rejects person from different workspace', async () => {
      const { svc, tenant, prisma } = build();
      prisma.person.findUnique.mockResolvedValue({ id: 'p_1', workspaceId: 'ws_B' });
      await expect(
        tenant.run(ctx('ws_A'), async () => svc.update('p_1', { firstName: 'X' })),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('archive rejects person from different workspace', async () => {
      const { svc, tenant, prisma } = build();
      prisma.person.findUnique.mockResolvedValue({ id: 'p_1', workspaceId: 'ws_B' });
      await expect(
        tenant.run(ctx('ws_A'), async () => svc.archive('p_1')),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('create stamps workspaceId from tenant context', async () => {
      const { svc, tenant, prisma } = build();
      prisma.person.create.mockResolvedValue({ id: 'p_1', fullName: 'Test', lifecycleStage: 'LEAD', isCompany: false });
      await tenant.run(ctx('ws_A'), async () => svc.create({ firstName: 'Test' }));
      expect(prisma.person.create.mock.calls[0][0].data.workspaceId).toBe('ws_A');
    });
  });

  describe('DealService', () => {
    function build() {
      const prisma = {
        pipeline: { findUnique: jest.fn() },
        stage: { findUnique: jest.fn(), findMany: jest.fn() },
        deal: {
          create: jest.fn(),
          findMany: jest.fn(),
          findUnique: jest.fn(),
          update: jest.fn(),
          count: jest.fn(),
        },
        activity: { create: jest.fn() },
      };
      const tenant = new TenantContextService();
      const audit = { log: jest.fn().mockResolvedValue(undefined), logUpdate: jest.fn().mockResolvedValue(undefined) };
      const svc = new DealService(prisma as any, tenant, audit as any);
      return { svc, tenant, prisma };
    }

    it('list scopes to current workspace', async () => {
      const { svc, tenant, prisma } = build();
      prisma.deal.findMany.mockResolvedValue([]);
      await tenant.run(ctx('ws_A'), async () => svc.list({}));
      expect(prisma.deal.findMany.mock.calls[0][0].where.workspaceId).toBe('ws_A');
    });

    it('get rejects deal from different workspace', async () => {
      const { svc, tenant, prisma } = build();
      prisma.deal.findUnique.mockResolvedValue({ id: 'd_1', workspaceId: 'ws_B', archivedAt: null });
      await expect(
        tenant.run(ctx('ws_A'), async () => svc.get('d_1')),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('TenantContextService isolation', () => {
    it('concurrent runs maintain independent workspace context', async () => {
      const tenant = new TenantContextService();
      const results: string[] = [];

      await Promise.all([
        tenant.run(ctx('ws_A'), async () => {
          await new Promise((r) => setTimeout(r, 10));
          results.push(tenant.getStore()!.workspaceId);
        }),
        tenant.run(ctx('ws_B'), async () => {
          results.push(tenant.getStore()!.workspaceId);
        }),
      ]);

      expect(results).toContain('ws_A');
      expect(results).toContain('ws_B');
    });
  });
});
