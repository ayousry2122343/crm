import {
  assertSafeFieldKey,
  buildGeneratedColumnSql,
  buildDropGeneratedColumnSql,
  ALLOWED_INDEXABLE_TYPES,
  ALLOWED_INDEXED_TABLES,
} from './custom-field-ddl.util';

describe('assertSafeFieldKey', () => {
  it('accepts valid snake_case keys', () => {
    expect(() => assertSafeFieldKey('industry')).not.toThrow();
    expect(() => assertSafeFieldKey('lead_source')).not.toThrow();
    expect(() => assertSafeFieldKey('a1_b2_c3')).not.toThrow();
    expect(() => assertSafeFieldKey('a')).not.toThrow();
  });

  it('rejects empty string', () => {
    expect(() => assertSafeFieldKey('')).toThrow(/invalid field key/);
  });

  it('rejects keys longer than 63 chars (Postgres limit)', () => {
    expect(() => assertSafeFieldKey('a'.repeat(64))).toThrow(/invalid field key/);
  });

  it('rejects keys starting with digit or underscore', () => {
    expect(() => assertSafeFieldKey('1abc')).toThrow();
    expect(() => assertSafeFieldKey('_abc')).toThrow();
  });

  it('rejects uppercase, spaces, special chars', () => {
    expect(() => assertSafeFieldKey('Industry')).toThrow();
    expect(() => assertSafeFieldKey('with space')).toThrow();
    expect(() => assertSafeFieldKey('with-dash')).toThrow();
    expect(() => assertSafeFieldKey('with.dot')).toThrow();
  });

  it('rejects classic SQL injection attempts', () => {
    expect(() => assertSafeFieldKey('a; DROP TABLE x;--')).toThrow();
    expect(() => assertSafeFieldKey("a' OR 1=1")).toThrow();
    expect(() => assertSafeFieldKey('a"; DELETE FROM users;--')).toThrow();
    expect(() => assertSafeFieldKey('a/*comment*/')).toThrow();
    expect(() => assertSafeFieldKey('a`b')).toThrow();
    expect(() => assertSafeFieldKey('a\\nb')).toThrow();
  });
});

describe('buildGeneratedColumnSql', () => {
  it('builds the expected DDL for TEXT/Person', () => {
    const sql = buildGeneratedColumnSql('Person', 'industry', 'TEXT');
    expect(sql).toContain('ALTER TABLE "Person"');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS "cf_industry"');
    expect(sql).toContain("(\"customFields\"->>'industry')::text");
    expect(sql).toContain('CREATE INDEX IF NOT EXISTS "idx_person_cf_industry"');
  });

  it('uses numeric cast for NUMBER and date cast for DATE', () => {
    expect(buildGeneratedColumnSql('Deal', 'amount_paid', 'NUMBER')).toContain('::numeric');
    expect(buildGeneratedColumnSql('Activity', 'follow_up', 'DATE')).toContain('::date');
  });

  it('rejects un-allowed table names', () => {
    expect(() => buildGeneratedColumnSql('NotARealTable' as any, 'a', 'TEXT')).toThrow();
  });

  it('rejects un-allowed types', () => {
    expect(() => buildGeneratedColumnSql('Person', 'a', 'PICKLIST' as any)).toThrow();
    expect(() => buildGeneratedColumnSql('Person', 'a', 'JSON' as any)).toThrow();
  });

  it('rejects unsafe keys (delegates to assertSafeFieldKey)', () => {
    expect(() => buildGeneratedColumnSql('Person', "a' OR 1=1", 'TEXT')).toThrow();
  });
});

describe('buildDropGeneratedColumnSql', () => {
  it('builds DROP DDL', () => {
    const sql = buildDropGeneratedColumnSql('Person', 'industry');
    expect(sql).toContain('DROP INDEX IF EXISTS');
    expect(sql).toContain('DROP COLUMN IF EXISTS "cf_industry"');
  });
});

describe('ALLOWED_*', () => {
  it('exports the indexable types whitelist', () => {
    expect(ALLOWED_INDEXABLE_TYPES).toEqual(new Set(['TEXT', 'NUMBER', 'DATE']));
  });
  it('exports the indexed tables whitelist', () => {
    expect(ALLOWED_INDEXED_TABLES).toEqual(new Set(['Person', 'Company', 'Deal', 'Activity']));
  });
});
