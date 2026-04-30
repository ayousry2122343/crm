import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENTITY_DEFS_DIR = join(__dirname, '..', 'entityDefs');

export type EntityDef = {
  name: string;
  fields: Array<{
    key: string;
    label: { ar: string; en: string };
    type: string;
    required?: boolean;
  }>;
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
