import { ReportQueryEngine } from './report-query-engine';

function makePrisma() {
  return {
    $queryRaw: jest.fn(),
    person: { findMany: jest.fn(), count: jest.fn() },
    deal: { findMany: jest.fn(), count: jest.fn() },
    ticket: { findMany: jest.fn(), count: jest.fn() },
  };
}

describe('ReportQueryEngine', () => {
  describe('buildWhereClause', () => {
    it('builds Prisma where clause from EQUALS filter', () => {
      const engine = new ReportQueryEngine(makePrisma() as any);
      const where = engine.buildWhereClause('ws1', {
        status: { operator: 'EQUALS', value: 'OPEN' },
      });
      expect(where).toEqual(
        expect.objectContaining({
          workspaceId: 'ws1',
          status: 'OPEN',
        }),
      );
    });

    it('supports GT/LT operators', () => {
      const engine = new ReportQueryEngine(makePrisma() as any);
      const where = engine.buildWhereClause('ws1', {
        amount: { operator: 'GT', value: 1000 },
      });
      expect(where.amount).toEqual({ gt: 1000 });
    });

    it('supports CONTAINS operator', () => {
      const engine = new ReportQueryEngine(makePrisma() as any);
      const where = engine.buildWhereClause('ws1', {
        name: { operator: 'CONTAINS', value: 'Ahmed' },
      });
      expect(where.name).toEqual({ contains: 'Ahmed', mode: 'insensitive' });
    });

    it('supports IN operator', () => {
      const engine = new ReportQueryEngine(makePrisma() as any);
      const where = engine.buildWhereClause('ws1', {
        status: { operator: 'IN', value: ['OPEN', 'WON'] },
      });
      expect(where.status).toEqual({ in: ['OPEN', 'WON'] });
    });

    it('supports LTE operator', () => {
      const engine = new ReportQueryEngine(makePrisma() as any);
      const where = engine.buildWhereClause('ws1', {
        amount: { operator: 'LTE', value: 500 },
      });
      expect(where.amount).toEqual({ lte: 500 });
    });
  });

  describe('execute — tabular', () => {
    it('executes tabular report with pagination', async () => {
      const prisma = makePrisma();
      prisma.person.findMany.mockResolvedValue([
        { id: 'p1', name: 'Ahmed', email: 'a@b.com' },
      ]);
      prisma.person.count.mockResolvedValue(1);

      const engine = new ReportQueryEngine(prisma as any);
      const result = await engine.execute({
        workspaceId: 'ws1',
        entityType: 'Person',
        reportType: 'TABULAR',
        columns: [{ fieldKey: 'name' }, { fieldKey: 'email' }],
        filters: {},
        groupBy: [],
        aggregations: [],
        sortBy: [{ fieldKey: 'name', direction: 'ASC' }],
        limit: 100,
        offset: 0,
      });

      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('applies filters to tabular query', async () => {
      const prisma = makePrisma();
      prisma.deal.findMany.mockResolvedValue([]);
      prisma.deal.count.mockResolvedValue(0);

      const engine = new ReportQueryEngine(prisma as any);
      await engine.execute({
        workspaceId: 'ws1',
        entityType: 'Deal',
        reportType: 'TABULAR',
        columns: [{ fieldKey: 'name' }],
        filters: { status: { operator: 'EQUALS', value: 'WON' } },
        groupBy: [],
        aggregations: [],
        sortBy: [],
        limit: 50,
        offset: 0,
      });

      expect(prisma.deal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'WON', workspaceId: 'ws1' }),
        }),
      );
    });
  });

  describe('execute — grouped', () => {
    it('executes grouped report with aggregations', async () => {
      const prisma = makePrisma();
      prisma.deal.findMany.mockResolvedValue([
        { status: 'WON', _count: 5, _sum_amount: 50000 },
        { status: 'LOST', _count: 3, _sum_amount: 20000 },
      ]);
      prisma.deal.count.mockResolvedValue(2);

      const engine = new ReportQueryEngine(prisma as any);
      const result = await engine.execute({
        workspaceId: 'ws1',
        entityType: 'Deal',
        reportType: 'GROUPED',
        columns: [{ fieldKey: 'status' }],
        filters: {},
        groupBy: ['status'],
        aggregations: [
          { fieldKey: '*', function: 'COUNT', label: 'Count' },
          { fieldKey: 'amount', function: 'SUM', label: 'Total' },
        ],
        sortBy: [],
        limit: 100,
        offset: 0,
      });

      expect(result.rows).toHaveLength(2);
    });
  });

  describe('toCSV', () => {
    it('generates CSV string from columns and rows', () => {
      const engine = new ReportQueryEngine(makePrisma() as any);
      const csv = engine.toCSV(
        [
          { fieldKey: 'name', label: 'Name' },
          { fieldKey: 'email', label: 'Email' },
        ],
        [
          { name: 'Ahmed', email: 'a@b.com' },
          { name: 'Sara', email: 's@b.com' },
        ],
      );
      expect(csv).toContain('Name,Email');
      expect(csv).toContain('Ahmed,a@b.com');
      expect(csv).toContain('Sara,s@b.com');
    });

    it('handles missing values gracefully', () => {
      const engine = new ReportQueryEngine(makePrisma() as any);
      const csv = engine.toCSV(
        [{ fieldKey: 'name', label: 'Name' }, { fieldKey: 'phone', label: 'Phone' }],
        [{ name: 'Ahmed' }],
      );
      expect(csv).toContain('Ahmed,');
    });

    it('escapes commas in values', () => {
      const engine = new ReportQueryEngine(makePrisma() as any);
      const csv = engine.toCSV(
        [{ fieldKey: 'name', label: 'Name' }],
        [{ name: 'Smith, John' }],
      );
      expect(csv).toContain('"Smith, John"');
    });
  });
});
