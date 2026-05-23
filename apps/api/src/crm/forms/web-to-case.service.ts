import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';

@Injectable()
export class WebToCaseService {
  private readonly logger = new Logger(WebToCaseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createTicketFromSubmission(opts: {
    workspaceId: string;
    formId: string;
    formName: string;
    ticketQueueId: string | null;
    submissionId: string;
    personId: string | null;
    data: Record<string, unknown>;
    mappings: Record<string, string>;
    createdById: string;
  }) {
    const { workspaceId, formName, ticketQueueId, submissionId, personId, data, mappings } = opts;

    const subjectKey = Object.entries(mappings).find(([, v]) => v === 'subject')?.[0];
    const subject = subjectKey && data[subjectKey]
      ? String(data[subjectKey])
      : `Web form submission: ${formName}`;

    const descriptionKey = Object.entries(mappings).find(([, v]) => v === 'description')?.[0];
    let description: string;
    if (descriptionKey && data[descriptionKey]) {
      description = String(data[descriptionKey]);
    } else {
      description = Object.entries(data)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
    }

    const last = await this.prisma.ticket.findFirst({
      where: { workspaceId },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });
    const ticketNumber = (last?.ticketNumber ?? 0) + 1;

    const ticketData: any = {
      workspaceId,
      ticketNumber,
      subject,
      description,
      channel: 'WEB_FORM',
      priority: 'MEDIUM',
      contactId: personId,
      createdById: opts.createdById,
      sourceFormSubmissionId: submissionId,
    };

    if (ticketQueueId) {
      ticketData.queueId = ticketQueueId;
    }

    const ticket = await this.prisma.ticket.create({ data: ticketData });

    await this.audit.log({
      entityType: 'Ticket',
      entityId: ticket.id,
      action: 'CREATE',
      newValue: { subject, ticketNumber, source: 'web-to-case', formId: opts.formId },
    });

    this.logger.log(`Web-to-case: created ticket ${ticket.id} (TKT-${ticketNumber}) from form ${opts.formId}`);

    return ticket;
  }
}
