import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateDealDto } from './dto/create-deal.dto';
import type { UpdateDealDto } from './dto/update-deal.dto';
import type { MoveDealDto } from './dto/move-deal.dto';
import type { QueryDealDto } from './dto/query-deal.dto';

@Injectable()
export class DealService {
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

  async create(dto: CreateDealDto) {
    const workspaceId = this.requireWs();

    const pipeline = await this.prisma.pipeline.findUnique({ where: { id: dto.pipelineId } });
    if (!pipeline || pipeline.workspaceId !== workspaceId) {
      throw new BadRequestException('Invalid pipeline');
    }

    const stage = await this.prisma.stage.findUnique({ where: { id: dto.stageId } });
    if (!stage || stage.pipelineId !== dto.pipelineId) {
      throw new BadRequestException('Stage does not belong to this pipeline');
    }

    const row = await this.prisma.deal.create({
      data: {
        workspaceId,
        name: dto.name,
        pipelineId: dto.pipelineId,
        stageId: dto.stageId,
        amount: dto.amount ?? 0,
        currency: dto.currency ?? 'EGP',
        expectedCloseDate: dto.expectedCloseDate,
        probability: dto.probability ?? stage.probability,
        ownerId: dto.ownerId,
        primaryContactId: dto.primaryContactId,
        primaryCompanyId: dto.primaryCompanyId,
        source: dto.source,
        customFields: (dto.customFields ?? {}) as any,
        createdById: this.currentUser(),
      },
      include: { stage: true },
    });

    await this.audit.log({
      entityType: 'Deal',
      entityId: row.id,
      action: 'CREATE',
      newValue: { name: row.name, stageId: row.stageId },
    });

    return row;
  }

  async list(q: QueryDealDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };
    if (q.pipelineId) where.pipelineId = q.pipelineId;
    if (q.stageId) where.stageId = q.stageId;
    if (q.ownerId) where.ownerId = q.ownerId;
    if (q.status) where.status = q.status;

    const orderBy = this.parseSort(q.sort);

    const items = await this.prisma.deal.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy,
      include: { stage: true },
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
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        stage: true,
        pipeline: true,
        primaryContact: true,
        primaryCompany: true,
        owner: true,
      },
    });
    if (!deal || deal.workspaceId !== workspaceId || deal.archivedAt) {
      throw new NotFoundException();
    }
    return deal;
  }

  async update(id: string, dto: UpdateDealDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.deal.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = { updatedById: this.currentUser() };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.amount !== undefined) data.amount = dto.amount;
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.expectedCloseDate !== undefined) data.expectedCloseDate = dto.expectedCloseDate;
    if (dto.probability !== undefined) data.probability = dto.probability;
    if (dto.ownerId !== undefined) data.ownerId = dto.ownerId;
    if (dto.primaryContactId !== undefined) data.primaryContactId = dto.primaryContactId;
    if (dto.primaryCompanyId !== undefined) data.primaryCompanyId = dto.primaryCompanyId;
    if (dto.source !== undefined) data.source = dto.source;
    if (dto.customFields !== undefined) data.customFields = dto.customFields as any;

    const after = await this.prisma.deal.update({
      where: { id },
      data,
      include: { stage: true },
    });

    await this.audit.logUpdate('Deal', id, before as any, after as any);
    return after;
  }

  async moveStage(id: string, dto: MoveDealDto) {
    const workspaceId = this.requireWs();
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal || deal.workspaceId !== workspaceId) throw new NotFoundException();

    const stage = await this.prisma.stage.findUnique({ where: { id: dto.stageId } });
    if (!stage || stage.pipelineId !== deal.pipelineId) {
      throw new BadRequestException('Stage does not belong to this pipeline');
    }

    const data: any = {
      stageId: dto.stageId,
      probability: stage.probability,
      updatedById: this.currentUser(),
    };

    if (stage.isWon) {
      if (!dto.wonReason) throw new BadRequestException('wonReason is required for Won stage');
      data.status = 'WON';
      data.wonAt = new Date();
      data.wonReason = dto.wonReason;
      data.lostAt = null;
      data.lostReason = null;
    } else if (stage.isLost) {
      if (!dto.lostReason) throw new BadRequestException('lostReason is required for Lost stage');
      data.status = 'LOST';
      data.lostAt = new Date();
      data.lostReason = dto.lostReason;
      data.wonAt = null;
      data.wonReason = null;
    } else {
      data.status = 'OPEN';
      data.wonAt = null;
      data.lostAt = null;
      data.wonReason = null;
      data.lostReason = null;
    }

    const after = await this.prisma.deal.update({
      where: { id },
      data,
      include: { stage: true },
    });

    await this.audit.log({
      entityType: 'Deal',
      entityId: id,
      action: 'UPDATE',
      newValue: { stageId: dto.stageId, status: data.status },
    });

    await this.prisma.activity.create({
      data: {
        workspaceId,
        parentEntity: 'Deal',
        parentId: id,
        type: 'SYSTEM',
        subject: `Stage changed to ${stage.name}`,
        status: 'DONE',
        createdById: this.currentUser(),
      },
    });

    return after;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const deal = await this.prisma.deal.findUnique({ where: { id } });
    if (!deal || deal.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.deal.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Deal',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }

  async kanban(pipelineId: string) {
    const workspaceId = this.requireWs();
    const pipeline = await this.prisma.pipeline.findUnique({ where: { id: pipelineId } });
    if (!pipeline || pipeline.workspaceId !== workspaceId) throw new NotFoundException();

    const stages = await this.prisma.stage.findMany({
      where: { pipelineId },
      orderBy: { order: 'asc' },
    });

    const deals = await this.prisma.deal.findMany({
      where: { workspaceId, pipelineId, status: 'OPEN', archivedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { primaryContact: true, owner: true },
    });

    const dealsByStage = new Map<string, any[]>();
    for (const deal of deals) {
      const list = dealsByStage.get(deal.stageId) ?? [];
      list.push(deal);
      dealsByStage.set(deal.stageId, list);
    }

    return {
      pipeline,
      stages: stages.map((s) => ({
        ...s,
        deals: dealsByStage.get(s.id) ?? [],
      })),
    };
  }
}
