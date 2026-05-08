import { NotFoundException } from '@nestjs/common';
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
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    deal: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
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

/* ──────────────────────── create ──────────────────────── */

describe('ScoringService.create', () => {
  it('creates a scoring rule with valid data', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    const rule = {
      id: 'sr_1',
      workspaceId: 'ws_1',
      name: 'Lead Score',
      entityType: 'PERSON',
      isActive: true,
      rules: [{ field: 'lifecycleStage', operator: 'EQUALS', value: 'SQL', points: 30 }],
      maxScore: 100,
    };
    prisma.scoringRule.create.mockResolvedValue(rule);

    await tenant.run(ctx(), async () => {
      const result = await svc.create({
        name: 'Lead Score',
        entityType: 'PERSON',
        rules: [{ field: 'lifecycleStage', operator: 'EQUALS', value: 'SQL', points: 30 }],
      });
      expect(result).toEqual(rule);
    });

    expect(prisma.scoringRule.create).toHaveBeenCalled();
    const args = prisma.scoringRule.create.mock.calls[0][0];
    expect(args.data.workspaceId).toBe('ws_1');
    expect(args.data.name).toBe('Lead Score');
    expect(args.data.entityType).toBe('PERSON');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'ScoringRule', action: 'CREATE' }),
    );
  });

  it('validates entityType must be PERSON or DEAL', async () => {
    const { svc, tenant } = buildSvc();
    await tenant.run(ctx(), async () => {
      await expect(
        svc.create({ name: 'Bad', entityType: 'INVALID', rules: [] }),
      ).rejects.toThrow();
    });
  });
});

/* ──────────────────────── list ──────────────────────── */

describe('ScoringService.list', () => {
  it('paginates results', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const items = Array.from({ length: 51 }, (_, i) => ({ id: `sr_${i}` }));
    prisma.scoringRule.findMany.mockResolvedValue(items);

    await tenant.run(ctx(), async () => {
      const result = await svc.list({ limit: 50 });
      expect(result.items).toHaveLength(50);
      expect(result.nextCursor).toBe('sr_49');
    });
  });

  it('filters by entityType', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.scoringRule.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ entityType: 'DEAL' });
    });

    const where = prisma.scoringRule.findMany.mock.calls[0][0].where;
    expect(where.entityType).toBe('DEAL');
  });

  it('filters by isActive', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.scoringRule.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ isActive: 'true' });
    });

    const where = prisma.scoringRule.findMany.mock.calls[0][0].where;
    expect(where.isActive).toBe(true);
  });
});

/* ──────────────────────── get ──────────────────────── */

describe('ScoringService.get', () => {
  it('returns a rule', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.scoringRule.findUnique.mockResolvedValue({
      id: 'sr_1',
      workspaceId: 'ws_1',
      archivedAt: null,
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.get('sr_1');
      expect(result.id).toBe('sr_1');
    });
  });

  it('throws NotFoundException for missing rule', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.scoringRule.findUnique.mockResolvedValue(null);

    await tenant.run(ctx(), async () => {
      await expect(svc.get('sr_missing')).rejects.toThrow(NotFoundException);
    });
  });
});

/* ──────────────────────── update ──────────────────────── */

describe('ScoringService.update', () => {
  it('updates rule fields', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    const before = { id: 'sr_1', workspaceId: 'ws_1', name: 'Old' };
    prisma.scoringRule.findUnique.mockResolvedValue(before);
    prisma.scoringRule.update.mockResolvedValue({ ...before, name: 'New' });

    await tenant.run(ctx(), async () => {
      const result = await svc.update('sr_1', { name: 'New' });
      expect(result.name).toBe('New');
    });

    expect(audit.logUpdate).toHaveBeenCalledWith('ScoringRule', 'sr_1', expect.anything(), expect.anything());
  });

  it('toggles isActive', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.scoringRule.findUnique.mockResolvedValue({ id: 'sr_1', workspaceId: 'ws_1', isActive: true });
    prisma.scoringRule.update.mockResolvedValue({ id: 'sr_1', isActive: false });

    await tenant.run(ctx(), async () => {
      const result = await svc.update('sr_1', { isActive: false });
      expect(result.isActive).toBe(false);
    });
  });
});

/* ──────────────────────── archive ──────────────────────── */

describe('ScoringService.archive', () => {
  it('soft deletes and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.scoringRule.findUnique.mockResolvedValue({ id: 'sr_1', workspaceId: 'ws_1' });
    prisma.scoringRule.update.mockResolvedValue({ id: 'sr_1', archivedAt: new Date() });

    await tenant.run(ctx(), async () => {
      await svc.archive('sr_1');
    });

    expect(prisma.scoringRule.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ archivedAt: expect.any(Date) }) }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'ScoringRule', action: 'DELETE' }),
    );
  });
});

/* ──────────────────────── evaluateScore ──────────────────────── */

