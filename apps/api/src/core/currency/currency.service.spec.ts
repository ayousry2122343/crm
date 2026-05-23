import { CurrencyService } from './currency.service';
import { TenantContextService } from '../tenant/tenant-context.service';

function makePrisma() {
  return {
    currencyRate: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    workspace: {
      findUnique: jest.fn(),
    },
  };
}

function ctx(workspaceId = 'ws1', userId = 'u1') {
  return {
    workspaceId,
    userId,
    profileIds: [] as string[],
    permissionKeys: new Set<string>(),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const svc = new CurrencyService(prisma as any, tenant);
  return { svc, tenant, prisma };
}

describe('CurrencyService', () => {
  describe('convert', () => {
    it('converts amount using latest rate', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.currencyRate.findFirst.mockResolvedValue({ rate: 49.5 });

      const result = await tenant.run(ctx(), () =>
        svc.convert(100, 'USD', 'EGP'),
      );
      expect(result).toBe(4950);
    });

    it('returns same amount for same currency', async () => {
      const { svc, tenant } = buildSvc();

      const result = await tenant.run(ctx(), () =>
        svc.convert(100, 'EGP', 'EGP'),
      );
      expect(result).toBe(100);
    });

    it('uses inverse rate when direct rate not found', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.currencyRate.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ rate: 49.5 });

      const result = await tenant.run(ctx(), () =>
        svc.convert(4950, 'EGP', 'USD'),
      );
      expect(result).toBeCloseTo(100, 2);
    });
  });

  describe('convertToBase', () => {
    it('converts to workspace base currency', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.workspace.findUnique.mockResolvedValue({ primaryCurrency: 'EGP' });
      prisma.currencyRate.findFirst.mockResolvedValue({ rate: 49.5 });

      const result = await tenant.run(ctx(), () =>
        svc.convertToBase(100, 'USD'),
      );
      expect(result).toBe(4950);
    });
  });

  describe('getLatestRates', () => {
    it('returns all rates for workspace', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.currencyRate.findMany.mockResolvedValue([
        { fromCurrency: 'USD', toCurrency: 'EGP', rate: 49.5 },
        { fromCurrency: 'SAR', toCurrency: 'EGP', rate: 13.2 },
      ]);

      const result = await tenant.run(ctx(), () => svc.getLatestRates());
      expect(result).toHaveLength(2);
    });
  });

  describe('updateRate', () => {
    it('upserts rate', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.currencyRate.upsert.mockResolvedValue({ id: 'cr1' });

      await tenant.run(ctx(), () =>
        svc.updateRate('USD', 'EGP', 49.5),
      );
      expect(prisma.currencyRate.upsert).toHaveBeenCalled();
    });
  });
});
