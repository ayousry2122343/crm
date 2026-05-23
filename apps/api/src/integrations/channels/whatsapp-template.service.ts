import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';

@Injectable()
export class WhatsAppTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new Error('no tenant context');
    return ws;
  }

  async listTemplates(channelConfigId: string) {
    const workspaceId = this.requireWs();
    return this.prisma.whatsAppTemplate.findMany({
      where: { workspaceId, channelConfigId },
      orderBy: { name: 'asc' },
    });
  }

  async getTemplate(id: string) {
    const workspaceId = this.requireWs();
    const tpl = await this.prisma.whatsAppTemplate.findUnique({ where: { id } });
    if (!tpl || tpl.workspaceId !== workspaceId) throw new NotFoundException();
    return tpl;
  }

  async syncTemplates(
    channelConfigId: string,
    externalTemplates: Array<{
      name: string;
      language: string;
      category: string;
      components: any;
      status: string;
      externalId?: string;
    }>,
  ) {
    const workspaceId = this.requireWs();

    const config = await this.prisma.channelConfig.findUnique({
      where: { id: channelConfigId },
    });
    if (!config || config.workspaceId !== workspaceId) {
      throw new NotFoundException('Channel config not found');
    }

    const results = [];

    for (const tpl of externalTemplates) {
      const upserted = await this.prisma.whatsAppTemplate.upsert({
        where: {
          workspaceId_channelConfigId_name_language: {
            workspaceId,
            channelConfigId,
            name: tpl.name,
            language: tpl.language,
          },
        },
        create: {
          workspaceId,
          channelConfigId,
          name: tpl.name,
          language: tpl.language,
          category: tpl.category,
          components: tpl.components,
          status: tpl.status as any,
          externalId: tpl.externalId ?? null,
        },
        update: {
          category: tpl.category,
          components: tpl.components,
          status: tpl.status as any,
          externalId: tpl.externalId ?? null,
        },
      });

      await this.audit.log({
        entityType: 'WhatsAppTemplate',
        entityId: upserted.id,
        action: 'CREATE',
        newValue: { name: tpl.name, status: tpl.status },
      });

      results.push(upserted);
    }

    return results;
  }
}
