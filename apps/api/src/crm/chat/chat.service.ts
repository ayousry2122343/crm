import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { StartSessionDto } from './dto/start-session.dto';
import type { SendMessageDto } from './dto/send-message.dto';
import type { ListSessionsDto } from './dto/list-sessions.dto';

const SESSION_INCLUDE = { assignee: true, queue: true, messages: false };
const SESSION_WITH_MESSAGES = { assignee: true, queue: true, messages: { orderBy: { createdAt: 'asc' as const } } };

@Injectable()
export class ChatService {
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

  async startSession(dto: StartSessionDto, workspaceId?: string) {
    const wsId = workspaceId ?? this.requireWs();

    const session = await this.prisma.chatSession.create({
      data: {
        workspaceId: wsId,
        visitorName: dto.visitorName,
        visitorEmail: dto.visitorEmail ?? null,
        status: 'WAITING',
        queueId: dto.queueId ?? null,
        metadata: dto.metadata ?? {},
      },
      include: SESSION_INCLUDE,
    });

    return session;
  }

  async assignAgent(sessionId: string, agentId: string) {
    const workspaceId = this.requireWs();

    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, workspaceId },
    });
    if (!session) throw new NotFoundException('session not found');
    if (session.status === 'ENDED') throw new BadRequestException('session already ended');

    const updated = await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { assigneeId: agentId, status: 'ACTIVE' },
      include: SESSION_INCLUDE,
    });

    await this.audit.log({
      entityType: 'CHAT_SESSION',
      entityId: sessionId,
      action: 'UPDATE',
      fieldKey: 'assigneeId',
      newValue: agentId,
    });

    return updated;
  }

  async sendMessage(sessionId: string, dto: SendMessageDto, workspaceId?: string) {
    const wsId = workspaceId ?? this.requireWs();

    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, workspaceId: wsId },
    });
    if (!session) throw new NotFoundException('session not found');
    if (session.status === 'ENDED') throw new BadRequestException('session already ended');

    const message = await this.prisma.chatMessage.create({
      data: {
        sessionId,
        senderType: dto.senderType,
        senderId: dto.senderId ?? null,
        content: dto.content,
      },
    });

    return message;
  }

  async endSession(sessionId: string) {
    const workspaceId = this.requireWs();

    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, workspaceId },
    });
    if (!session) throw new NotFoundException('session not found');
    if (session.status === 'ENDED') throw new BadRequestException('session already ended');

    const updated = await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'ENDED', endedAt: new Date() },
      include: SESSION_INCLUDE,
    });

    await this.audit.log({
      entityType: 'CHAT_SESSION',
      entityId: sessionId,
      action: 'UPDATE',
      fieldKey: 'status',
      oldValue: session.status,
      newValue: 'ENDED',
    });

    return updated;
  }

  async listSessions(dto: ListSessionsDto) {
    const workspaceId = this.requireWs();

    const where: any = { workspaceId };
    if (dto.status) where.status = dto.status;
    if (dto.assigneeId) where.assigneeId = dto.assigneeId;

    const sessions = await this.prisma.chatSession.findMany({
      where,
      include: SESSION_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: dto.limit ?? 50,
    });

    return sessions;
  }

  async getSession(id: string, workspaceId?: string) {
    const wsId = workspaceId ?? this.requireWs();

    const session = await this.prisma.chatSession.findFirst({
      where: { id, workspaceId: wsId },
      include: SESSION_WITH_MESSAGES,
    });
    if (!session) throw new NotFoundException('session not found');

    return session;
  }

  async convertToTicket(sessionId: string) {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();

    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, workspaceId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) throw new NotFoundException('session not found');
    if (session.ticketId) throw new BadRequestException('session already converted');

    const description = session.messages
      .map((m: any) => `[${m.senderType}] ${m.content}`)
      .join('\n');

    const last = await this.prisma.ticket.findFirst({
      where: { workspaceId },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });
    const ticketNumber = (last?.ticketNumber ?? 0) + 1;

    const ticket = await this.prisma.ticket.create({
      data: {
        workspaceId,
        ticketNumber,
        subject: `Chat with ${session.visitorName}`,
        description,
        channel: 'CHAT',
        createdById: userId!,
        assigneeId: session.assigneeId,
        queueId: session.queueId,
      },
    });

    await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { ticketId: ticket.id, status: 'ENDED', endedAt: session.endedAt ?? new Date() },
    });

    await this.audit.log({
      entityType: 'CHAT_SESSION',
      entityId: sessionId,
      action: 'UPDATE',
      fieldKey: 'ticketId',
      newValue: ticket.id,
    });

    return ticket;
  }
}
