import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENTITY_DEFS_DIR = join(__dirname, '..', 'entityDefs');

export type FieldDef = {
  key: string;
  label: { ar: string; en: string };
  type: string;
  required?: boolean;
  unique?: boolean;
  options?: any;
  helpText?: { ar?: string; en?: string };
  default?: unknown;
  validation?: unknown;
  formulaExpr?: string;
  rollupConfig?: unknown;
};

export type EntityDef = {
  entityType: string;
  labelSingular: { ar: string; en: string };
  labelPlural: { ar: string; en: string };
  icon?: string;
  color?: string;
  fields: FieldDef[];
};

export async function loadEntityDefs(): Promise<EntityDef[]> {
  let files: string[];
  try {
    files = await readdir(ENTITY_DEFS_DIR);
  } catch {
    return [];
  }
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const defs = await Promise.all(
    jsonFiles.map(async (f) => {
      const content = await readFile(join(ENTITY_DEFS_DIR, f), 'utf8');
      return JSON.parse(content) as EntityDef;
    })
  );
  return defs;
}
