import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateWebhookDto } from './dto/create-webhook.dto';
import type { UpdateWebhookDto } from './dto/update-webhook.dto';

@Injectable()
export class WebhookService {
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

  async create(dto: CreateWebhookDto) {
    const workspaceId = this.requireWs();
    const row = await this.prisma.webhook.create({
      data: {
        workspaceId,
        url: dto.url,
        secret: dto.secret,
        events: dto.events,
        enabled: dto.enabled ?? true,
      },
    });
    await this.audit.log({
      entityType: 'Webhook',
      entityId: row.id,
      action: 'CREATE',
      newValue: { url: row.url },
    });
    return row;
  }

  async list() {
    const workspaceId = this.requireWs();
    return this.prisma.webhook.findMany({
      where: { workspaceId, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const w = await this.prisma.webhook.findUnique({ where: { id } });
    if (!w || w.workspaceId !== workspaceId) throw new NotFoundException();
    return w;
  }

  async update(id: string, dto: UpdateWebhookDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.webhook.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.url !== undefined) data.url = dto.url;
    if (dto.secret !== undefined) data.secret = dto.secret;
    if (dto.events !== undefined) data.events = dto.events;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;

    const after = await this.prisma.webhook.update({ where: { id }, data });
    await this.audit.logUpdate('Webhook', id, before as any, after as any);
    return after;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const w = await this.prisma.webhook.findUnique({ where: { id } });
    if (!w || w.workspaceId !== workspaceId) throw new NotFoundException();
    await this.prisma.webhook.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    await this.audit.log({ entityType: 'Webhook', entityId: id, action: 'DELETE' });
  }

  async listDeliveries(webhookId: string) {
    const workspaceId = this.requireWs();
    const w = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!w || w.workspaceId !== workspaceId) throw new NotFoundException();
    return this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
