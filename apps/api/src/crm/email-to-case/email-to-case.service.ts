import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import { TicketService } from '../tickets/ticket.service';
import type { CreateEmailToCaseConfigDto } from './dto/create-config.dto';
import type { UpdateEmailToCaseConfigDto } from './dto/update-config.dto';
import type { InboundEmailDto } from './dto/inbound-email.dto';

@Injectable()
export class EmailToCaseService {
  private readonly logger = new Logger(EmailToCaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
    private readonly ticketService: TicketService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  private currentUser(): string | undefined {
    return this.tenant.getStore()?.userId;
  }

  async createConfig(dto: CreateEmailToCaseConfigDto) {
    const workspaceId = this.requireWs();

    const existing = await this.prisma.emailToCaseConfig.findUnique({
      where: {
        workspaceId_supportEmail: {
          workspaceId,
          supportEmail: dto.supportEmail.toLowerCase().trim(),
        },
      },
    });
    if (existing) throw new BadRequestException('Support email already configured');

    const config = await this.prisma.emailToCaseConfig.create({
      data: {
        workspaceId,
        supportEmail: dto.supportEmail.toLowerCase().trim(),
        isActive: dto.isActive ?? true,
        defaultQueueId: dto.defaultQueueId ?? null,
        defaultPriority: dto.defaultPriority ?? 'MEDIUM',
        autoReply: dto.autoReply ?? false,
        autoReplyTemplateId: dto.autoReplyTemplateId ?? null,
        createdById: this.currentUser()!,
      },
    });

    await this.audit.log({
      entityType: 'EmailToCaseConfig',
      entityId: config.id,
      action: 'CREATE',
      newValue: { supportEmail: config.supportEmail },
    });

    return config;
  }

  async listConfigs() {
    const workspaceId = this.requireWs();
    return this.prisma.emailToCaseConfig.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConfig(id: string) {
    const workspaceId = this.requireWs();
    const config = await this.prisma.emailToCaseConfig.findUnique({ where: { id } });
    if (!config || config.workspaceId !== workspaceId) throw new NotFoundException();
    return config;
  }

  async updateConfig(id: string, dto: UpdateEmailToCaseConfigDto) {
    const workspaceId = this.requireWs();
    const config = await this.prisma.emailToCaseConfig.findUnique({ where: { id } });
    if (!config || config.workspaceId !== workspaceId) throw new NotFoundException();

    const data: any = {};
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.defaultQueueId !== undefined) data.defaultQueueId = dto.defaultQueueId;
    if (dto.defaultPriority !== undefined) data.defaultPriority = dto.defaultPriority;
    if (dto.autoReply !== undefined) data.autoReply = dto.autoReply;
    if (dto.autoReplyTemplateId !== undefined) data.autoReplyTemplateId = dto.autoReplyTemplateId;

    const updated = await this.prisma.emailToCaseConfig.update({
      where: { id },
      data,
    });

    await this.audit.logUpdate('EmailToCaseConfig', id, config as any, data);
    return updated;
  }

  async deleteConfig(id: string) {
    const workspaceId = this.requireWs();
    const config = await this.prisma.emailToCaseConfig.findUnique({ where: { id } });
    if (!config || config.workspaceId !== workspaceId) throw new NotFoundException();

    await this.prisma.emailToCaseConfig.delete({ where: { id } });
    await this.audit.log({
      entityType: 'EmailToCaseConfig',
      entityId: id,
      action: 'DELETE',
    });
  }

  async processInboundEmail(dto: InboundEmailDto) {
    const toAddress = dto.to.toLowerCase().trim();

    const config = await this.prisma.emailToCaseConfig.findFirst({
      where: { supportEmail: toAddress, isActive: true },
    });
    if (!config) {
      this.logger.warn(`No active email-to-case config for ${toAddress}`);
      return { processed: false, reason: 'no_config' };
    }

    const workspaceId = config.workspaceId;
    const fromEmail = this.extractEmail(dto.from);

    // Check for existing ticket with this email thread (reply detection)
    if (dto.inReplyTo) {
      const existingTicket = await this.prisma.ticket.findFirst({
        where: { workspaceId, sourceEmailMessageId: dto.inReplyTo },
      });
      if (existingTicket) {
        // Add as comment on existing ticket
        await this.prisma.comment.create({
          data: {
            workspaceId,
            entityType: 'TICKET',
            entityId: existingTicket.id,
            body: dto.bodyText || dto.bodyHtml || '',
            authorId: config.createdById,
          },
        });
        this.logger.log(`Reply added to ticket ${existingTicket.id}`);
        return { processed: true, action: 'reply', ticketId: existingTicket.id };
      }
    }

    // Find or create contact
    let contactId: string | null = null;
    if (fromEmail) {
      const person = await this.prisma.person.findFirst({
        where: { workspaceId, emailNormalized: fromEmail },
      });
      if (person) {
        contactId = person.id;
      } else {
        const newPerson = await this.prisma.person.create({
          data: {
            workspaceId,
            email: fromEmail,
            emailNormalized: fromEmail,
            fullName: this.extractName(dto.from) || fromEmail,
            source: 'EMAIL',
          },
        });
        contactId = newPerson.id;
      }
    }

    // Create ticket using internal method (bypasses tenant context requirement)
    const last = await this.prisma.ticket.findFirst({
      where: { workspaceId },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });
    const ticketNumber = (last?.ticketNumber ?? 0) + 1;

    const ticketData: any = {
      workspaceId,
      ticketNumber,
      subject: dto.subject || 'No Subject',
      description: dto.bodyText || dto.bodyHtml || '',
      channel: 'EMAIL',
      priority: config.defaultPriority as any,
      contactId,
      createdById: config.createdById,
      sourceEmailMessageId: dto.messageId ?? null,
    };

    if (config.defaultQueueId) {
      ticketData.queueId = config.defaultQueueId;
    }

    const ticket = await this.prisma.ticket.create({ data: ticketData });

    await this.audit.log({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'CREATE',
      newValue: { subject: ticket.subject, ticketNumber, source: 'email-to-case' },
    });

    this.logger.log(`Created ticket ${ticket.id} (TKT-${ticketNumber}) from email ${fromEmail}`);

    return { processed: true, action: 'created', ticketId: ticket.id, ticketNumber };
  }

  private extractEmail(from: string): string {
    const match = from.match(/<([^>]+)>/);
    return (match ? match[1] : from).toLowerCase().trim();
  }

  private extractName(from: string): string | null {
    const match = from.match(/^([^<]+)</);
    return match ? match[1].trim().replace(/"/g, '') : null;
  }
}
