import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import { MetadataService } from '../../core/metadata/metadata.service';
import { buildOrderBy, buildWhere, type FilterGroup, type ListQuery } from './query-builder';
import type { CreateListDto } from './dto/create-list.dto';
import type { UpdateListDto } from './dto/update-list.dto';

const ENTITY_DELEGATES: Record<string, (prisma: PrismaService) => any> = {
  Person: (prisma) => prisma.person,
  Company: (prisma) => prisma.person, // companies are people with isCompany=true
};

@Injectable()
export class ListService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
    private readonly metadata: MetadataService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  private currentUser(): string {
    const u = this.tenant.getStore()?.userId;
    if (!u) throw new BadRequestException('no user in tenant context');
    return u;
  }

  private async loadAllowedFields(entityType: string): Promise<Set<string>> {
    const meta = await this.metadata.getEntity(entityType);
    const allowed = new Set<string>();
    for (const f of meta.fields) {
      allowed.add(f.key);
      // Also expose customFields.<key> path-based access for JSONB fields.
      allowed.add(`customFields.${f.key}`);
    }
    // Built-in scalar columns common to all entity tables.
    allowed.add('id');
    allowed.add('createdAt');
    allowed.add('updatedAt');
    allowed.add('archivedAt');
    allowed.add('ownerId');
    allowed.add('lifecycleStage');
    allowed.add('email');
    allowed.add('phone');
    allowed.add('industry');
    allowed.add('website');
    allowed.add('isCompany');
    return allowed;
  }

  private async snapshotMemberIds(entityType: string, query: ListQuery): Promise<string[]> {
    const workspaceId = this.requireWs();
    const allowedFields = await this.loadAllowedFields(entityType);
    const where = query.filters
      ? buildWhere({ entityType, allowedFields }, query.filters as FilterGroup)
      : {};
    const orderBy = buildOrderBy({ entityType, allowedFields }, query.sort);
    const delegate = ENTITY_DELEGATES[entityType]?.(this.prisma);
    if (!delegate) {
      throw new BadRequestException(`entity type ${entityType} is not queryable in v1`);
    }
    const rows = await delegate.findMany({
      where: { ...where, workspaceId, archivedAt: null },
      take: Math.min(query.limit ?? 1000, 5000),
      orderBy,
      select: { id: true },
    });
    return rows.map((r: { id: string }) => r.id);
  }

  async create(dto: CreateListDto) {
    const workspaceId = this.requireWs();
    const ownerId = this.currentUser();
    const isActive = dto.isActive ?? true;

    // Validate the query against metadata + allowed fields by attempting compile.
    if (dto.query) {
      const allowedFields = await this.loadAllowedFields(dto.entityType);
      const q = dto.query as ListQuery;
      try {
        if (q.filters) {
          buildWhere({ entityType: dto.entityType, allowedFields }, q.filters as FilterGroup);
        }
        if (q.sort) {
          buildOrderBy({ entityType: dto.entityType, allowedFields }, q.sort);
        }
      } catch (err) {
        throw new BadRequestException((err as Error).message);
      }
    }

    let memberIds: string[] = [];
    if (!isActive) {
      memberIds = await this.snapshotMemberIds(dto.entityType, dto.query as ListQuery);
    }

    const row = await this.prisma.list.create({
      data: {
        workspaceId,
        entityType: dto.entityType,
        name: dto.name,
        description: dto.description,
        isActive,
        isShared: dto.isShared ?? false,
        query: dto.query as any,
        memberIds,
        ownerId,
      },
    });

    await this.audit.log({
      entityType: 'List',
      entityId: row.id,
      action: 'CREATE',
      newValue: { name: row.name, entityType: row.entityType, isActive: row.isActive },
    });

    return row;
  }

  async list(filter: { entityType?: string }) {
    const workspaceId = this.requireWs();
    const where: any = { workspaceId, archivedAt: null };
    if (filter.entityType) where.entityType = filter.entityType;
    return this.prisma.list.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const row = await this.prisma.list.findUnique({ where: { id } });
    if (!row || row.workspaceId !== workspaceId || row.archivedAt) throw new NotFoundException();
    return row;
  }

  async members(id: string, page: { cursor?: string; limit?: number }) {
    const workspaceId = this.requireWs();
    const list = await this.prisma.list.findUnique({ where: { id } });
    if (!list || list.workspaceId !== workspaceId || list.archivedAt) {
      throw new NotFoundException();
    }
    const limit = Math.min(page.limit ?? 50, 200);
    const delegate = ENTITY_DELEGATES[list.entityType]?.(this.prisma);
    if (!delegate) {
      throw new BadRequestException(`entity type ${list.entityType} is not queryable`);
    }

    if (list.isActive) {
      const allowedFields = await this.loadAllowedFields(list.entityType);
      const q = (list.query as unknown as ListQuery) ?? {};
      const where = q.filters
        ? buildWhere({ entityType: list.entityType, allowedFields }, q.filters as FilterGroup)
        : {};
      const orderBy = buildOrderBy({ entityType: list.entityType, allowedFields }, q.sort);
      const items = await delegate.findMany({
        where: {
          ...where,
          workspaceId,
          archivedAt: null,
          ...(page.cursor ? { id: { lt: page.cursor } } : {}),
        },
        take: limit + 1,
        orderBy: orderBy ?? { createdAt: 'desc' },
      });
      const hasMore = items.length > limit;
      const trimmed = hasMore ? items.slice(0, limit) : items;
      const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;
      return { items: trimmed, nextCursor };
    }

    // Static list — slice memberIds.
    const ids = list.memberIds ?? [];
    const startIdx = page.cursor ? ids.indexOf(page.cursor) + 1 : 0;
    const slice = ids.slice(startIdx, startIdx + limit);
    const items = await delegate.findMany({
      where: { workspaceId, id: { in: slice } },
    });
    const nextCursor = startIdx + limit < ids.length ? ids[startIdx + limit - 1] : null;
    return { items, nextCursor };
  }

  async update(id: string, dto: UpdateListDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.list.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    if (dto.query) {
      const allowedFields = await this.loadAllowedFields(before.entityType);
      const q = dto.query as ListQuery;
      try {
        if (q.filters) {
          buildWhere({ entityType: before.entityType, allowedFields }, q.filters as FilterGroup);
        }
        if (q.sort) {
          buildOrderBy({ entityType: before.entityType, allowedFields }, q.sort);
        }
      } catch (err) {
        throw new BadRequestException((err as Error).message);
      }
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.isShared !== undefined) data.isShared = dto.isShared;
    if (dto.query !== undefined) data.query = dto.query as any;

    // Re-snapshot if flipping to static or query changed while static.
    const willBeStatic = dto.isActive === false || (dto.isActive === undefined && !before.isActive);
    if (willBeStatic && (dto.isActive === false || dto.query)) {
      const q = (dto.query ?? before.query) as ListQuery;
      data.memberIds = await this.snapshotMemberIds(before.entityType, q);
    }

    const after = await this.prisma.list.update({ where: { id }, data });
    await this.audit.logUpdate('List', id, before as any, after as any);
    return after;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const list = await this.prisma.list.findUnique({ where: { id } });
    if (!list || list.workspaceId !== workspaceId) throw new NotFoundException();
    const archived = await this.prisma.list.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    await this.audit.log({ entityType: 'List', entityId: id, action: 'DELETE' });
    return archived;
  }
}
