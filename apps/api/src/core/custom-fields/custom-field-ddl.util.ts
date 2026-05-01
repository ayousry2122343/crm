/**
 * SECURITY-CRITICAL: This module builds raw DDL statements for adding indexed
 * generated columns to the Person/Company/Deal/Activity tables. The function
 * inputs come (eventually) from API requests, so we MUST sanitize every byte
 * that is concatenated into the SQL string.
 *
 * The sanitization strategy is *defense in depth*:
 *   1. Tables are restricted to a closed string-literal whitelist.
 *   2. Types are restricted to a closed string-literal whitelist.
 *   3. Keys must match a strict snake_case regex (`KEY_RE`) and be ≤ 63 chars
 *      (Postgres identifier limit). All other characters — quotes, semicolons,
 *      dashes, comments, backticks, escapes, whitespace — are rejected.
 *
 * The combination guarantees no externally-supplied byte can break out of the
 * intended identifier or comment context. Anything outside the whitelist
 * throws BEFORE the SQL string is constructed.
 */

const KEY_RE = /^[a-z][a-z0-9_]{0,62}$/;

export const ALLOWED_INDEXABLE_TYPES = new Set(['TEXT', 'NUMBER', 'DATE'] as const);
export const ALLOWED_INDEXED_TABLES = new Set([
  'Person',
  'Company',
  'Deal',
  'Activity',
] as const);

export type IndexableTable = 'Person' | 'Company' | 'Deal' | 'Activity';
export type IndexableType = 'TEXT' | 'NUMBER' | 'DATE';

export function assertSafeFieldKey(key: string): void {
  if (typeof key !== 'string' || !KEY_RE.test(key)) {
    throw new Error(`invalid field key: ${JSON.stringify(key)}`);
  }
}

function pgCast(type: IndexableType): string {
  switch (type) {
    case 'TEXT':
      return 'text';
    case 'NUMBER':
      return 'numeric';
    case 'DATE':
      return 'date';
  }
}

export function buildGeneratedColumnSql(
  table: IndexableTable,
  key: string,
  type: IndexableType,
): string {
  if (!ALLOWED_INDEXED_TABLES.has(table)) {
    throw new Error(`table ${JSON.stringify(table)} is not allowed for generated columns`);
  }
  if (!ALLOWED_INDEXABLE_TYPES.has(type)) {
    throw new Error(`type ${JSON.stringify(type)} is not indexable`);
  }
  assertSafeFieldKey(key);
  const col = `cf_${key}`;
  const cast = pgCast(type);
  // Identifiers come from a closed whitelist; the only externally-influenced
  // value is `key`, validated by KEY_RE above.
  return [
    `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "${col}" ${cast} GENERATED ALWAYS AS (("customFields"->>'${key}')::${cast}) STORED;`,
    `CREATE INDEX IF NOT EXISTS "idx_${table.toLowerCase()}_${col}" ON "${table}" ("${col}");`,
  ].join('\n');
}

export function buildDropGeneratedColumnSql(table: IndexableTable, key: string): string {
  if (!ALLOWED_INDEXED_TABLES.has(table)) {
    throw new Error(`table not allowed: ${table}`);
  }
  assertSafeFieldKey(key);
  const col = `cf_${key}`;
  return [
    `DROP INDEX IF EXISTS "idx_${table.toLowerCase()}_${col}";`,
    `ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${col}";`,
  ].join('\n');
}
