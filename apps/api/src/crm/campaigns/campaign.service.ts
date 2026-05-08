import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateCampaignDto } from './dto/create-campaign.dto';
import type { UpdateCampaignDto } from './dto/update-campaign.dto';
import type { QueryCampaignDto } from './dto/query-campaign.dto';

@Injectable()
export class CampaignService {
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

  private parseSort(sort?: string): any {
    if (!sort) return { createdAt: 'desc' };
    const fields = sort.split(',').map((s) => s.trim()).filter(Boolean);
    if (fields.length === 0) return { createdAt: 'desc' };
    return fields.map((f) => {
      if (f.startsWith('-')) return { [f.slice(1)]: 'desc' };
      return { [f]: 'asc' };
    });
  }

  async create(dto: CreateCampaignDto) {
    const workspaceId = this.requireWs();
    const campaign = await this.prisma.campaign.create({
      data: {
        workspaceId,
        name: dto.name,
        subject: dto.subject,
        body: dto.body,
        listId: dto.listId,
        scheduledAt: dto.scheduledAt,
        createdById: this.currentUser(),
      },
    });

    await this.audit.log({
      entityType: 'Campaign',
      entityId: campaign.id,
      action: 'CREATE',
      newValue: { name: dto.name },
    });

    return campaign;
  }

  async list(q: QueryCampaignDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };
    if (q.status) where.status = q.status;

    const orderBy = this.parseSort(q.sort);

    const items = await this.prisma.campaign.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy,
      include: { _count: { select: { recipients: true } } },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;
    return { items: trimmed, nextCursor, hasMore };
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { _count: { select: { recipients: true } } },
    });
    if (!campaign || campaign.workspaceId !== workspaceId || campaign.archivedAt) {
      throw new NotFoundException();
    }
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.campaign.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();
    if (before.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT campaigns can be edited');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.subject !== undefined) data.subject = dto.subject;
    if (dto.body !== undefined) data.body = dto.body;
    if (dto.listId !== undefined) data.listId = dto.listId;
    if (dto.scheduledAt !== undefined) data.scheduledAt = dto.scheduledAt;

    const updated = await this.prisma.campaign.update({ where: { id }, data });
    await this.audit.logUpdate('Campaign', id, before as any, data);
    return updated;
  }

  async schedule(id: string, scheduledAt: Date) {
    const workspaceId = this.requireWs();
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.workspaceId !== workspaceId) throw new NotFoundException();
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT campaigns can be scheduled');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'SCHEDULED', scheduledAt },
    });

    await this.audit.log({
      entityType: 'Campaign',
      entityId: id,
      action: 'UPDATE',
      newValue: { status: 'SCHEDULED', scheduledAt },
    });

    return updated;
  }

  async send(id: string) {
    const workspaceId = this.requireWs();
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.workspaceId !== workspaceId) throw new NotFoundException();
    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      throw new BadRequestException('Campaign cannot be sent in current status');
    }
    if (!campaign.listId) {
      throw new BadRequestException('Campaign must have a list');
    }

    const list = await this.prisma.list.findUnique({ where: { id: campaign.listId } });
    if (!list || list.workspaceId !== workspaceId) {
      throw new BadRequestException('Invalid list');
    }

    const people = await this.prisma.person.findMany({
      where: {
        id: { in: list.memberIds },
        workspaceId,
        archivedAt: null,
        doNotContact: false,
        unsubscribed: false,
        email: { not: null },
      },
      select: { id: true, email: true },
    });

    if (people.length > 0) {
      await this.prisma.campaignRecipient.createMany({
        data: people.map((p) => ({
          workspaceId,
          campaignId: id,
          personId: p.id,
          email: p.email!,
        })),
      });
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'SENDING', sentAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Campaign',
      entityId: id,
      action: 'UPDATE',
      newValue: { status: 'SENDING', recipientCount: people.length },
    });

    return updated;
  }

  async pause(id: string) {
    const workspaceId = this.requireWs();
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.workspaceId !== workspaceId) throw new NotFoundException();
    if (campaign.status !== 'SENDING') {
      throw new BadRequestException('Only SENDING campaigns can be paused');
    }

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    await this.audit.log({
      entityType: 'Campaign',
      entityId: id,
      action: 'UPDATE',
      newValue: { status: 'PAUSED' },
    });

    return updated;
  }

  async trackOpen(recipientId: string) {
    const recipient = await this.prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });
    if (!recipient) throw new NotFoundException();
    if (recipient.openedAt) return recipient;

    return this.prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: 'OPENED', openedAt: new Date() },
    });
  }

  async trackClick(recipientId: string) {
    const recipient = await this.prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });
    if (!recipient) throw new NotFoundException();
    if (recipient.clickedAt) return recipient;

    return this.prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: 'CLICKED', clickedAt: new Date(), openedAt: recipient.openedAt ?? new Date() },
    });
  }

  async unsubscribe(recipientId: string) {
    const recipient = await this.prisma.campaignRecipient.findUnique({
      where: { id: recipientId },
    });
    if (!recipient) return;

    await this.prisma.campaignRecipient.update({
      where: { id: recipientId },
      data: { status: 'UNSUBSCRIBED', unsubscribedAt: new Date() },
    });

    await this.prisma.person.update({
      where: { id: recipient.personId },
      data: { unsubscribed: true },
    });
  }

  async listRecipients(campaignId: string, cursor?: string, limit = 50) {
    const workspaceId = this.requireWs();
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.workspaceId !== workspaceId) throw new NotFoundException();

    const realLimit = Math.min(limit, 200);
    const where: any = { campaignId };

    const items = await this.prisma.campaignRecipient.findMany({
      where: cursor ? { ...where, id: { lt: cursor } } : where,
      take: realLimit + 1,
      orderBy: { createdAt: 'desc' },
      include: { person: { select: { fullName: true } } },
    });

    const hasMore = items.length > realLimit;
    const trimmed = hasMore ? items.slice(0, realLimit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;
    return { items: trimmed, nextCursor, hasMore };
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign || campaign.workspaceId !== workspaceId) throw new NotFoundException();

    const archived = await this.prisma.campaign.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Campaign',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }
}
