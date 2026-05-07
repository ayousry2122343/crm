export interface ConditionItem {
  field: string;
  op: string;
  value: unknown;
}

export interface ConditionTree {
  op: 'AND' | 'OR';
  items: Array<ConditionItem | ConditionTree>;
}

function getNestedValue(record: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let val: unknown = record;
  for (const part of parts) {
    if (val == null || typeof val !== 'object') return undefined;
    val = (val as Record<string, unknown>)[part];
  }
  return val;
}

function evalItem(record: Record<string, unknown>, item: ConditionItem): boolean {
  const actual = getNestedValue(record, item.field);
  const expected = item.value;

  switch (item.op) {
    case 'eq':
      return actual === expected;
    case 'neq':
      return actual !== expected;
    case 'gt':
      return Number(actual) > Number(expected);
    case 'gte':
      return Number(actual) >= Number(expected);
    case 'lt':
      return Number(actual) < Number(expected);
    case 'lte':
      return Number(actual) <= Number(expected);
    case 'in':
      return Array.isArray(expected) && expected.includes(actual);
    case 'notIn':
      return Array.isArray(expected) && !expected.includes(actual);
    case 'contains':
      return typeof actual === 'string' && actual.includes(String(expected));
    case 'startsWith':
      return typeof actual === 'string' && actual.startsWith(String(expected));
    case 'endsWith':
      return typeof actual === 'string' && actual.endsWith(String(expected));
    case 'isNull':
      return actual == null;
    case 'isNotNull':
      return actual != null;
    default:
      return false;
  }
}

function isConditionTree(node: ConditionItem | ConditionTree): node is ConditionTree {
  return 'items' in node && Array.isArray((node as ConditionTree).items);
}

export function evaluateConditions(
  record: Record<string, unknown>,
  conditions: ConditionTree,
): boolean {
  if (!conditions.items || conditions.items.length === 0) return true;

  const results = conditions.items.map((item) => {
    if (isConditionTree(item)) {
      return evaluateConditions(record, item);
    }
    return evalItem(record, item);
  });

  if (conditions.op === 'AND') return results.every(Boolean);
  return results.some(Boolean);
}
