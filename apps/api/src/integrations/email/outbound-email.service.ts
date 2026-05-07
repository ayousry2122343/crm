import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { EmailService } from '../../core/email/email.service';
import { EmailTemplateService } from './email-template.service';
import type { SendEmailDto } from './dto/send-email.dto';

@Injectable()
export class OutboundEmailService {
  private readonly logger = new Logger(OutboundEmailService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly emailSvc: EmailService,
    private readonly templateSvc: EmailTemplateService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  async send(dto: SendEmailDto) {
    const workspaceId = this.requireWs();

    let subject = dto.subject;
    let body = dto.body;

    if (dto.templateId) {
      const tpl = await this.templateSvc.get(dto.templateId);
      subject = this.templateSvc.renderTemplate(tpl.subject, dto.mergeContext ?? {});
      body = this.templateSvc.renderTemplate(tpl.body, dto.mergeContext ?? {});
    } else if (dto.mergeContext) {
      subject = this.templateSvc.renderTemplate(subject, dto.mergeContext);
      body = this.templateSvc.renderTemplate(body, dto.mergeContext);
    }

    const record = await this.prisma.outboundEmail.create({
      data: {
        workspaceId,
        toAddress: dto.to,
        subject,
        body,
        templateId: dto.templateId ?? null,
        entityType: dto.entityType ?? null,
        entityId: dto.entityId ?? null,
        status: 'QUEUED',
      },
    });

    try {
      await this.prisma.outboundEmail.update({
        where: { id: record.id },
        data: { status: 'SENDING' },
      });

      const result = await this.emailSvc.send({ to: dto.to, subject, html: body });

      await this.prisma.outboundEmail.update({
        where: { id: record.id },
        data: {
          status: 'SENT',
          providerMessageId: result.messageId,
          sentAt: new Date(),
        },
      });

      this.logger.log(`email sent id=${record.id} to=${dto.to}`);
      return { ...record, status: 'SENT', providerMessageId: result.messageId };
    } catch (err: any) {
      await this.prisma.outboundEmail.update({
        where: { id: record.id },
        data: { status: 'FAILED', error: err.message },
      });
      this.logger.error(`email failed id=${record.id}: ${err.message}`);
      throw err;
    }
  }

  async list(entityType?: string, entityId?: string) {
    const workspaceId = this.requireWs();
    const where: any = { workspaceId };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    return this.prisma.outboundEmail.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}
