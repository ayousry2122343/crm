import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import { BusinessHoursService } from './business-hours/business-hours.service';
import { NotificationService } from '../../notifications/notification.service';
import type { CreateSLAPolicyDto } from './dto/create-sla-policy.dto';
import type { UpdateSLAPolicyDto } from './dto/update-sla-policy.dto';
import type { QuerySLAPolicyDto } from './dto/query-sla-policy.dto';

interface SLARule {
  priority: string;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  breachAction: string;
}

@Injectable()
export class SLAService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
    private readonly businessHoursService: BusinessHoursService,
    private readonly notification: NotificationService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  private currentUser(): string | undefined {
    return this.tenant.getStore()?.userId;
  }

  async create(dto: CreateSLAPolicyDto) {
    const workspaceId = this.requireWs();

    if (dto.isDefault) {
      await this.prisma.sLAPolicy.updateMany({
        where: { workspaceId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const policy = await this.prisma.sLAPolicy.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        businessHoursId: dto.businessHoursId,
        isDefault: dto.isDefault ?? false,
        rules: dto.rules as any,
        createdById: this.currentUser()!,
      },
    });

    await this.audit.log({
      entityType: 'SLAPolicy',
      entityId: policy.id,
      action: 'CREATE',
      newValue: { name: dto.name },
    });

    return policy;
  }

  async list(q: QuerySLAPolicyDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };

    const items = await this.prisma.sLAPolicy.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: { businessHours: true },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;
    return { items: trimmed, nextCursor };
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const policy = await this.prisma.sLAPolicy.findUnique({
      where: { id },
      include: { businessHours: true },
    });
    if (!policy || policy.workspaceId !== workspaceId || policy.archivedAt) {
      throw new NotFoundException();
    }
    return policy;
  }

  async update(id: string, dto: UpdateSLAPolicyDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.sLAPolicy.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    if (dto.isDefault) {
      await this.prisma.sLAPolicy.updateMany({
        where: { workspaceId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.businessHoursId !== undefined) data.businessHoursId = dto.businessHoursId;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;
    if (dto.rules !== undefined) data.rules = dto.rules;

    const updated = await this.prisma.sLAPolicy.update({ where: { id }, data });
    await this.audit.logUpdate('SLAPolicy', id, before as any, data);
    return updated;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const policy = await this.prisma.sLAPolicy.findUnique({ where: { id } });
    if (!policy || policy.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.sLAPolicy.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'SLAPolicy',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }

  async assignSLA(ticket: { id: string; workspaceId: string; priority: string; queueId?: string | null }) {
    const policy = await this.prisma.sLAPolicy.findFirst({
      where: { workspaceId: ticket.workspaceId, isDefault: true, archivedAt: null },
    });

    if (!policy) return;

    const rules = policy.rules as unknown as SLARule[];
    const rule = rules.find((r) => r.priority === ticket.priority);
    if (!rule) return;

    const slaFirstResponseDue = await this.businessHoursService.calculateDueDate(
      policy.businessHoursId,
      new Date(),
      rule.firstResponseMinutes,
    );
    const slaResolutionDue = await this.businessHoursService.calculateDueDate(
      policy.businessHoursId,
      new Date(),
      rule.resolutionMinutes,
    );

    await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: { slaPolicyId: policy.id, slaFirstResponseDue, slaResolutionDue },
    });
  }

  async checkBreaches() {
    const now = new Date();
    const tickets = await this.prisma.ticket.findMany({
      where: {
        status: { notIn: ['RESOLVED', 'CLOSED'] },
        archivedAt: null,
        OR: [
          { slaFirstResponseDue: { lt: now }, firstResponseAt: null, slaFirstResponseBreached: false },
          { slaResolutionDue: { lt: now }, slaResolutionBreached: false },
        ],
      },
      include: { slaPolicy: true },
    });

    for (const ticket of tickets) {
      const data: any = {};
      let breachType = '';

      if (
        ticket.slaFirstResponseDue &&
        ticket.slaFirstResponseDue < now &&
        !ticket.firstResponseAt &&
        !ticket.slaFirstResponseBreached
      ) {
        data.slaFirstResponseBreached = true;
        breachType = 'firstResponse';
      }

      if (
        ticket.slaResolutionDue &&
        ticket.slaResolutionDue < now &&
        !ticket.slaResolutionBreached
      ) {
        data.slaResolutionBreached = true;
        if (!breachType) breachType = 'resolution';
      }

      if (Object.keys(data).length === 0) continue;

      await this.prisma.ticket.update({ where: { id: ticket.id }, data });

      const rules = (ticket.slaPolicy?.rules ?? []) as unknown as SLARule[];
      const rule = rules.find((r) => r.priority === ticket.priority);
      const breachAction = rule?.breachAction ?? 'NOTIFY';

      if (ticket.assigneeId) {
        let title: string;
        if (breachAction === 'ESCALATE') {
          title = `SLA ESCALATION: ${ticket.subject}`;
        } else if (breachAction === 'REASSIGN') {
          title = `SLA Breach (Reassign): ${ticket.subject}`;
        } else {
          title = `SLA Breach: ${ticket.subject}`;
        }

        await this.notification.create({
          userId: ticket.assigneeId,
          type: 'GENERAL',
          title,
          link: `/tickets/${ticket.id}`,
        });
      }

      await this.audit.log({
        entityType: 'Ticket',
        entityId: ticket.id,
        action: 'UPDATE',
        fieldKey: 'slaBreach',
        newValue: { breachType, breachAction },
      });
    }
  }
}
