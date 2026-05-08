import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AIService } from '../ai.service';

export interface ComposeEmailDto {
  intent: string;
  language: 'ar' | 'en';
  recordRef?: { entityType: string; entityId: string };
  tone?: 'formal' | 'casual';
}

export interface ComposedEmail {
  subject: string;
  body: string;
}

@Injectable()
export class EmailComposerService {
  private readonly logger = new Logger(EmailComposerService.name);

  constructor(
    private readonly ai: AIService,
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private ctx() {
    const store = this.tenant.getStore();
    if (!store) throw new BadRequestException('no tenant context');
    return store;
  }

  async compose(dto: ComposeEmailDto): Promise<ComposedEmail> {
    const { workspaceId, userId } = this.ctx();

    let recordContext = '';
    if (dto.recordRef) {
      recordContext = await this.loadRecordContext(dto.recordRef.entityType, dto.recordRef.entityId);
    }

    const langLabel = dto.language === 'ar' ? 'Arabic' : 'English';
    const prompt = [
      `Compose a professional email in ${langLabel}.`,
      `Intent: ${dto.intent}`,
      `Tone: ${dto.tone ?? 'formal'}`,
      recordContext ? `Context about recipient:\n${recordContext}` : '',
      'Return ONLY valid JSON: {"subject": "...", "body": "..."}',
    ]
      .filter(Boolean)
      .join('\n');

    const raw = await this.ai.chat(
      [{ role: 'user', content: prompt }],
      { responseFormat: 'json', temperature: 0.7 },
    );

    let parsed: ComposedEmail;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.logger.warn(`AI returned unparseable JSON: ${raw.slice(0, 200)}`);
      parsed = { subject: '', body: raw };
    }

    await this.prisma.aIUsage.create({
      data: {
        workspaceId,
        userId: userId!,
        feature: 'email-composer',
        provider: this.ai.providerName,
        model: 'default',
        inputTokens: prompt.length,
        outputTokens: raw.length,
      },
    });

    return parsed;
  }

  private async loadRecordContext(entityType: string, entityId: string): Promise<string> {
    switch (entityType) {
      case 'Person': {
        const p = await this.prisma.person.findUnique({
          where: { id: entityId },
          select: { fullName: true, email: true, phone: true, lifecycleStage: true, title: true, companyName: true },
        });
        if (!p) return '';
        return `Name: ${p.fullName}\nEmail: ${p.email ?? 'N/A'}\nTitle: ${p.title ?? 'N/A'}\nCompany: ${p.companyName ?? 'N/A'}\nStage: ${p.lifecycleStage}`;
      }
      case 'Deal': {
        const d = await this.prisma.deal.findUnique({
          where: { id: entityId },
          select: { name: true, amount: true, status: true, probability: true },
        });
        if (!d) return '';
        return `Deal: ${d.name}\nAmount: ${d.amount}\nStatus: ${d.status}`;
      }
      default:
        return '';
    }
  }
}
