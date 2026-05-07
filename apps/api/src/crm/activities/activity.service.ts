import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateActivityDto } from './dto/create-activity.dto';
import type { UpdateActivityDto } from './dto/update-activity.dto';
import type { QueryActivityDto } from './dto/query-activity.dto';

@Injectable()
export class ActivityService {
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

  private currentUser(): string | undefined {
    return this.tenant.getStore()?.userId;
  }

  async create(dto: CreateActivityDto) {
    const workspaceId = this.requireWs();

    const row = await this.prisma.activity.create({
      data: {
        workspaceId,
        parentEntity: dto.parentEntity,
        parentId: dto.parentId,
        type: dto.type as any,
        subject: dto.subject,
        body: dto.body,
        status: 'OPEN',
        ownerId: dto.ownerId,
        dueAt: dto.dueAt,
        metadata: (dto.metadata ?? {}) as any,
        createdById: this.currentUser(),
      },
    });

    await this.audit.log({
      entityType: 'Activity',
      entityId: row.id,
      action: 'CREATE',
      newValue: { type: row.type, subject: row.subject },
    });

    await this.rollupLastActivity(dto.parentEntity, dto.parentId);

    return row;
  }

  async list(q: QueryActivityDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId };
    if (q.parentEntity) where.parentEntity = q.parentEntity;
    if (q.parentId) where.parentId = q.parentId;
    if (q.type) where.type = q.type;
    if (q.ownerId) where.ownerId = q.ownerId;
    if (q.status) where.status = q.status;

    const orderBy = this.parseSort(q.sort);

    const items = await this.prisma.activity.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy,
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;

    return { items: trimmed, nextCursor };
  }

  private parseSort(sort?: string): any {
    if (!sort) return { createdAt: 'desc' };
    const fields = sort
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (fields.length === 0) return { createdAt: 'desc' };
    return fields.map((f) => {
      if (f.startsWith('-')) return { [f.slice(1)]: 'desc' };
      return { [f]: 'asc' };
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const a = await this.prisma.activity.findUnique({ where: { id } });
    if (!a || a.workspaceId !== workspaceId) throw new NotFoundException();
    return a;
  }

  async update(id: string, dto: UpdateActivityDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.activity.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.ownerId !== undefined) data.ownerId = dto.ownerId;
    if (dto.dueAt !== undefined) data.dueAt = dto.dueAt;
    if (dto.metadata !== undefined) data.metadata = dto.metadata as any;

    const after = await this.prisma.activity.update({ where: { id }, data });
    await this.audit.logUpdate('Activity', id, before as any, after as any);
    return after;
  }

  async complete(id: string) {
    const workspaceId = this.requireWs();
    const a = await this.prisma.activity.findUnique({ where: { id } });
    if (!a || a.workspaceId !== workspaceId) throw new NotFoundException();

    const updated = await this.prisma.activity.update({
      where: { id },
      data: { status: 'DONE', completedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Activity',
      entityId: id,
      action: 'UPDATE',
      newValue: { status: 'DONE' },
    });

    return updated;
  }

  async cancel(id: string) {
    const workspaceId = this.requireWs();
    const a = await this.prisma.activity.findUnique({ where: { id } });
    if (!a || a.workspaceId !== workspaceId) throw new NotFoundException();

    const updated = await this.prisma.activity.update({
      where: { id },
      data: { status: 'CANCELED' },
    });

    await this.audit.log({
      entityType: 'Activity',
      entityId: id,
      action: 'UPDATE',
      newValue: { status: 'CANCELED' },
    });

    return updated;
  }

  private async rollupLastActivity(parentEntity: string, parentId: string): Promise<void> {
    if (parentEntity === 'Deal') {
      await this.prisma.deal.update({
        where: { id: parentId },
        data: { lastActivityAt: new Date() },
      });
    }
  }
}