describe('ScoringService.evaluateScore', () => {
  function setupEval() {
    const { svc, tenant, prisma } = buildSvc();
    return { svc, tenant, prisma };
  }

  it('EQUALS operator — string match', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'lifecycleStage', operator: 'EQUALS', value: 'SQL', points: 30 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('PERSON', { lifecycleStage: 'SQL', customFields: {} });
      expect(score).toBe(30);
    });
  });

  it('NOT_EQUALS operator', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'status', operator: 'NOT_EQUALS', value: 'LOST', points: 10 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('DEAL', { status: 'OPEN', customFields: {} });
      expect(score).toBe(10);
    });
  });

  it('CONTAINS operator — case insensitive', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'industry', operator: 'CONTAINS', value: 'tech', points: 20 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('PERSON', { industry: 'Technology', customFields: {} });
      expect(score).toBe(20);
    });
  });

  it('GT operator — numeric comparison', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'amount', operator: 'GT', value: 1000, points: 15 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('DEAL', { amount: { toNumber: () => 5000 }, customFields: {} });
      expect(score).toBe(15);
    });
  });

  it('LT operator', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'probability', operator: 'LT', value: 50, points: -10 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('DEAL', { probability: 20, customFields: {} });
      expect(score).toBe(-10);
    });
  });

  it('GTE operator', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'amount', operator: 'GTE', value: 5000, points: 25 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('DEAL', { amount: 5000, customFields: {} });
      expect(score).toBe(25);
    });
  });

  it('LTE operator', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'probability', operator: 'LTE', value: 50, points: 5 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('DEAL', { probability: 50, customFields: {} });
      expect(score).toBe(5);
    });
  });

  it('IN operator — array membership', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'source', operator: 'IN', value: ['referral', 'website'], points: 20 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('PERSON', { source: 'referral', customFields: {} });
      expect(score).toBe(20);
    });
  });

  it('NOT_IN operator', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'source', operator: 'NOT_IN', value: ['spam', 'unknown'], points: 10 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('PERSON', { source: 'referral', customFields: {} });
      expect(score).toBe(10);
    });
  });

  it('IS_SET operator — non-null check', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'email', operator: 'IS_SET', value: null, points: 15 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('PERSON', { email: 'test@example.com', customFields: {} });
      expect(score).toBe(15);
    });
  });

  it('IS_NOT_SET operator — null check', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'phone', operator: 'IS_NOT_SET', value: null, points: -5 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('PERSON', { phone: null, customFields: {} });
      expect(score).toBe(-5);
    });
  });

  it('custom fields resolution — "customFields.key"', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'customFields.company_size', operator: 'GT', value: 100, points: 25 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('PERSON', {
        customFields: { company_size: 500 },
      });
      expect(score).toBe(25);
    });
  });

  it('caps at maxScore per rule', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [
          { field: 'lifecycleStage', operator: 'EQUALS', value: 'SQL', points: 60 },
          { field: 'industry', operator: 'EQUALS', value: 'Tech', points: 60 },
        ],
        maxScore: 80,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('PERSON', {
        lifecycleStage: 'SQL',
        industry: 'Tech',
        customFields: {},
      });
      expect(score).toBe(80);
    });
  });

  it('handles multiple active rules — sums scores', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'lifecycleStage', operator: 'EQUALS', value: 'SQL', points: 30 }],
        maxScore: 100,
      },
      {
        id: 'sr_2',
        isActive: true,
        rules: [{ field: 'industry', operator: 'EQUALS', value: 'Tech', points: 20 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('PERSON', {
        lifecycleStage: 'SQL',
        industry: 'Tech',
        customFields: {},
      });
      expect(score).toBe(50);
    });
  });

  it('handles Decimal fields (amount)', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'amount', operator: 'GTE', value: 10000, points: 40 }],
        maxScore: 100,
      },
    ]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('DEAL', {
        amount: { toNumber: () => 15000 },
        customFields: {},
      });
      expect(score).toBe(40);
    });
  });

  it('skips inactive rules', async () => {
    const { svc, tenant, prisma } = setupEval();
    prisma.scoringRule.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      const score = await svc.evaluateScore('PERSON', { lifecycleStage: 'SQL', customFields: {} });
      expect(score).toBe(0);
    });
  });
});

/* ──────────────────────── scoreEntity ──────────────────────── */

describe('ScoringService.scoreEntity', () => {
  it('loads entity, evaluates, and updates score + scoreUpdatedAt', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const person = { id: 'p_1', workspaceId: 'ws_1', lifecycleStage: 'SQL', customFields: {}, archivedAt: null };
    prisma.person.findUnique.mockResolvedValue(person);
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'lifecycleStage', operator: 'EQUALS', value: 'SQL', points: 30 }],
        maxScore: 100,
      },
    ]);
    prisma.person.update.mockResolvedValue({ ...person, score: 30, scoreUpdatedAt: new Date() });

    await tenant.run(ctx(), async () => {
      const result = await svc.scoreEntity('PERSON', 'p_1');
      expect(result.score).toBe(30);
    });

    expect(prisma.person.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p_1' },
        data: expect.objectContaining({ score: 30, scoreUpdatedAt: expect.any(Date) }),
      }),
    );
  });
});

/* ──────────────────────── bulkRescore ──────────────────────── */

describe('ScoringService.bulkRescore', () => {
  it('processes in batches and returns counts', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const people = Array.from({ length: 3 }, (_, i) => ({
      id: `p_${i}`,
      workspaceId: 'ws_1',
      lifecycleStage: 'SQL',
      customFields: {},
    }));
    prisma.person.findMany.mockResolvedValueOnce(people).mockResolvedValueOnce([]);
    prisma.scoringRule.findMany.mockResolvedValue([
      {
        id: 'sr_1',
        isActive: true,
        rules: [{ field: 'lifecycleStage', operator: 'EQUALS', value: 'SQL', points: 30 }],
        maxScore: 100,
      },
    ]);
    prisma.person.update.mockResolvedValue({});

    await tenant.run(ctx(), async () => {
      const result = await svc.bulkRescore('PERSON');
      expect(result.processed).toBe(3);
      expect(result.updated).toBe(3);
    });
  });
});
