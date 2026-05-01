export type FilterOp =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'isNull'
  | 'isNotNull';

export interface Filter {
  field: string;
  op: FilterOp;
  value?: unknown;
}

export interface FilterGroup {
  op: 'AND' | 'OR';
  items: (Filter | FilterGroup)[];
}

export interface SortClause {
  field: string;
  dir: 'asc' | 'desc';
}

export interface ListQuery {
  filters?: FilterGroup;
  sort?: SortClause[];
  limit?: number;
}

export interface BuildContext {
  entityType: string;
  allowedFields: Set<string>;
}

const SUPPORTED_OPS: ReadonlySet<FilterOp> = new Set<FilterOp>([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'notIn',
  'contains',
  'startsWith',
  'endsWith',
  'isNull',
  'isNotNull',
]);

function isGroup(node: Filter | FilterGroup): node is FilterGroup {
  return (node as FilterGroup).items !== undefined;
}

function buildLeaf(ctx: BuildContext, f: Filter): Record<string, unknown> {
  if (!ctx.allowedFields.has(f.field)) {
    throw new Error(`field "${f.field}" not allowed for ${ctx.entityType}`);
  }
  if (!SUPPORTED_OPS.has(f.op)) {
    throw new Error(`operator "${f.op}" not supported`);
  }

  const isCustom = f.field.startsWith('customFields.');
  if (isCustom) {
    const key = f.field.slice('customFields.'.length);
    return { customFields: buildJsonPathClause(key, f) };
  }

  switch (f.op) {
    case 'eq':
      return { [f.field]: { equals: f.value } };
    case 'neq':
      return { [f.field]: { not: f.value } };
    case 'gt':
      return { [f.field]: { gt: f.value } };
    case 'gte':
      return { [f.field]: { gte: f.value } };
    case 'lt':
      return { [f.field]: { lt: f.value } };
    case 'lte':
      return { [f.field]: { lte: f.value } };
    case 'in':
      return { [f.field]: { in: f.value as unknown[] } };
    case 'notIn':
      return { [f.field]: { notIn: f.value as unknown[] } };
    case 'contains':
      return { [f.field]: { contains: f.value, mode: 'insensitive' } };
    case 'startsWith':
      return { [f.field]: { startsWith: f.value, mode: 'insensitive' } };
    case 'endsWith':
      return { [f.field]: { endsWith: f.value, mode: 'insensitive' } };
    case 'isNull':
      return { [f.field]: null };
    case 'isNotNull':
      return { [f.field]: { not: null } };
  }
}

function buildJsonPathClause(key: string, f: Filter): Record<string, unknown> {
  const path = [key];
  switch (f.op) {
    case 'eq':
      return { path, equals: f.value };
    case 'neq':
      return { path, not: f.value };
    case 'gt':
      return { path, gt: f.value };
    case 'gte':
      return { path, gte: f.value };
    case 'lt':
      return { path, lt: f.value };
    case 'lte':
      return { path, lte: f.value };
    case 'contains':
      return { path, string_contains: f.value };
    case 'startsWith':
      return { path, string_starts_with: f.value };
    case 'endsWith':
      return { path, string_ends_with: f.value };
    case 'in':
      return { path, array_contains: f.value };
    case 'isNull':
      return { path, equals: null };
    case 'isNotNull':
      return { path, not: null };
    default:
      throw new Error(`operator "${f.op}" not supported on customFields`);
  }
}

export function buildWhere(ctx: BuildContext, group: FilterGroup): Record<string, unknown> {
  if (!group.items || group.items.length === 0) {
    return {};
  }
  const compiled = group.items.map((item) =>
    isGroup(item) ? buildWhere(ctx, item) : buildLeaf(ctx, item),
  );
  return { [group.op]: compiled };
}

export function buildOrderBy(ctx: BuildContext, sort?: SortClause[]) {
  if (!sort || sort.length === 0) return undefined;
  return sort.map((s) => {
    if (!ctx.allowedFields.has(s.field)) {
      throw new Error(`sort field "${s.field}" not allowed for ${ctx.entityType}`);
    }
    return { [s.field]: s.dir };
  });
}
