import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateGoalDto } from './dto/create-goal.dto';
import type { UpdateGoalDto } from './dto/update-goal.dto';
import type { QueryGoalDto } from './dto/query-goal.dto';
import type { GoalStatus } from '@prisma/client';

@Injectable()
export class GoalService {
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

  async create(dto: CreateGoalDto) {
    const workspaceId = this.requireWs();

    const goal = await this.prisma.goal.create({
      data: {
        workspaceId,
        name: dto.name,
        metric: dto.metric as any,
        targetValue: dto.targetValue,
        period: dto.period,
        startDate: dto.startDate,
        endDate: dto.endDate,
        ownerId: dto.ownerId,
        teamId: dto.teamId,
        createdById: this.currentUser()!,
      },
      include: { owner: true, team: true },
    });

    await this.audit.log({
      entityType: 'Goal',
      entityId: goal.id,
      action: 'CREATE',
      newValue: { name: dto.name, metric: dto.metric, targetValue: dto.targetValue },
    });

    return goal;
  }

  async list(q: QueryGoalDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };
    if (q.status) where.status = q.status;
    if (q.ownerId) where.ownerId = q.ownerId;
    if (q.teamId) where.teamId = q.teamId;

    const items = await this.prisma.goal.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: { owner: true, team: true },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;
    return { items: trimmed, nextCursor };
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const goal = await this.prisma.goal.findUnique({
      where: { id },
      include: { owner: true, team: true },
    });
    if (!goal || goal.workspaceId !== workspaceId || goal.archivedAt) {
      throw new NotFoundException();
    }
    return goal;
  }

  async update(id: string, dto: UpdateGoalDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.goal.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.metric !== undefined) data.metric = dto.metric;
    if (dto.targetValue !== undefined) data.targetValue = dto.targetValue;
    if (dto.currentValue !== undefined) data.currentValue = dto.currentValue;
    if (dto.period !== undefined) data.period = dto.period;
    if (dto.startDate !== undefined) data.startDate = dto.startDate;
    if (dto.endDate !== undefined) data.endDate = dto.endDate;
    if (dto.ownerId !== undefined) data.ownerId = dto.ownerId;
    if (dto.teamId !== undefined) data.teamId = dto.teamId;

    const updated = await this.prisma.goal.update({
      where: { id },
      data,
      include: { owner: true, team: true },
    });

    await this.audit.logUpdate('Goal', id, before as any, data);
    return updated;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal || goal.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.goal.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Goal',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }

  async recalculateProgress(id: string) {
    const workspaceId = this.requireWs();
    const goal = await this.prisma.goal.findUnique({ where: { id } });
    if (!goal || goal.workspaceId !== workspaceId || goal.archivedAt) {
      throw new NotFoundException();
    }

    const targetValue = typeof goal.targetValue === 'object' && goal.targetValue !== null && 'toNumber' in goal.targetValue
      ? (goal.targetValue as any).toNumber()
      : Number(goal.targetValue);

    let currentValue = 0;

    if (goal.metric === 'CUSTOM') {
      const cv = typeof goal.currentValue === 'object' && goal.currentValue !== null && 'toNumber' in goal.currentValue
        ? (goal.currentValue as any).toNumber()
        : Number(goal.currentValue);
      currentValue = cv;
    } else if (goal.metric === 'REVENUE') {
      const result = await this.prisma.deal.aggregate({
        where: {
          workspaceId,
          status: 'WON',
          wonAt: { gte: goal.startDate, lte: goal.endDate },
        },
        _sum: { amount: true },
      });
      const sum = result._sum?.amount;
      currentValue = sum && typeof sum === 'object' && 'toNumber' in sum
        ? (sum as any).toNumber()
        : Number(sum ?? 0);
    } else if (goal.metric === 'DEAL_COUNT') {
      currentValue = await this.prisma.deal.count({
        where: {
          workspaceId,
          createdAt: { gte: goal.startDate, lte: goal.endDate },
        },
      });
    } else if (goal.metric === 'WON_DEAL_COUNT') {
      currentValue = await this.prisma.deal.count({
        where: {
          workspaceId,
          status: 'WON',
          wonAt: { gte: goal.startDate, lte: goal.endDate },
        },
      });
    } else if (goal.metric === 'ACTIVITY_COUNT') {
      currentValue = await this.prisma.activity.count({
        where: {
          workspaceId,
          createdAt: { gte: goal.startDate, lte: goal.endDate },
        },
      });
    } else if (goal.metric === 'AVG_DEAL_SIZE') {
      const result = await this.prisma.deal.aggregate({
        where: {
          workspaceId,
          status: 'WON',
          wonAt: { gte: goal.startDate, lte: goal.endDate },
        },
        _avg: { amount: true },
      });
      const avg = result._avg?.amount;
      currentValue = avg && typeof avg === 'object' && 'toNumber' in avg
        ? (avg as any).toNumber()
        : Number(avg ?? 0);
    }

    const status = this.computeStatus(currentValue, targetValue, goal.startDate, goal.endDate);

    return this.prisma.goal.update({
      where: { id },
      data: { currentValue, status },
      include: { owner: true, team: true },
    });
  }

  private computeStatus(
    currentValue: number,
    targetValue: number,
    startDate: Date,
    endDate: Date,
  ): GoalStatus {
    if (targetValue <= 0) return 'ON_TRACK';
    const attainment = (currentValue / targetValue) * 100;
    if (attainment >= 100) return 'ACHIEVED';

    const now = new Date();
    const totalMs = endDate.getTime() - startDate.getTime();
    const elapsedMs = now.getTime() - startDate.getTime();
    const timeElapsed = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 100;

    if (attainment >= timeElapsed - 10) return 'ON_TRACK';
    if (attainment >= timeElapsed - 25) return 'AT_RISK';
    return 'BEHIND';
  }
}
