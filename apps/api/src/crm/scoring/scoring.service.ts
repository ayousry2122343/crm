import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateScoringRuleDto } from './dto/create-scoring-rule.dto';
import type { UpdateScoringRuleDto } from './dto/update-scoring-rule.dto';
import type { QueryScoringRuleDto } from './dto/query-scoring-rule.dto';

const VALID_ENTITY_TYPES = ['PERSON', 'DEAL'];
const BATCH_SIZE = 100;

@Injectable()
export class ScoringService {
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

  async create(dto: CreateScoringRuleDto) {
    const workspaceId = this.requireWs();
    if (!VALID_ENTITY_TYPES.includes(dto.entityType)) {
      throw new BadRequestException('entityType must be PERSON or DEAL');
    }

    const rule = await this.prisma.scoringRule.create({
      data: {
        workspaceId,
        name: dto.name,
        entityType: dto.entityType,
        rules: dto.rules as any,
        maxScore: dto.maxScore ?? 100,
        createdById: this.currentUser()!,
      },
    });

    await this.audit.log({
      entityType: 'ScoringRule',
      entityId: rule.id,
      action: 'CREATE',
      newValue: { name: dto.name, entityType: dto.entityType },
    });

    return rule;
  }

  async list(q: QueryScoringRuleDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };
    if (q.entityType) where.entityType = q.entityType;
    if (q.isActive !== undefined) where.isActive = q.isActive === 'true';

    const items = await this.prisma.scoringRule.findMany({
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
    const rule = await this.prisma.scoringRule.findUnique({ where: { id } });
    if (!rule || rule.workspaceId !== workspaceId || rule.archivedAt) {
      throw new NotFoundException();
    }
    return rule;
  }

  async update(id: string, dto: UpdateScoringRuleDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.scoringRule.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.rules !== undefined) data.rules = dto.rules;
    if (dto.maxScore !== undefined) data.maxScore = dto.maxScore;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.scoringRule.update({ where: { id }, data });
    await this.audit.logUpdate('ScoringRule', id, before as any, data);
    return updated;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const rule = await this.prisma.scoringRule.findUnique({ where: { id } });
    if (!rule || rule.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.scoringRule.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'ScoringRule',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }

  async evaluateScore(entityType: string, entity: any): Promise<number> {
    const workspaceId = this.requireWs();
    const activeRules = await this.prisma.scoringRule.findMany({
      where: { workspaceId, entityType, isActive: true, archivedAt: null },
    });

    let totalScore = 0;

    for (const scoringRule of activeRules) {
      const ruleItems = scoringRule.rules as any[];
      let ruleScore = 0;

      for (const item of ruleItems) {
        const fieldValue = this.resolveField(entity, item.field);
        if (this.evaluateOperator(fieldValue, item.operator, item.value)) {
          ruleScore += item.points;
        }
      }

      totalScore += Math.min(ruleScore, scoringRule.maxScore);
    }

    return totalScore;
  }

  async scoreEntity(entityType: string, entityId: string) {
    const workspaceId = this.requireWs();
    const model = entityType === 'PERSON' ? this.prisma.person : this.prisma.deal;

    const entity = await (model as any).findUnique({ where: { id: entityId } });
    if (!entity || entity.workspaceId !== workspaceId || entity.archivedAt) {
      throw new NotFoundException();
    }

    const score = await this.evaluateScore(entityType, entity);
    const updated = await (model as any).update({
      where: { id: entityId },
      data: { score, scoreUpdatedAt: new Date() },
    });

    return updated;
  }

  async bulkRescore(entityType: string): Promise<{ processed: number; updated: number }> {
    const workspaceId = this.requireWs();
    const model = entityType === 'PERSON' ? this.prisma.person : this.prisma.deal;

    let processed = 0;
    let updated = 0;
    let cursor: string | undefined;

    while (true) {
      const where: any = { workspaceId, archivedAt: null };
      const batch = await (model as any).findMany({
        where: cursor ? { ...where, id: { gt: cursor } } : where,
        take: BATCH_SIZE,
        orderBy: { id: 'asc' },
      });

      if (batch.length === 0) break;

      for (const entity of batch) {
        const score = await this.evaluateScore(entityType, entity);
        await (model as any).update({
          where: { id: entity.id },
          data: { score, scoreUpdatedAt: new Date() },
        });
        processed++;
        updated++;
      }

      cursor = batch[batch.length - 1].id;
    }

    return { processed, updated };
  }

  private resolveField(entity: any, field: string): any {
    if (field.startsWith('customFields.')) {
      const key = field.slice('customFields.'.length);
      const cf = entity.customFields ?? {};
      return cf[key];
    }
    const val = entity[field];
    if (val && typeof val === 'object' && 'toNumber' in val) {
      return val.toNumber();
    }
    return val;
  }

  private evaluateOperator(fieldValue: any, operator: string, ruleValue: any): boolean {
    switch (operator) {
      case 'EQUALS':
        return fieldValue === ruleValue;
      case 'NOT_EQUALS':
        return fieldValue !== ruleValue;
      case 'CONTAINS':
        return String(fieldValue ?? '').toLowerCase().includes(String(ruleValue).toLowerCase());
      case 'GT':
        return Number(fieldValue) > Number(ruleValue);
      case 'LT':
        return Number(fieldValue) < Number(ruleValue);
      case 'GTE':
        return Number(fieldValue) >= Number(ruleValue);
      case 'LTE':
        return Number(fieldValue) <= Number(ruleValue);
      case 'IN':
        return Array.isArray(ruleValue) && ruleValue.includes(fieldValue);
      case 'NOT_IN':
        return Array.isArray(ruleValue) && !ruleValue.includes(fieldValue);
      case 'IS_SET':
        return fieldValue != null && fieldValue !== '';
      case 'IS_NOT_SET':
        return fieldValue == null || fieldValue === '';
      default:
        return false;
    }
  }
}
