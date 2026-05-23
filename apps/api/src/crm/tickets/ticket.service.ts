import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { QueueService } from '../queues/queue.service';
import { SLAService } from '../sla/sla.service';
import type { CreateTicketDto } from './dto/create-ticket.dto';
import type { UpdateTicketDto } from './dto/update-ticket.dto';
import type { QueryTicketDto } from './dto/query-ticket.dto';
import type { ChangeStatusDto } from './dto/change-status.dto';
import type { AssignTicketDto } from './dto/assign-ticket.dto';

export function formatTicketNumber(n: number): string {
  return 'TKT-' + n.toString().padStart(4, '0');
}

export const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'],
  OPEN: ['PENDING', 'ON_HOLD', 'RESOLVED', 'CLOSED'],
  PENDING: ['OPEN', 'ON_HOLD', 'RESOLVED', 'CLOSED'],
  ON_HOLD: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED'],
  RESOLVED: ['OPEN', 'CLOSED'],
  CLOSED: ['OPEN'],
};

const TICKET_INCLUDE = { contact: true, company: true, assignee: true, team: true, queue: true };

@Injectable()
export class TicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
    private readonly notification: NotificationService,
    private readonly queueService: QueueService,
    private readonly slaService: SLAService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  private currentUser(): string | undefined {
    return this.tenant.getStore()?.userId;
  }

  async create(dto: CreateTicketDto) {
    const workspaceId = this.requireWs();

    const last = await this.prisma.ticket.findFirst({
      where: { workspaceId },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });
    const ticketNumber = (last?.ticketNumber ?? 0) + 1;

    const data: any = {
      workspaceId,
      ticketNumber,
      subject: dto.subject,
      createdById: this.currentUser()!,
    };
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.channel !== undefined) data.channel = dto.channel;
    if (dto.contactId !== undefined) data.contactId = dto.contactId;
    if (dto.companyId !== undefined) data.companyId = dto.companyId;
    if (dto.assigneeId !== undefined) data.assigneeId = dto.assigneeId;
    if (dto.teamId !== undefined) data.teamId = dto.teamId;
    if (dto.queueId !== undefined) data.queueId = dto.queueId;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.customFields !== undefined) data.customFields = dto.customFields;

    if (dto.queueId && !dto.assigneeId) {
      const nextAssignee = await this.queueService.getNextAssignee(dto.queueId);
      if (nextAssignee) data.assigneeId = nextAssignee;
    }

    const ticket = await this.prisma.ticket.create({
      data,
      include: TICKET_INCLUDE,
    });

    await this.audit.log({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'CREATE',
      newValue: { subject: dto.subject, ticketNumber },
    });

    if (ticket.assigneeId) {
      await this.notification.create({
        userId: ticket.assigneeId,
        type: 'GENERAL',
        title: `Ticket assigned to you: ${dto.subject}`,
        link: `/tickets/${ticket.id}`,
      });
    }

    try { await this.slaService.assignSLA(ticket); } catch {}

    return ticket;
  }

  async list(q: QueryTicketDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };
    if (q.status) where.status = q.status;
    if (q.priority) where.priority = q.priority;
    if (q.assigneeId) where.assigneeId = q.assigneeId;
    if (q.contactId) where.contactId = q.contactId;
    if (q.channel) where.channel = q.channel;
    if (q.teamId) where.teamId = q.teamId;
    if (q.queueId) where.queueId = q.queueId;
    if (q.search) where.subject = { contains: q.search, mode: 'insensitive' };

    const items = await this.prisma.ticket.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: TICKET_INCLUDE,
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;
    return { items: trimmed, nextCursor };
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });
    if (!ticket || ticket.workspaceId !== workspaceId || ticket.archivedAt) {
      throw new NotFoundException();
    }
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.ticket.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.channel !== undefined) data.channel = dto.channel;
    if (dto.contactId !== undefined) data.contactId = dto.contactId;
    if (dto.companyId !== undefined) data.companyId = dto.companyId;
    if (dto.teamId !== undefined) data.teamId = dto.teamId;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.customFields !== undefined) data.customFields = dto.customFields;

    const updated = await this.prisma.ticket.update({
      where: { id },
      data,
      include: TICKET_INCLUDE,
    });

    await this.audit.logUpdate('Ticket', id, before as any, data);

    if (dto.priority !== undefined && dto.priority !== (before as any).priority) {
      try { await this.slaService.assignSLA(updated); } catch {}
    }

    return updated;
  }

  async changeStatus(id: string, dto: ChangeStatusDto) {
    const workspaceId = this.requireWs();
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });
    if (!ticket || ticket.workspaceId !== workspaceId || ticket.archivedAt) {
      throw new NotFoundException();
    }

    const allowed = VALID_TRANSITIONS[ticket.status] ?? [];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${ticket.status} to ${dto.status}`,
      );
    }

    const data: any = { status: dto.status };

    if (dto.status === 'RESOLVED') {
      data.resolvedAt = new Date();
    }
    if (dto.status === 'CLOSED') {
      data.closedAt = new Date();
    }
    if (dto.status === 'OPEN' && (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED')) {
      data.resolvedAt = null;
      data.closedAt = null;
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data,
      include: TICKET_INCLUDE,
    });

    await this.audit.log({
      entityType: 'Ticket',
      entityId: id,
      action: 'UPDATE',
      fieldKey: 'status',
      oldValue: ticket.status,
      newValue: dto.status,
    });

    return updated;
  }

  async assign(id: string, dto: AssignTicketDto) {
    const workspaceId = this.requireWs();
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: TICKET_INCLUDE,
    });
    if (!ticket || ticket.workspaceId !== workspaceId || ticket.archivedAt) {
      throw new NotFoundException();
    }

    const oldAssigneeId = ticket.assigneeId;

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { assigneeId: dto.assigneeId },
      include: TICKET_INCLUDE,
    });

    await this.audit.log({
      entityType: 'Ticket',
      entityId: id,
      action: 'UPDATE',
      fieldKey: 'assigneeId',
      oldValue: oldAssigneeId,
      newValue: dto.assigneeId,
    });

    await this.notification.create({
      userId: dto.assigneeId,
      type: 'GENERAL',
      title: `Ticket assigned to you: ${ticket.subject}`,
      link: `/tickets/${ticket.id}`,
    });

    return updated;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket || ticket.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.ticket.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Ticket',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }

  async moveToQueue(ticketId: string, queueId: string) {
    const workspaceId = this.requireWs();
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = { queueId };
    const nextAssignee = await this.queueService.getNextAssignee(queueId);
    if (nextAssignee) data.assigneeId = nextAssignee;

    const updated = await this.prisma.ticket.update({
      where: { id: ticketId },
      data,
      include: TICKET_INCLUDE,
    });

    await this.audit.log({
      entityType: 'Ticket',
      entityId: ticketId,
      action: 'UPDATE',
      fieldKey: 'queueId',
      oldValue: ticket.queueId,
      newValue: queueId,
    });

    if (nextAssignee) {
      await this.notification.create({
        userId: nextAssignee,
        type: 'GENERAL',
        title: `Ticket assigned to you: ${ticket.subject}`,
        link: `/tickets/${ticketId}`,
      });
    }

    return updated;
  }
}
