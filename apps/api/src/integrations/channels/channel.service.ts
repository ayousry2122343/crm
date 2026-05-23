import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import { NotificationService } from '../../notifications/notification.service';
import { TwilioAdapter } from './adapters/twilio.adapter';
import { TwilioWhatsAppAdapter } from './adapters/twilio-whatsapp.adapter';
import type { IChannelAdapter, ParsedMessage } from './channel-adapter.interface';
import type { CreateChannelConfigDto, UpdateChannelConfigDto } from './dto/create-channel-config.dto';
import type { SendMessageDto } from './dto/send-message.dto';
import type { QueryMessagesDto } from './dto/query-messages.dto';

@Injectable()
export class ChannelService {
  private readonly adapters: Record<string, IChannelAdapter>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
    private readonly notification: NotificationService,
    private readonly twilioAdapter: TwilioAdapter,
    private readonly twilioWhatsAppAdapter: TwilioWhatsAppAdapter,
  ) {
    this.adapters = {
      TWILIO: this.twilioAdapter,
      WHATSAPP_CLOUD: this.twilioWhatsAppAdapter,
    };
  }

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  private currentUser(): string | undefined {
    return this.tenant.getStore()?.userId;
  }

  private getAdapter(provider: string): IChannelAdapter {
    const adapter = this.adapters[provider];
    if (!adapter) throw new BadRequestException(`Unsupported provider: ${provider}`);
    return adapter;
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/[^+\d]/g, '');
  }

  /* ──────────── Config CRUD ──────────── */

  async createConfig(dto: CreateChannelConfigDto) {
    const workspaceId = this.requireWs();
    const webhookSecret = crypto.randomBytes(32).toString('hex');

    const config = await this.prisma.channelConfig.create({
      data: {
        workspaceId,
        provider: dto.provider as any,
        name: dto.name,
        credentials: dto.credentials,
        phoneNumber: dto.phoneNumber,
        webhookSecret,
        isActive: dto.isActive ?? true,
        createdById: this.currentUser()!,
      },
    });

    await this.audit.log({
      entityType: 'ChannelConfig',
      entityId: config.id,
      action: 'CREATE',
      newValue: { name: dto.name, provider: dto.provider },
    });

    return config;
  }

  async listConfigs() {
    const workspaceId = this.requireWs();
    return this.prisma.channelConfig.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConfig(id: string) {
    const workspaceId = this.requireWs();
    const config = await this.prisma.channelConfig.findUnique({ where: { id } });
    if (!config || config.workspaceId !== workspaceId) throw new NotFoundException();
    return config;
  }

  async updateConfig(id: string, dto: UpdateChannelConfigDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.channelConfig.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.credentials !== undefined) data.credentials = dto.credentials;
    if (dto.phoneNumber !== undefined) data.phoneNumber = dto.phoneNumber;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const updated = await this.prisma.channelConfig.update({
      where: { id },
      data,
    });

    await this.audit.logUpdate('ChannelConfig', id, before as any, data);

    return updated;
  }

  /* ──────────── Messaging ──────────── */

  async send(dto: SendMessageDto) {
    const workspaceId = this.requireWs();

    const config = await this.prisma.channelConfig.findUnique({
      where: { id: dto.channelConfigId },
    });
    if (!config || config.workspaceId !== workspaceId) {
      throw new NotFoundException('Channel config not found');
    }
    if (!config.isActive) {
      throw new BadRequestException('Channel is inactive');
    }

    const person = await this.prisma.person.findFirst({
      where: { id: dto.personId, workspaceId },
    });
    if (!person) {
      throw new NotFoundException('Person not found');
    }
    if (!person.phone && !person.phoneNormalized) {
      throw new BadRequestException('Person has no phone number');
    }

    const adapter = this.getAdapter(config.provider);
    const toPhone = person.phoneNormalized || this.normalizePhone(person.phone!);

    const options = dto.mediaUrl ? { mediaUrl: dto.mediaUrl } : undefined;
    const { externalId } = await adapter.send(
      { credentials: config.credentials as any, phoneNumber: config.phoneNumber },
      toPhone,
      dto.content,
      options,
    );

    const message = await this.prisma.channelMessage.create({
      data: {
        workspaceId,
        channelConfigId: config.id,
        direction: 'OUT',
        from: config.phoneNumber,
        to: toPhone,
        content: dto.content,
        contentType: (dto.contentType as any) ?? 'TEXT',
        status: 'QUEUED',
        externalId,
        personId: dto.personId,
        metadata: {},
      },
    });

    await this.audit.log({
      entityType: 'ChannelMessage',
      entityId: message.id,
      action: 'CREATE',
      newValue: { direction: 'OUT', to: toPhone },
    });

    return message;
  }

  async handleInbound(configId: string, parsed: ParsedMessage) {
    const config = await this.prisma.channelConfig.findUnique({
      where: { id: configId },
    });
    if (!config) throw new NotFoundException('Channel config not found');

    const normalizedFrom = this.normalizePhone(parsed.from);

    const person = await this.prisma.person.findFirst({
      where: {
        workspaceId: config.workspaceId,
        phoneNormalized: normalizedFrom,
      },
    });

    const message = await this.prisma.channelMessage.create({
      data: {
        workspaceId: config.workspaceId,
        channelConfigId: configId,
        direction: 'IN',
        from: parsed.from,
        to: parsed.to,
        content: parsed.content,
        contentType: parsed.contentType as any,
        status: 'DELIVERED',
        externalId: parsed.externalId,
        personId: person?.id ?? null,
        metadata: parsed.metadata ?? {},
      },
    });

    return message;
  }

  async listMessages(q: QueryMessagesDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId };
    if (q.personId) where.personId = q.personId;
    if (q.channelConfigId) where.channelConfigId = q.channelConfigId;

    const items = await this.prisma.channelMessage.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;
    return { items: trimmed, nextCursor };
  }

  /* ──────────── Webhook ──────────── */

  async processWebhook(configId: string, payload: any, headers: any) {
    const config = await this.prisma.channelConfig.findUnique({
      where: { id: configId },
    });
    if (!config || !config.isActive) throw new NotFoundException();

    const adapter = this.getAdapter(config.provider);

    if (!adapter.validateWebhook(payload, headers, config.webhookSecret)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const parsed = adapter.parseWebhook(payload, headers);
    return this.handleInbound(configId, parsed);
  }

  async updateMessageStatus(configId: string, externalId: string, status: string) {
    const config = await this.prisma.channelConfig.findUnique({
      where: { id: configId },
    });
    if (!config) return;

    const statusMap: Record<string, string> = {
      queued: 'QUEUED',
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
      undelivered: 'FAILED',
    };

    const mappedStatus = statusMap[status.toLowerCase()] ?? 'QUEUED';

    await this.prisma.channelMessage.updateMany({
      where: { channelConfigId: configId, externalId },
      data: { status: mappedStatus as any },
    });
  }
}
