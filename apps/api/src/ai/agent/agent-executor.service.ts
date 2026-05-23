import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AIService } from '../ai.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { AuditService } from '../../core/audit/audit.service';

const MAX_RESPONSE_TOKENS = 500;

@Injectable()
export class AgentExecutorService {
  private readonly logger = new Logger(AgentExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly aiService: AIService,
    private readonly embeddings: EmbeddingsService,
    private readonly audit: AuditService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new Error('no tenant context');
    return ws;
  }

  async processMessage(
    conversationId: string,
    content: string,
    queueId: string,
  ): Promise<{ response: string; sessionId: string; escalated: boolean } | null> {
    const workspaceId = this.requireWs();

    const agentConfig = await this.prisma.agentConfig.findFirst({
      where: {
        workspaceId,
        enabled: true,
        queueIds: { has: queueId },
      },
    });

    if (!agentConfig) return null;

    let session = await this.prisma.agentSession.findFirst({
      where: {
        workspaceId,
        conversationId,
        status: 'ACTIVE',
      },
    });

    if (!session) {
      session = await this.prisma.agentSession.create({
        data: {
          workspaceId,
          agentConfigId: agentConfig.id,
          conversationId,
          status: 'ACTIVE',
          turns: [],
          tokensUsed: 0,
        },
      });
    }

    const turns = (session.turns as any[]) || [];
    const userTurns = turns.filter((t: any) => t.role === 'user').length;

    if (userTurns >= agentConfig.maxTurnsBeforeEscalation) {
      await this.prisma.agentSession.update({
        where: { id: session.id },
        data: {
          status: 'ESCALATED',
          escalationReason: 'Max turns reached',
          escalatedAt: new Date(),
        },
      });

      return {
        response: '',
        sessionId: session.id,
        escalated: true,
      };
    }

    turns.push({ role: 'user', content, timestamp: new Date().toISOString() });

    const systemMessage = {
      role: 'system' as const,
      content: agentConfig.systemPrompt,
    };
    const chatMessages = [
      systemMessage,
      ...turns.map((t: any) => ({
        role: t.role as 'user' | 'assistant',
        content: t.content,
      })),
    ];

    const response = await this.aiService.chat(chatMessages, {
      maxTokens: MAX_RESPONSE_TOKENS,
    });

    turns.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    });

    await this.prisma.agentSession.update({
      where: { id: session.id },
      data: {
        turns,
        tokensUsed: session.tokensUsed + (response.length / 4),
      },
    });

    await this.audit.log({
      entityType: 'AgentSession',
      entityId: session.id,
      action: 'UPDATE',
      newValue: { turnsCount: turns.length },
    });

    return {
      response,
      sessionId: session.id,
      escalated: false,
    };
  }

  async executeToolCall(toolName: string, params: Record<string, any>): Promise<any> {
    switch (toolName) {
      case 'searchKB':
        return this.embeddings.search(params.query, { limit: 5 });
      case 'getTicketDetails':
        return this.prisma.ticket.findUnique({
          where: { id: params.ticketId },
          select: { id: true, subject: true, status: true, priority: true, description: true },
        });
      case 'getPersonProfile':
        return this.prisma.person.findUnique({
          where: { id: params.personId },
          select: { id: true, fullName: true, email: true, phone: true, lifecycleStage: true },
        });
      case 'escalateToHuman':
        return { escalated: true, reason: params.reason };
      case 'resolveTicket':
        await this.prisma.ticket.update({
          where: { id: params.ticketId },
          data: { status: 'RESOLVED', resolvedAt: new Date() },
        });
        return { resolved: true, summary: params.summary };
      case 'suggestArticle':
        return this.prisma.kBArticle.findMany({
          where: { id: params.articleId },
          select: { id: true, title: true, slug: true },
        });
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  }

  async escalateSession(sessionId: string, reason: string) {
    return this.prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        status: 'ESCALATED',
        escalationReason: reason,
        escalatedAt: new Date(),
      },
    });
  }

  async resolveSession(sessionId: string, resolution: string) {
    return this.prisma.agentSession.update({
      where: { id: sessionId },
      data: {
        status: 'RESOLVED',
        resolution,
        resolvedAt: new Date(),
      },
    });
  }
}
