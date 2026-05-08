import { ScoringService } from './scoring.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    scoringRule: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    person: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    deal: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
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
  const svc = new ScoringService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('Scoring Integration', () => {
  describe('evaluateScore with active rules', () => {
    it('computes score from matching EQUALS rules', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.scoringRule.findMany.mockResolvedValue([
        {
          id: 'sr_1',
          isActive: true,
          maxScore: 100,
          rules: [
            { field: 'lifecycleStage', operator: 'EQUALS', value: 'MQL', points: 20 },
            { field: 'industry', operator: 'EQUALS', value: 'Tech', points: 30 },
          ],
        },
      ]);

      const entity = { lifecycleStage: 'MQL', industry: 'Tech', fullName: 'Ahmed' };
      const score = await tenant.run(ctx(), async () => svc.evaluateScore('PERSON', entity));
      expect(score).toBe(50);
    });

    it('caps score at maxScore per rule', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.scoringRule.findMany.mockResolvedValue([
        {
          id: 'sr_1',
          isActive: true,
          maxScore: 30,
          rules: [
            { field: 'lifecycleStage', operator: 'EQUALS', value: 'MQL', points: 20 },
            { field: 'industry', operator: 'EQUALS', value: 'Tech', points: 30 },
          ],
        },
      ]);

      const entity = { lifecycleStage: 'MQL', industry: 'Tech' };
      const score = await tenant.run(ctx(), async () => svc.evaluateScore('PERSON', entity));
      expect(score).toBe(30);
    });

    it('sums scores from multiple scoring rules', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.scoringRule.findMany.mockResolvedValue([
        {
          id: 'sr_1',
          isActive: true,
          maxScore: 100,
          rules: [{ field: 'lifecycleStage', operator: 'EQUALS', value: 'LEAD', points: 10 }],
        },
        {
          id: 'sr_2',
          isActive: true,
          maxScore: 100,
          rules: [{ field: 'source', operator: 'EQUALS', value: 'Website', points: 15 }],
        },
      ]);

      const entity = { lifecycleStage: 'LEAD', source: 'Website' };
      const score = await tenant.run(ctx(), async () => svc.evaluateScore('PERSON', entity));
      expect(score).toBe(25);
    });

    it('evaluates GT operator for numeric fields', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.scoringRule.findMany.mockResolvedValue([
        {
          id: 'sr_1',
          isActive: true,
          maxScore: 100,
          rules: [{ field: 'amount', operator: 'GT', value: 10000, points: 40 }],
        },
      ]);

      const entity = { amount: 50000 };
      const score = await tenant.run(ctx(), async () => svc.evaluateScore('DEAL', entity));
      expect(score).toBe(40);
    });

    it('evaluates IS_SET operator', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.scoringRule.findMany.mockResolvedValue([
        {
          id: 'sr_1',
          isActive: true,
          maxScore: 100,
          rules: [{ field: 'email', operator: 'IS_SET', value: null, points: 10 }],
        },
      ]);

      const withEmail = { email: 'a@b.com' };
      const withoutEmail = { email: null };

      const score1 = await tenant.run(ctx(), async () => svc.evaluateScore('PERSON', withEmail));
      expect(score1).toBe(10);

      const score2 = await tenant.run(ctx(), async () => svc.evaluateScore('PERSON', withoutEmail));
      expect(score2).toBe(0);
    });

    it('resolves customFields via dot notation', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.scoringRule.findMany.mockResolvedValue([
        {
          id: 'sr_1',
          isActive: true,
          maxScore: 100,
          rules: [{ field: 'customFields.priority', operator: 'EQUALS', value: 'HIGH', points: 25 }],
        },
      ]);

      const entity = { customFields: { priority: 'HIGH' } };
      const score = await tenant.run(ctx(), async () => svc.evaluateScore('PERSON', entity));
      expect(score).toBe(25);
    });

    it('handles Decimal fields via toNumber()', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.scoringRule.findMany.mockResolvedValue([
        {
          id: 'sr_1',
          isActive: true,
          maxScore: 100,
          rules: [{ field: 'amount', operator: 'GTE', value: 1000, points: 30 }],
        },
      ]);

      const entity = { amount: { toNumber: () => 5000 } };
      const score = await tenant.run(ctx(), async () => svc.evaluateScore('DEAL', entity));
      expect(score).toBe(30);
    });
  });

  describe('scoreEntity end-to-end', () => {
    it('fetches entity, evaluates score, and writes back', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.person.findUnique.mockResolvedValue({
        id: 'p_1', workspaceId: 'ws_1', archivedAt: null,
        lifecycleStage: 'MQL', email: 'a@b.com',
      });
      prisma.scoringRule.findMany.mockResolvedValue([
        {
          id: 'sr_1',
          isActive: true,
          maxScore: 100,
          rules: [{ field: 'lifecycleStage', operator: 'EQUALS', value: 'MQL', points: 20 }],
        },
      ]);
      prisma.person.update.mockResolvedValue({ id: 'p_1', score: 20 });

      await tenant.run(ctx(), async () => {
        await svc.scoreEntity('PERSON', 'p_1');
      });

      expect(prisma.person.update).toHaveBeenCalledWith({
        where: { id: 'p_1' },
        data: { score: 20, scoreUpdatedAt: expect.any(Date) },
      });
    });
  });

  describe('bulkRescore', () => {
    it('rescores all entities in batches', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.person.findMany.mockResolvedValueOnce([
        { id: 'p_1', workspaceId: 'ws_1', archivedAt: null, lifecycleStage: 'LEAD' },
        { id: 'p_2', workspaceId: 'ws_1', archivedAt: null, lifecycleStage: 'MQL' },
      ]).mockResolvedValueOnce([]);

      prisma.scoringRule.findMany.mockResolvedValue([
        {
          id: 'sr_1',
          isActive: true,
          maxScore: 100,
          rules: [{ field: 'lifecycleStage', operator: 'EQUALS', value: 'MQL', points: 20 }],
        },
      ]);
      prisma.person.update.mockResolvedValue({});

      const result = await tenant.run(ctx(), async () => svc.bulkRescore('PERSON'));
      expect(result.processed).toBe(2);
      expect(result.updated).toBe(2);
      expect(prisma.person.update).toHaveBeenCalledTimes(2);
    });

    it('handles empty result set gracefully — returns zero counts', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.person.findMany.mockResolvedValueOnce([]);

      prisma.scoringRule.findMany.mockResolvedValue([]);

      const result = await tenant.run(ctx(), async () => svc.bulkRescore('PERSON'));
      expect(result.processed).toBe(0);
      expect(result.updated).toBe(0);
      expect(prisma.person.update).not.toHaveBeenCalled();
    });
  });

  describe('evaluateScore with no active rules', () => {
    it('returns 0 when no scoring rules exist', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.scoringRule.findMany.mockResolvedValue([]);

      const entity = { lifecycleStage: 'MQL', email: 'test@example.com' };
      const score = await tenant.run(ctx(), async () => svc.evaluateScore('PERSON', entity));
      expect(score).toBe(0);
    });
  });
});
