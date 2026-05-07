import { evaluateConditions, type ConditionTree } from './condition-evaluator';

describe('evaluateConditions', () => {
  const record = { name: 'Ahmed', age: 30, email: 'ahmed@test.com', city: null };

  it('returns true for empty items', () => {
    expect(evaluateConditions(record, { op: 'AND', items: [] })).toBe(true);
  });

  it('evaluates eq', () => {
    const cond: ConditionTree = { op: 'AND', items: [{ field: 'name', op: 'eq', value: 'Ahmed' }] };
    expect(evaluateConditions(record, cond)).toBe(true);
  });

  it('evaluates neq', () => {
    const cond: ConditionTree = { op: 'AND', items: [{ field: 'name', op: 'neq', value: 'John' }] };
    expect(evaluateConditions(record, cond)).toBe(true);
  });

  it('evaluates gt / gte / lt / lte', () => {
    expect(evaluateConditions(record, { op: 'AND', items: [{ field: 'age', op: 'gt', value: 25 }] })).toBe(true);
    expect(evaluateConditions(record, { op: 'AND', items: [{ field: 'age', op: 'gte', value: 30 }] })).toBe(true);
    expect(evaluateConditions(record, { op: 'AND', items: [{ field: 'age', op: 'lt', value: 35 }] })).toBe(true);
    expect(evaluateConditions(record, { op: 'AND', items: [{ field: 'age', op: 'lte', value: 30 }] })).toBe(true);
    expect(evaluateConditions(record, { op: 'AND', items: [{ field: 'age', op: 'gt', value: 30 }] })).toBe(false);
  });

  it('evaluates in / notIn', () => {
    expect(evaluateConditions(record, { op: 'AND', items: [{ field: 'name', op: 'in', value: ['Ahmed', 'Ali'] }] })).toBe(true);
    expect(evaluateConditions(record, { op: 'AND', items: [{ field: 'name', op: 'notIn', value: ['John'] }] })).toBe(true);
  });

  it('evaluates contains / startsWith / endsWith', () => {
    expect(evaluateConditions(record, { op: 'AND', items: [{ field: 'email', op: 'contains', value: '@test' }] })).toBe(true);
    expect(evaluateConditions(record, { op: 'AND', items: [{ field: 'email', op: 'startsWith', value: 'ahmed' }] })).toBe(true);
    expect(evaluateConditions(record, { op: 'AND', items: [{ field: 'email', op: 'endsWith', value: '.com' }] })).toBe(true);
  });

  it('evaluates isNull / isNotNull', () => {
    expect(evaluateConditions(record, { op: 'AND', items: [{ field: 'city', op: 'isNull', value: null }] })).toBe(true);
    expect(evaluateConditions(record, { op: 'AND', items: [{ field: 'name', op: 'isNotNull', value: null }] })).toBe(true);
  });

  it('evaluates nested AND/OR tree', () => {
    const cond: ConditionTree = {
      op: 'OR',
      items: [
        { field: 'name', op: 'eq', value: 'John' },
        {
          op: 'AND',
          items: [
            { field: 'age', op: 'gte', value: 30 },
            { field: 'email', op: 'contains', value: 'ahmed' },
          ],
        },
      ],
    };
    expect(evaluateConditions(record, cond)).toBe(true);
  });

  it('AND returns false if any item fails', () => {
    const cond: ConditionTree = {
      op: 'AND',
      items: [
        { field: 'name', op: 'eq', value: 'Ahmed' },
        { field: 'age', op: 'gt', value: 50 },
      ],
    };
    expect(evaluateConditions(record, cond)).toBe(false);
  });

  it('supports dot-path field access', () => {
    const nested = { address: { city: 'Cairo' } };
    const cond: ConditionTree = { op: 'AND', items: [{ field: 'address.city', op: 'eq', value: 'Cairo' }] };
    expect(evaluateConditions(nested, cond)).toBe(true);
  });
});
