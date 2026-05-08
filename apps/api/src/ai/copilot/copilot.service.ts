import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import type { ChatMessage } from '../ai-provider.interface';

export interface CopilotChatDto {
  message: string;
  context?: {
    entityType?: string;
    entityId?: string;
  };
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface CopilotResponse {
  reply: string;
  suggestedPrompts: string[];
}

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AIService,
    private readonly embeddings: EmbeddingsService,
    private readonly tenant: TenantContextService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  async chat(dto: CopilotChatDto): Promise<CopilotResponse> {
    const workspaceId = this.requireWs();
    const contextChunks: string[] = [];

    if (dto.context?.entityType && dto.context?.entityId) {
      const entityContext = await this.buildEntityContext(dto.context.entityType, dto.context.entityId);
      if (entityContext) contextChunks.push(entityContext);
    }

    const ragChunks = await this.queryRelevantEmbeddings(workspaceId, dto.message);
    contextChunks.push(...ragChunks);

    const systemPrompt = this.buildSystemPrompt(contextChunks);
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(dto.history ?? []).map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: dto.message },
    ];

    const reply = await this.ai.chat(messages, { temperature: 0.7 });
    const suggestedPrompts = this.generateSuggestions(dto.context?.entityType);

    return { reply, suggestedPrompts };
  }

  private buildSystemPrompt(contextChunks: string[]): string {
    const base = 'You are a CRM copilot assistant. Help users with their CRM data, suggest actions, and provide insights. Be concise and helpful.';
    if (contextChunks.length === 0) return base;
    return `${base}\n\nRelevant context:\n${contextChunks.join('\n---\n')}`;
  }

  async buildEntityContext(entityType: string, entityId: string): Promise<string> {
    switch (entityType) {
      case 'Person': {
        const p = await this.prisma.person.findUnique({
          where: { id: entityId },
          select: { fullName: true, email: true, phone: true, lifecycleStage: true, title: true, companyName: true, industry: true },
        });
        if (!p) return '';
        return `Current record (Person): ${p.fullName}, Email: ${p.email ?? 'N/A'}, Stage: ${p.lifecycleStage}, Title: ${p.title ?? 'N/A'}, Company: ${p.companyName ?? 'N/A'}`;
      }
      case 'Deal': {
        const d = await this.prisma.deal.findUnique({
          where: { id: entityId },
          select: { name: true, amount: true, status: true, expectedCloseAt: true },
        });
        if (!d) return '';
        return `Current record (Deal): ${d.name}, Amount: ${d.amount}, Status: ${d.status}, Expected Close: ${d.expectedCloseAt ?? 'N/A'}`;
      }
      case 'Activity': {
        const a = await this.prisma.activity.findUnique({
          where: { id: entityId },
          select: { subject: true, type: true, body: true, dueAt: true },
        });
        if (!a) return '';
        return `Current record (Activity): ${a.subject}, Type: ${a.type}, Due: ${a.dueAt ?? 'N/A'}`;
      }
      default:
        return '';
    }
  }

  async queryRelevantEmbeddings(workspaceId: string, query: string): Promise<string[]> {
    try {
      const queryVector = await this.ai.embed(query);
      const results = await this.prisma.$queryRawUnsafe<Array<{ entityType: string; entityId: string; distance: number }>>(
        `SELECT "entityType", "entityId", vector <=> $1::vector AS distance
         FROM "Embedding"
         WHERE "workspaceId" = $2
         ORDER BY distance ASC
         LIMIT 5`,
        `[${queryVector.join(',')}]`,
        workspaceId,
      );

      const chunks: string[] = [];
      for (const r of results) {
        const text = await this.buildEntitySummary(r.entityType, r.entityId);
        if (text) chunks.push(`[${r.entityType}] ${text}`);
      }
      return chunks;
    } catch (err) {
      this.logger.warn(`RAG query failed: ${err}`);
      return [];
    }
  }

  private async buildEntitySummary(entityType: string, entityId: string): Promise<string> {
    switch (entityType) {
      case 'Person': {
        const p = await this.prisma.person.findUnique({ where: { id: entityId }, select: { fullName: true, email: true } });
        return p ? `${p.fullName} (${p.email ?? 'no email'})` : '';
      }
      case 'Deal': {
        const d = await this.prisma.deal.findUnique({ where: { id: entityId }, select: { name: true, amount: true, status: true } });
        return d ? `${d.name} — ${d.amount} (${d.status})` : '';
      }
      case 'Activity': {
        const a = await this.prisma.activity.findUnique({ where: { id: entityId }, select: { subject: true, type: true } });
        return a ? `${a.subject} (${a.type})` : '';
      }
      default:
        return '';
    }
  }

  private generateSuggestions(entityType?: string): string[] {
    const common = ['What can you tell me about this record?'];
    switch (entityType) {
      case 'Person':
        return ['Summarize this contact', 'Draft a follow-up email', "What's the history with this contact?", ...common];
      case 'Deal':
        return ['Summarize this deal', 'What are the next steps?', 'Assess deal risk', ...common];
      case 'Activity':
        return ['Summarize this activity', 'Suggest follow-up actions', ...common];
      default:
        return ['Show recent deals', 'Summarize pipeline', 'Who needs follow-up?', ...common];
    }
  }
}
