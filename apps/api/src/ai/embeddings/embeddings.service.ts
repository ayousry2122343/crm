import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AIService } from '../ai.service';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AIService,
  ) {}

  async embedEntity(workspaceId: string, entityType: string, entityId: string): Promise<void> {
    const text = await this.buildText(entityType, entityId);
    if (!text) {
      this.logger.warn(`No text to embed for ${entityType}:${entityId}`);
      return;
    }

    const vector = await this.ai.embed(text);

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "Embedding" (id, "workspaceId", "entityType", "entityId", vector, "updatedAt")
       VALUES (gen_random_uuid(), $1, $2, $3, $4::vector, NOW())
       ON CONFLICT ("workspaceId", "entityType", "entityId")
       DO UPDATE SET vector = $4::vector, "updatedAt" = NOW()`,
      workspaceId,
      entityType,
      entityId,
      `[${vector.join(',')}]`,
    );
  }

  private async buildText(entityType: string, entityId: string): Promise<string> {
    switch (entityType) {
      case 'Person': {
        const p = await this.prisma.person.findUnique({
          where: { id: entityId },
          select: { fullName: true, email: true, phone: true, title: true, companyName: true, industry: true },
        });
        if (!p) return '';
        return [p.fullName, p.email, p.title, p.companyName, p.industry].filter(Boolean).join(' | ');
      }
      case 'Deal': {
        const d = await this.prisma.deal.findUnique({
          where: { id: entityId },
          select: { name: true, amount: true, status: true },
        });
        if (!d) return '';
        return [d.name, `Amount: ${d.amount}`, d.status].filter(Boolean).join(' | ');
      }
      case 'Activity': {
        const a = await this.prisma.activity.findUnique({
          where: { id: entityId },
          select: { subject: true, body: true },
        });
        if (!a) return '';
        return [a.subject, a.body].filter(Boolean).join(' | ');
      }
      default:
        return '';
    }
  }
}
