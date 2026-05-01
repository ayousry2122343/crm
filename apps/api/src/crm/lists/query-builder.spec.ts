import { buildWhere, type FilterGroup } from './query-builder';

const meta = (allowed: string[]) => ({
  entityType: 'Person',
  allowedFields: new Set(allowed),
});

describe('buildWhere', () => {
  it('translates eq on built-in field', () => {
    const where = buildWhere(
      meta(['email', 'fullName', 'lifecycleStage']),
      {
        op: 'AND',
        items: [{ field: 'email', op: 'eq', value: 'a@b.com' }],
      },
    );
    expect(where).toEqual({ AND: [{ email: { equals: 'a@b.com' } }] });
  });

  it('translates contains on string field (case-insensitive)', () => {
    const where = buildWhere(meta(['fullName']), {
      op: 'AND',
      items: [{ field: 'fullName', op: 'contains', value: 'ahmed' }],
    });
    expect(where).toEqual({ AND: [{ fullName: { contains: 'ahmed', mode: 'insensitive' } }] });
  });

  it('translates gt/gte/lt/lte', () => {
    const where = buildWhere(meta(['createdAt']), {
      op: 'AND',
      items: [
        { field: 'createdAt', op: 'gt', value: '2026-01-01' },
        { field: 'createdAt', op: 'lte', value: '2026-12-31' },
      ],
    });
    expect(where).toEqual({
      AND: [
        { createdAt: { gt: '2026-01-01' } },
        { createdAt: { lte: '2026-12-31' } },
      ],
    });
  });

  it('translates in / notIn', () => {
    const where = buildWhere(meta(['lifecycleStage']), {
      op: 'AND',
      items: [{ field: 'lifecycleStage', op: 'in', value: ['LEAD', 'MQL'] }],
    });
    expect(where).toEqual({ AND: [{ lifecycleStage: { in: ['LEAD', 'MQL'] } }] });
  });

  it('translates isNull / isNotNull', () => {
    const where = buildWhere(meta(['archivedAt']), {
      op: 'AND',
      items: [{ field: 'archivedAt', op: 'isNull' }],
    });
    expect(where).toEqual({ AND: [{ archivedAt: null }] });
  });

  it('translates customFields.<key> via JSONB path filter', () => {
    const where = buildWhere(meta(['customFields.industry']), {
      op: 'AND',
      items: [{ field: 'customFields.industry', op: 'contains', value: 'tech' }],
    });
    expect(where).toEqual({
      AND: [{ customFields: { path: ['industry'], string_contains: 'tech' } }],
    });
  });

  it('handles nested groups', () => {
    const where = buildWhere(meta(['email', 'fullName', 'lifecycleStage']), {
      op: 'OR',
      items: [
        { field: 'email', op: 'eq', value: 'a@b.com' },
        {
          op: 'AND',
          items: [
            { field: 'lifecycleStage', op: 'eq', value: 'LEAD' },
            { field: 'fullName', op: 'contains', value: 'ahmed' },
          ],
        },
      ],
    });
    expect(where).toEqual({
      OR: [
        { email: { equals: 'a@b.com' } },
        {
          AND: [
            { lifecycleStage: { equals: 'LEAD' } },
            { fullName: { contains: 'ahmed', mode: 'insensitive' } },
          ],
        },
      ],
    });
  });

  it('rejects unknown fields', () => {
    expect(() =>
      buildWhere(meta(['email']), {
        op: 'AND',
        items: [{ field: 'evil', op: 'eq', value: 1 }],
      }),
    ).toThrow(/not allowed/);
  });

  it('rejects unsupported operators', () => {
    expect(() =>
      buildWhere(meta(['email']), {
        op: 'AND',
        items: [{ field: 'email', op: 'sql_inject' as any, value: 1 }],
      }),
    ).toThrow(/operator/);
  });

  it('returns empty AND for empty group', () => {
    const where = buildWhere(meta([]), { op: 'AND', items: [] } as FilterGroup);
    expect(where).toEqual({});
  });
});
