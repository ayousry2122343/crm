import { Test } from '@nestjs/testing';
import { WebToCaseService } from './web-to-case.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';

describe('WebToCaseService', () => {
  let service: WebToCaseService;
  let prisma: any;
  let audit: any;

  const WS_ID = 'ws-1';

  beforeEach(async () => {
    prisma = {
      ticket: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    audit = { log: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        WebToCaseService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(WebToCaseService);
  });

  const baseOpts = {
    workspaceId: WS_ID,
    formId: 'form-1',
    formName: 'Contact Us',
    ticketQueueId: null as string | null,
    submissionId: 'sub-1',
    personId: 'person-1',
    data: { name: 'Ahmed', email: 'a@b.com', message: 'Help me' },
    mappings: { message: 'description', name: 'fullName', email: 'email' },
    createdById: 'user-1',
  };

  it('should create a ticket from form submission', async () => {
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.ticket.create.mockResolvedValue({ id: 'ticket-1', ticketNumber: 1, subject: 'Web form submission: Contact Us' });

    const result = await service.createTicketFromSubmission(baseOpts);

    expect(result.id).toBe('ticket-1');
    expect(prisma.ticket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: WS_ID,
        ticketNumber: 1,
        channel: 'WEB_FORM',
        contactId: 'person-1',
        sourceFormSubmissionId: 'sub-1',
      }),
    });
    expect(audit.log).toHaveBeenCalled();
  });

  it('should use subject mapping if available', async () => {
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.ticket.create.mockResolvedValue({ id: 'ticket-2', ticketNumber: 1 });

    await service.createTicketFromSubmission({
      ...baseOpts,
      data: { ...baseOpts.data, topic: 'Billing Issue' },
      mappings: { ...baseOpts.mappings, topic: 'subject' },
    });

    expect(prisma.ticket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ subject: 'Billing Issue' }),
    });
  });

  it('should use description mapping if available', async () => {
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.ticket.create.mockResolvedValue({ id: 'ticket-3', ticketNumber: 1 });

    await service.createTicketFromSubmission(baseOpts);

    expect(prisma.ticket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ description: 'Help me' }),
    });
  });

  it('should concatenate all fields as description if no mapping', async () => {
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.ticket.create.mockResolvedValue({ id: 'ticket-4', ticketNumber: 1 });

    await service.createTicketFromSubmission({
      ...baseOpts,
      mappings: {},
    });

    expect(prisma.ticket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        description: expect.stringContaining('name: Ahmed'),
      }),
    });
  });

  it('should assign to queue if ticketQueueId provided', async () => {
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.ticket.create.mockResolvedValue({ id: 'ticket-5', ticketNumber: 1 });

    await service.createTicketFromSubmission({
      ...baseOpts,
      ticketQueueId: 'queue-1',
    });

    expect(prisma.ticket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ queueId: 'queue-1' }),
    });
  });

  it('should increment ticket number from existing tickets', async () => {
    prisma.ticket.findFirst.mockResolvedValue({ ticketNumber: 99 });
    prisma.ticket.create.mockResolvedValue({ id: 'ticket-6', ticketNumber: 100 });

    await service.createTicketFromSubmission(baseOpts);

    expect(prisma.ticket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ticketNumber: 100 }),
    });
  });

  it('should handle null personId', async () => {
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.ticket.create.mockResolvedValue({ id: 'ticket-7', ticketNumber: 1 });

    await service.createTicketFromSubmission({ ...baseOpts, personId: null });

    expect(prisma.ticket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ contactId: null }),
    });
  });
});
