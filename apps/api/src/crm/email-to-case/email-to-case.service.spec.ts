import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EmailToCaseService } from './email-to-case.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import { TicketService } from '../tickets/ticket.service';

describe('EmailToCaseService', () => {
  let service: EmailToCaseService;
  let prisma: any;
  let tenant: any;
  let audit: any;

  const WS_ID = 'ws-1';
  const USER_ID = 'user-1';

  beforeEach(async () => {
    prisma = {
      emailToCaseConfig: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      ticket: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      person: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      comment: {
        create: jest.fn(),
      },
    };

    tenant = {
      getStore: jest.fn().mockReturnValue({ workspaceId: WS_ID, userId: USER_ID }),
    };

    audit = {
      log: jest.fn(),
      logUpdate: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        EmailToCaseService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenant },
        { provide: AuditService, useValue: audit },
        { provide: TicketService, useValue: {} },
      ],
    }).compile();

    service = module.get(EmailToCaseService);
  });

  describe('createConfig', () => {
    it('should create a config for a new support email', async () => {
      prisma.emailToCaseConfig.findUnique.mockResolvedValue(null);
      prisma.emailToCaseConfig.create.mockResolvedValue({
        id: 'cfg-1',
        workspaceId: WS_ID,
        supportEmail: 'support@test.com',
        isActive: true,
        defaultPriority: 'MEDIUM',
      });

      const result = await service.createConfig({ supportEmail: 'Support@Test.com' });
      expect(result.supportEmail).toBe('support@test.com');
      expect(prisma.emailToCaseConfig.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WS_ID,
          supportEmail: 'support@test.com',
          isActive: true,
          defaultPriority: 'MEDIUM',
        }),
      });
      expect(audit.log).toHaveBeenCalled();
    });

    it('should throw if support email already configured', async () => {
      prisma.emailToCaseConfig.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.createConfig({ supportEmail: 'dup@test.com' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if no tenant context', async () => {
      tenant.getStore.mockReturnValue(null);
      await expect(service.createConfig({ supportEmail: 'x@x.com' }))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('listConfigs', () => {
    it('should return configs for workspace', async () => {
      prisma.emailToCaseConfig.findMany.mockResolvedValue([{ id: 'cfg-1' }]);
      const result = await service.listConfigs();
      expect(result).toHaveLength(1);
      expect(prisma.emailToCaseConfig.findMany).toHaveBeenCalledWith({
        where: { workspaceId: WS_ID },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getConfig', () => {
    it('should return config by id', async () => {
      prisma.emailToCaseConfig.findUnique.mockResolvedValue({ id: 'cfg-1', workspaceId: WS_ID });
      const result = await service.getConfig('cfg-1');
      expect(result.id).toBe('cfg-1');
    });

    it('should throw NotFoundException for wrong workspace', async () => {
      prisma.emailToCaseConfig.findUnique.mockResolvedValue({ id: 'cfg-1', workspaceId: 'other' });
      await expect(service.getConfig('cfg-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.emailToCaseConfig.findUnique.mockResolvedValue(null);
      await expect(service.getConfig('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateConfig', () => {
    it('should update config fields', async () => {
      const existing = { id: 'cfg-1', workspaceId: WS_ID, isActive: true, defaultPriority: 'MEDIUM' };
      prisma.emailToCaseConfig.findUnique.mockResolvedValue(existing);
      prisma.emailToCaseConfig.update.mockResolvedValue({ ...existing, isActive: false });

      const result = await service.updateConfig('cfg-1', { isActive: false });
      expect(prisma.emailToCaseConfig.update).toHaveBeenCalledWith({
        where: { id: 'cfg-1' },
        data: { isActive: false },
      });
      expect(audit.logUpdate).toHaveBeenCalled();
    });

    it('should throw NotFoundException for wrong workspace', async () => {
      prisma.emailToCaseConfig.findUnique.mockResolvedValue({ id: 'cfg-1', workspaceId: 'other' });
      await expect(service.updateConfig('cfg-1', { isActive: false }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteConfig', () => {
    it('should delete config', async () => {
      prisma.emailToCaseConfig.findUnique.mockResolvedValue({ id: 'cfg-1', workspaceId: WS_ID });
      await service.deleteConfig('cfg-1');
      expect(prisma.emailToCaseConfig.delete).toHaveBeenCalledWith({ where: { id: 'cfg-1' } });
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE' }));
    });

    it('should throw NotFoundException for wrong workspace', async () => {
      prisma.emailToCaseConfig.findUnique.mockResolvedValue({ id: 'cfg-1', workspaceId: 'other' });
      await expect(service.deleteConfig('cfg-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('processInboundEmail', () => {
    const baseDto = {
      from: 'John Doe <john@customer.com>',
      to: 'support@company.com',
      subject: 'Need help',
      bodyText: 'I have an issue',
      messageId: 'msg-123',
    };

    const activeConfig = {
      id: 'cfg-1',
      workspaceId: WS_ID,
      supportEmail: 'support@company.com',
      isActive: true,
      defaultQueueId: 'q-1',
      defaultPriority: 'MEDIUM',
      createdById: USER_ID,
      autoReply: false,
    };

    it('should return no_config if no matching config', async () => {
      prisma.emailToCaseConfig.findFirst.mockResolvedValue(null);
      const result = await service.processInboundEmail(baseDto);
      expect(result).toEqual({ processed: false, reason: 'no_config' });
    });

    it('should create a ticket from inbound email', async () => {
      prisma.emailToCaseConfig.findFirst.mockResolvedValue(activeConfig);
      prisma.person.findFirst.mockResolvedValue({ id: 'person-1' });
      prisma.ticket.findFirst.mockResolvedValue(null); // no existing ticket number
      prisma.ticket.create.mockResolvedValue({
        id: 'ticket-1',
        subject: 'Need help',
        ticketNumber: 1,
      });

      const result = await service.processInboundEmail(baseDto);
      expect(result).toEqual({
        processed: true,
        action: 'created',
        ticketId: 'ticket-1',
        ticketNumber: 1,
      });
      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WS_ID,
          subject: 'Need help',
          channel: 'EMAIL',
          contactId: 'person-1',
          queueId: 'q-1',
          sourceEmailMessageId: 'msg-123',
        }),
      });
    });

    it('should create a new person if contact not found', async () => {
      prisma.emailToCaseConfig.findFirst.mockResolvedValue(activeConfig);
      prisma.person.findFirst.mockResolvedValue(null);
      prisma.person.create.mockResolvedValue({ id: 'new-person' });
      prisma.ticket.findFirst.mockResolvedValue(null);
      prisma.ticket.create.mockResolvedValue({ id: 'ticket-2', ticketNumber: 1 });

      await service.processInboundEmail(baseDto);
      expect(prisma.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: WS_ID,
          email: 'john@customer.com',
          fullName: 'John Doe',
          source: 'EMAIL',
        }),
      });
    });

    it('should add a comment if inReplyTo matches existing ticket', async () => {
      prisma.emailToCaseConfig.findFirst.mockResolvedValue(activeConfig);
      prisma.ticket.findFirst.mockResolvedValueOnce({ id: 'existing-ticket', workspaceId: WS_ID });
      prisma.comment.create.mockResolvedValue({ id: 'comment-1' });

      const result = await service.processInboundEmail({
        ...baseDto,
        inReplyTo: 'original-msg-id',
      });

      expect(result).toEqual({ processed: true, action: 'reply', ticketId: 'existing-ticket' });
      expect(prisma.comment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'TICKET',
          entityId: 'existing-ticket',
          body: 'I have an issue',
        }),
      });
    });

    it('should extract email from "Name <email>" format', async () => {
      prisma.emailToCaseConfig.findFirst.mockResolvedValue(activeConfig);
      prisma.person.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.ticket.findFirst.mockResolvedValue(null);
      prisma.ticket.create.mockResolvedValue({ id: 't-1', ticketNumber: 1 });

      await service.processInboundEmail({
        ...baseDto,
        from: '"Ahmed Yousry" <ahmed@example.com>',
      });

      expect(prisma.person.findFirst).toHaveBeenCalledWith({
        where: { workspaceId: WS_ID, emailNormalized: 'ahmed@example.com' },
      });
    });

    it('should handle plain email address in from field', async () => {
      prisma.emailToCaseConfig.findFirst.mockResolvedValue(activeConfig);
      prisma.person.findFirst.mockResolvedValue(null);
      prisma.person.create.mockResolvedValue({ id: 'p-new' });
      prisma.ticket.findFirst.mockResolvedValue(null);
      prisma.ticket.create.mockResolvedValue({ id: 't-1', ticketNumber: 1 });

      await service.processInboundEmail({ ...baseDto, from: 'plain@email.com' });

      expect(prisma.person.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'plain@email.com',
          fullName: 'plain@email.com',
        }),
      });
    });

    it('should increment ticket number from last ticket', async () => {
      prisma.emailToCaseConfig.findFirst.mockResolvedValue(activeConfig);
      prisma.person.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.ticket.findFirst.mockResolvedValue({ ticketNumber: 42 });
      prisma.ticket.create.mockResolvedValue({ id: 't-new', ticketNumber: 43 });

      await service.processInboundEmail(baseDto);

      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ ticketNumber: 43 }),
      });
    });

    it('should use "No Subject" if subject is empty', async () => {
      prisma.emailToCaseConfig.findFirst.mockResolvedValue(activeConfig);
      prisma.person.findFirst.mockResolvedValue({ id: 'p-1' });
      prisma.ticket.findFirst.mockResolvedValue(null);
      prisma.ticket.create.mockResolvedValue({ id: 't-1', ticketNumber: 1 });

      await service.processInboundEmail({ ...baseDto, subject: '' });

      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ subject: 'No Subject' }),
      });
    });
  });
});
