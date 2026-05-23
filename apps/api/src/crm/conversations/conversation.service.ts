import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import type { QueryConversationDto } from './dto/query-conversation.dto';

@Injectable()
export class ConversationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
    private readonly notification: NotificationService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  async list(q: QueryConversationDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId };
    if (q.assigneeId) where.assigneeId = q.assigneeId;
    if (q.status) where.status = q.status;
    if (q.channelType) where.channelType = q.channelType;
    if (q.queueId) where.queueId = q.queueId;

    const items = await this.prisma.conversation.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy: { lastMessageAt: 'desc' },
      include: { person: { select: { id: true, fullName: true, email: true, phone: true } } },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;
    return { items: trimmed, nextCursor };
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: { person: { select: { id: true, fullName: true, email: true, phone: true } } },
    });
    if (!conv || conv.workspaceId !== workspaceId) throw new NotFoundException();
    return conv;
  }

  async assign(id: string, assigneeId: string) {
    const workspaceId = this.requireWs();
    const conv = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conv || conv.workspaceId !== workspaceId) throw new NotFoundException();

    const oldAssigneeId = conv.assigneeId;

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { assigneeId },
    });

    await this.audit.log({
      entityType: 'Conversation',
      entityId: id,
      action: 'UPDATE',
      fieldKey: 'assigneeId',
      oldValue: oldAssigneeId,
      newValue: assigneeId,
    });

    await this.notification.create({
      userId: assigneeId,
      type: 'GENERAL',
      title: `Conversation assigned to you`,
      link: `/conversations/${id}`,
    });

    return updated;
  }

  async snooze(id: string, until: string) {
    const workspaceId = this.requireWs();
    const conv = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conv || conv.workspaceId !== workspaceId) throw new NotFoundException();

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { status: 'SNOOZED', snoozedUntil: until },
    });

    await this.audit.log({
      entityType: 'Conversation',
      entityId: id,
      action: 'UPDATE',
      fieldKey: 'status',
      oldValue: conv.status,
      newValue: 'SNOOZED',
    });

    return updated;
  }

  async close(id: string) {
    const workspaceId = this.requireWs();
    const conv = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conv || conv.workspaceId !== workspaceId) throw new NotFoundException();

    const updated = await this.prisma.conversation.update({
      where: { id },
      data: { status: 'CLOSED' },
    });

    await this.audit.log({
      entityType: 'Conversation',
      entityId: id,
      action: 'UPDATE',
      fieldKey: 'status',
      oldValue: conv.status,
      newValue: 'CLOSED',
    });

    return updated;
  }

  async merge(targetId: string, sourceIds: string[]) {
    const workspaceId = this.requireWs();
    const target = await this.prisma.conversation.findUnique({ where: { id: targetId } });
    if (!target || target.workspaceId !== workspaceId) throw new NotFoundException();

    await this.prisma.conversation.updateMany({
      where: { id: { in: sourceIds } },
      data: { status: 'CLOSED' as any },
    });

    await this.prisma.conversation.update({
      where: { id: targetId },
      data: { lastMessageAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Conversation',
      entityId: targetId,
      action: 'UPDATE',
      newValue: { merged: sourceIds },
    });
  }

  async getMessages(id: string) {
    const workspaceId = this.requireWs();
    const conv = await this.prisma.conversation.findUnique({ where: { id } });
    if (!conv || conv.workspaceId !== workspaceId) throw new NotFoundException();

    switch (conv.channelType) {
      case 'SMS':
      case 'WHATSAPP':
        return this.prisma.channelMessage.findMany({
          where: { conversationId: id },
          orderBy: { createdAt: 'asc' },
        });
      case 'CHAT':
        return this.prisma.chatMessage.findMany({
          where: { sessionId: conv.chatSessionId! },
          orderBy: { createdAt: 'asc' },
        });
      case 'EMAIL':
        return this.prisma.emailMessage.findMany({
          where: { threadId: (conv.metadata as any)?.threadId },
          orderBy: { date: 'asc' },
        });
      default:
        return [];
    }
  }

  async findOrCreateForChannel(
    workspaceId: string,
    personId: string | null,
    channelType: string,
    channelConfigId?: string,
  ) {
    if (personId) {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          workspaceId,
          personId,
          channelType: channelType as any,
          status: { not: 'CLOSED' },
        },
      });
      if (existing) return existing;
    }

    return this.prisma.conversation.create({
      data: {
        workspaceId,
        personId,
        channelType: channelType as any,
        status: 'OPEN',
        lastMessageAt: new Date(),
        metadata: channelConfigId ? { channelConfigId } : {},
      },
    });
  }
}
