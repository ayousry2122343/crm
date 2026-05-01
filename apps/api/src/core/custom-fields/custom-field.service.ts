import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import {
  ALLOWED_INDEXABLE_TYPES,
  ALLOWED_INDEXED_TABLES,
  assertSafeFieldKey,
  buildGeneratedColumnSql,
  buildDropGeneratedColumnSql,
  type IndexableTable,
  type IndexableType,
} from './custom-field-ddl.util';
import type { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import type { UpdateCustomFieldDto } from './dto/update-custom-field.dto';

const TYPES_REQUIRING_OPTIONS = new Set(['PICKLIST', 'MULTI_PICKLIST', 'LOOKUP']);

@Injectable()
export class CustomFieldService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  async create(dto: CreateCustomFieldDto) {
    const workspaceId = this.requireWs();
    assertSafeFieldKey(dto.key);

    if (TYPES_REQUIRING_OPTIONS.has(dto.type) && !dto.options) {
      throw new BadRequestException(`type ${dto.type} requires options`);
    }
    if (dto.type === 'FORMULA' && !dto.formulaExpr) {
      throw new BadRequestException(`type FORMULA requires formulaExpr`);
    }
    if (dto.type === 'ROLLUP' && !dto.rollupConfig) {
      throw new BadRequestException(`type ROLLUP requires rollupConfig`);
    }

    if (dto.indexed) {
      if (!ALLOWED_INDEXABLE_TYPES.has(dto.type as IndexableType)) {
        throw new BadRequestException(`type ${dto.type} is not indexable`);
      }
      if (!ALLOWED_INDEXED_TABLES.has(dto.entityType as IndexableTable)) {
        throw new BadRequestException(`entityType ${dto.entityType} is not indexable in v1`);
      }
    }

    const dup = await this.prisma.customFieldDef.findFirst({
      where: { workspaceId, entityType: dto.entityType, key: dto.key, archivedAt: null },
    });
    if (dup) throw new ConflictException(`field ${dto.entityType}.${dto.key} already exists`);

    // Wrap CustomFieldDef row + DDL in a single transaction so a failed DDL
    // (e.g. table doesn't exist yet) rolls back the row, preventing the
    // "row persisted but indexed column missing" inconsistency.
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customFieldDef.create({
        data: {
          workspaceId,
          entityType: dto.entityType,
          key: dto.key,
          label: dto.label as any,
          type: dto.type,
          options: dto.options == null ? undefined : (dto.options as any),
          required: dto.required ?? false,
          unique: dto.unique ?? false,
          indexed: dto.indexed ?? false,
          default: dto.default == null ? undefined : (dto.default as any),
          validation: dto.validation == null ? undefined : (dto.validation as any),
          helpText: dto.helpText == null ? undefined : (dto.helpText as any),
          visibleToProfileIds: dto.visibleToProfileIds ?? [],
          editableByProfileIds: dto.editableByProfileIds ?? [],
          formulaExpr: dto.formulaExpr,
          rollupConfig: dto.rollupConfig == null ? undefined : (dto.rollupConfig as any),
        },
      });

      if (dto.indexed) {
        const sql = buildGeneratedColumnSql(
          dto.entityType as IndexableTable,
          dto.key,
          dto.type as IndexableType,
        );
        const stmts = sql.split('\n').filter((s) => s.trim());
        for (const stmt of stmts) {
          await tx.$executeRawUnsafe(stmt);
        }
      }

      return created;
    });

    await this.audit.log({
      entityType: 'CustomFieldDef',
      entityId: row.id,
      action: 'CREATE',
      newValue: { entityType: dto.entityType, key: dto.key, type: dto.type },
    });

    return row;
  }

  async list(entityType?: string) {
    const workspaceId = this.requireWs();
    return this.prisma.customFieldDef.findMany({
      where: { workspaceId, archivedAt: null, ...(entityType ? { entityType } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async update(id: string, dto: UpdateCustomFieldDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.customFieldDef.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();
    const after = await this.prisma.customFieldDef.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label as any } : {}),
        ...(dto.options !== undefined ? { options: dto.options as any } : {}),
        ...(dto.required !== undefined ? { required: dto.required } : {}),
        ...(dto.unique !== undefined ? { unique: dto.unique } : {}),
        ...(dto.default !== undefined ? { default: dto.default as any } : {}),
        ...(dto.validation !== undefined ? { validation: dto.validation as any } : {}),
        ...(dto.helpText !== undefined ? { helpText: dto.helpText as any } : {}),
        ...(dto.visibleToProfileIds !== undefined
          ? { visibleToProfileIds: dto.visibleToProfileIds }
          : {}),
        ...(dto.editableByProfileIds !== undefined
          ? { editableByProfileIds: dto.editableByProfileIds }
          : {}),
      },
    });
    await this.audit.logUpdate('CustomFieldDef', id, before as any, after as any);
    return after;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const cf = await this.prisma.customFieldDef.findUnique({ where: { id } });
    if (!cf || cf.workspaceId !== workspaceId) throw new NotFoundException();
    if (cf.indexed && ALLOWED_INDEXED_TABLES.has(cf.entityType as IndexableTable)) {
      const sql = buildDropGeneratedColumnSql(cf.entityType as IndexableTable, cf.key);
      const stmts = sql.split('\n').filter((s) => s.trim());
      for (const stmt of stmts) {
        await this.prisma.$executeRawUnsafe(stmt);
      }
    }
    const archived = await this.prisma.customFieldDef.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    await this.audit.log({
      entityType: 'CustomFieldDef',
      entityId: id,
      action: 'DELETE',
    });
    return archived;
  }
}
