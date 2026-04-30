import { describe, it, expect } from 'vitest';
import { loadEntityDefs } from './loader.js';

describe('loadEntityDefs', () => {
  it('returns an array (possibly empty) when entityDefs/ is empty or has only .gitkeep', async () => {
    const defs = await loadEntityDefs();
    expect(Array.isArray(defs)).toBe(true);
  });
});
