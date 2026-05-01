import { describe, it, expect } from 'vitest';
import { loadEntityDefs } from './loader.js';

describe('loadEntityDefs', () => {
  it('returns an array of entity defs', async () => {
    const defs = await loadEntityDefs();
    expect(Array.isArray(defs)).toBe(true);
  });

  it('loads Person/Company/Deal/Activity built-ins', async () => {
    const defs = await loadEntityDefs();
    const types = defs.map((d) => d.entityType).sort();
    expect(types).toContain('Person');
    expect(types).toContain('Company');
    expect(types).toContain('Deal');
    expect(types).toContain('Activity');
  });

  it('built-in defs include AR + EN labels and a non-empty fields array', async () => {
    const defs = await loadEntityDefs();
    const person = defs.find((d) => d.entityType === 'Person');
    expect(person).toBeDefined();
    expect(person!.labelSingular.ar).toBe('جهة اتصال');
    expect(person!.labelSingular.en).toBe('Person');
    expect(person!.fields.length).toBeGreaterThan(0);
    const fullName = person!.fields.find((f) => f.key === 'fullName');
    expect(fullName).toBeDefined();
    expect(fullName!.required).toBe(true);
  });
});
