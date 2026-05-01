import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

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

/**
 * MetadataService loads built-in entity definitions from
 * `packages/metadata/entityDefs/` and merges per-workspace `CustomFieldDef`
 * rows into them on read. Built-ins are loaded once at boot.
 */
@Injectable()
export class MetadataService implements OnModuleInit {
  private readonly logger = new Logger(MetadataService.name);
  private builtIn = new Map<string, EntityDef>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  async onModuleInit() {
    const dir = this.resolveEntityDefsDir();
    let files: string[];
    try {
      files = await readdir(dir);
    } catch (err) {
      this.logger.warn(`could not read entityDefs at ${dir}: ${(err as Error).message}`);
      return;
    }
    const jsonFiles = files.filter((f) => f.endsWith('.json'));
    for (const f of jsonFiles) {
      const content = await readFile(join(dir, f), 'utf8');
      const def = JSON.parse(content) as EntityDef;
      this.builtIn.set(def.entityType, def);
    }
    this.logger.log(`loaded ${this.builtIn.size} built-in entity defs`);
  }

  private resolveEntityDefsDir(): string {
    // Resolve `@crm/metadata/package.json` to find the package root, then
    // navigate to the entityDefs directory. This works in both dev (workspace
    // symlink) and production builds.
    try {
      const pkgPath = require.resolve('@crm/metadata/package.json');
      return join(dirname(pkgPath), 'entityDefs');
    } catch {
      // Fallback: relative path from this file's compiled location.
      return resolve(__dirname, '..', '..', '..', '..', '..', 'packages', 'metadata', 'entityDefs');
    }
  }

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new Error('no tenant context');
    return ws;
  }

  async getEntity(entityType: string): Promise<EntityDef> {
    const base = this.builtIn.get(entityType);
    if (!base) throw new NotFoundException(`entityType ${entityType} not found`);
    const workspaceId = this.requireWs();
    const customFields = await this.prisma.customFieldDef.findMany({
      where: { workspaceId, entityType, archivedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    const merged: EntityDef = {
      ...base,
      fields: [
        ...base.fields,
        ...customFields.map<FieldDef>((cf: any) => ({
          key: cf.key,
          label: cf.label as any,
          type: cf.type,
          required: cf.required,
          unique: cf.unique,
          options: cf.options as any,
          helpText: cf.helpText as any,
          default: cf.default as any,
          validation: cf.validation as any,
          formulaExpr: cf.formulaExpr ?? undefined,
          rollupConfig: cf.rollupConfig as any,
        })),
      ],
    };
    return merged;
  }

  async listEntities(): Promise<
    Array<{
      entityType: string;
      labelSingular: { ar: string; en: string };
      labelPlural: { ar: string; en: string };
      icon?: string;
      color?: string;
    }>
  > {
    return Array.from(this.builtIn.values()).map(
      ({ entityType, labelSingular, labelPlural, icon, color }) => ({
        entityType,
        labelSingular,
        labelPlural,
        icon,
        color,
      }),
    );
  }
}
