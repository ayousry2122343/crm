import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateQueueDto } from './dto/create-queue.dto';
import type { UpdateQueueDto } from './dto/update-queue.dto';
import type { QueryQueueDto } from './dto/query-queue.dto';

@Injectable()
export class QueueService {
  private rrIndex = new Map<string, number>();

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

  async create(dto: CreateQueueDto) {
    const workspaceId = this.requireWs();

    const data: any = {
      workspaceId,
      name: dto.name,
      createdById: this.currentUser()!,
    };
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.assignmentMode !== undefined) data.assignmentMode = dto.assignmentMode;
    if (dto.members !== undefined) data.members = dto.members;

    const queue = await this.prisma.queue.create({ data });

    await this.audit.log({
      entityType: 'Queue',
      entityId: queue.id,
      action: 'CREATE',
      newValue: { name: dto.name },
    });

    return queue;
  }

  async list(q: QueryQueueDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };
    if (q.assignmentMode) where.assignmentMode = q.assignmentMode;

    const items = await this.prisma.queue.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;
    return { items: trimmed, nextCursor };
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const queue = await this.prisma.queue.findUnique({ where: { id } });
    if (!queue || queue.workspaceId !== workspaceId || queue.archivedAt) {
      throw new NotFoundException();
    }
    return queue;
  }

  async update(id: string, dto: UpdateQueueDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.queue.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.assignmentMode !== undefined) data.assignmentMode = dto.assignmentMode;
    if (dto.members !== undefined) data.members = dto.members;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

    const updated = await this.prisma.queue.update({ where: { id }, data });
    await this.audit.logUpdate('Queue', id, before as any, data);
    return updated;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const queue = await this.prisma.queue.findUnique({ where: { id } });
    if (!queue || queue.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.queue.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Queue',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }

  async addMember(queueId: string, userId: string) {
    const queue = await this.get(queueId);
    const members: string[] = Array.isArray(queue.members) ? queue.members as string[] : [];
    if (!members.includes(userId)) {
      members.push(userId);
    }

    const updated = await this.prisma.queue.update({
      where: { id: queueId },
      data: { members },
    });

    await this.audit.log({
      entityType: 'Queue',
      entityId: queueId,
      action: 'UPDATE',
      fieldKey: 'members',
      newValue: { added: userId },
    });

    return updated;
  }

  async removeMember(queueId: string, userId: string) {
    const queue = await this.get(queueId);
    const members: string[] = Array.isArray(queue.members) ? queue.members as string[] : [];
    const filtered = members.filter((m) => m !== userId);

    const updated = await this.prisma.queue.update({
      where: { id: queueId },
      data: { members: filtered },
    });

    await this.audit.log({
      entityType: 'Queue',
      entityId: queueId,
      action: 'UPDATE',
      fieldKey: 'members',
      newValue: { removed: userId },
    });

    return updated;
  }

  async getNextAssignee(queueId: string): Promise<string | null> {
    const queue = await this.get(queueId);
    const members: string[] = Array.isArray(queue.members) ? queue.members as string[] : [];

    if (members.length === 0) return null;

    if (queue.assignmentMode === 'MANUAL') return null;

    if (queue.assignmentMode === 'ROUND_ROBIN') {
      const lastIndex = this.rrIndex.get(queueId) ?? -1;
      const nextIndex = (lastIndex + 1) % members.length;
      this.rrIndex.set(queueId, nextIndex);
      return members[nextIndex];
    }

    if (queue.assignmentMode === 'LEAST_ACTIVE') {
      const workspaceId = this.requireWs();
      const counts = await this.prisma.ticket.groupBy({
        by: ['assigneeId'],
        where: {
          workspaceId,
          assigneeId: { in: members },
          status: { notIn: ['RESOLVED', 'CLOSED'] },
        },
        _count: { _all: true },
      });
      const countMap = new Map(counts.map((c: any) => [c.assigneeId, c._count._all]));
      return members.reduce((best, m) =>
        (countMap.get(m) ?? 0) < (countMap.get(best) ?? 0) ? m : best,
      );
    }

    return null;
  }
}
