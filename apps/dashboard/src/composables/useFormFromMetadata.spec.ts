import { describe, it, expect } from 'vitest';
import { buildZodSchema } from './useFormFromMetadata';
import type { FieldDef } from '@/api/metadata';

describe('buildZodSchema', () => {
  it('produces a passing schema for required text', () => {
    const schema = buildZodSchema([
      {
        key: 'fullName',
        label: { ar: 'a', en: 'Full Name' },
        type: 'TEXT',
        required: true,
      },
    ]);
    expect(schema.safeParse({ fullName: 'Ahmed' }).success).toBe(true);
    expect(schema.safeParse({ fullName: '' }).success).toBe(false);
    expect(schema.safeParse({}).success).toBe(false);
  });

  it('accepts optional text', () => {
    const schema = buildZodSchema([
      { key: 'note', label: { ar: 'a', en: 'Note' }, type: 'TEXT' },
    ]);
    expect(schema.safeParse({}).success).toBe(true);
    expect(schema.safeParse({ note: '' }).success).toBe(true);
    expect(schema.safeParse({ note: 'hello' }).success).toBe(true);
  });

  it('validates EMAIL format', () => {
    const schema = buildZodSchema([
      { key: 'email', label: { ar: 'a', en: 'Email' }, type: 'EMAIL' },
    ]);
    expect(schema.safeParse({ email: 'foo@bar.com' }).success).toBe(true);
    expect(schema.safeParse({ email: 'not an email' }).success).toBe(false);
  });

  it('validates URL format', () => {
    const schema = buildZodSchema([
      { key: 'website', label: { ar: 'a', en: 'Web' }, type: 'URL' },
    ]);
    expect(schema.safeParse({ website: 'https://example.com' }).success).toBe(true);
    expect(schema.safeParse({ website: 'nope' }).success).toBe(false);
  });

  it('coerces NUMBER fields', () => {
    const schema = buildZodSchema([
      { key: 'age', label: { ar: 'a', en: 'Age' }, type: 'NUMBER' },
    ]);
    expect(schema.safeParse({ age: 42 }).success).toBe(true);
    expect(schema.safeParse({ age: '42' }).success).toBe(true);
    expect(schema.safeParse({ age: 'abc' }).success).toBe(false);
  });

  it('validates PICKLIST against allowed values', () => {
    const schema = buildZodSchema([
      {
        key: 'stage',
        label: { ar: 'a', en: 'Stage' },
        type: 'PICKLIST',
        options: [
          { value: 'A', label: { ar: 'a', en: 'A' } },
          { value: 'B', label: { ar: 'b', en: 'B' } },
        ],
      },
    ]);
    expect(schema.safeParse({ stage: 'A' }).success).toBe(true);
    expect(schema.safeParse({ stage: 'X' }).success).toBe(false);
  });

  it('validates MULTI_PICKLIST as an array of allowed values', () => {
    const schema = buildZodSchema([
      {
        key: 'tags',
        label: { ar: 'a', en: 'Tags' },
        type: 'MULTI_PICKLIST',
        options: [
          { value: 'a', label: { ar: 'a', en: 'A' } },
          { value: 'b', label: { ar: 'b', en: 'B' } },
        ],
      },
    ]);
    expect(schema.safeParse({ tags: ['a'] }).success).toBe(true);
    expect(schema.safeParse({ tags: ['a', 'b'] }).success).toBe(true);
    expect(schema.safeParse({ tags: ['x'] }).success).toBe(false);
  });

  it('handles BOOLEAN', () => {
    const schema = buildZodSchema([
      { key: 'active', label: { ar: 'a', en: 'Active' }, type: 'BOOLEAN' },
    ]);
    expect(schema.safeParse({ active: true }).success).toBe(true);
    expect(schema.safeParse({ active: false }).success).toBe(true);
    expect(schema.safeParse({}).success).toBe(true);
  });

  it('accepts strings or Date for DATE/DATETIME', () => {
    const schema = buildZodSchema([
      { key: 'd', label: { ar: 'a', en: 'D' }, type: 'DATE' },
      { key: 'dt', label: { ar: 'a', en: 'DT' }, type: 'DATETIME' },
    ]);
    expect(schema.safeParse({ d: '2026-04-30', dt: new Date() }).success).toBe(true);
  });

  it('PHONE requires min length when required', () => {
    const schema = buildZodSchema([
      {
        key: 'phone',
        label: { ar: 'a', en: 'Phone' },
        type: 'PHONE',
        required: true,
      },
    ]);
    expect(schema.safeParse({ phone: '12' }).success).toBe(false);
    expect(schema.safeParse({ phone: '12345' }).success).toBe(true);
  });

  it('builds an empty object schema for empty fields', () => {
    const schema = buildZodSchema([]);
    expect(schema.safeParse({}).success).toBe(true);
  });
});
