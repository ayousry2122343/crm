import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    chatSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    chatMessage: {
      create: jest.fn(),
    },
    ticket: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const svc = new ChatService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

/* ──────────────────────── startSession ──────────────────────── */

describe('ChatService.startSession', () => {
  it('creates session with WAITING status', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.create.mockResolvedValue({
      id: 'cs_1',
      workspaceId: 'ws_1',
      visitorName: 'Ahmed',
      status: 'WAITING',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.startSession({ visitorName: 'Ahmed' });
      expect(result.status).toBe('WAITING');
      expect(result.visitorName).toBe('Ahmed');
    });

    expect(prisma.chatSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'ws_1',
          visitorName: 'Ahmed',
          status: 'WAITING',
        }),
      }),
    );
  });

  it('accepts optional visitorEmail and queueId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.create.mockResolvedValue({
      id: 'cs_2',
      workspaceId: 'ws_1',
      visitorName: 'Sara',
      visitorEmail: 'sara@test.com',
      queueId: 'q_1',
      status: 'WAITING',
    });

    await tenant.run(ctx(), async () => {
      await svc.startSession({
        visitorName: 'Sara',
        visitorEmail: 'sara@test.com',
        queueId: 'q_1',
      });
    });

    const createArgs = prisma.chatSession.create.mock.calls[0][0];
    expect(createArgs.data.visitorEmail).toBe('sara@test.com');
    expect(createArgs.data.queueId).toBe('q_1');
  });

  it('allows explicit workspaceId for public endpoint', async () => {
    const { svc, prisma } = buildSvc();
    prisma.chatSession.create.mockResolvedValue({
      id: 'cs_3',
      workspaceId: 'ws_ext',
      visitorName: 'Guest',
      status: 'WAITING',
    });

    const result = await svc.startSession({ visitorName: 'Guest' }, 'ws_ext');
    expect(result.workspaceId).toBe('ws_ext');
  });
});

/* ──────────────────────── assignAgent ──────────────────────── */

describe('ChatService.assignAgent', () => {
  it('assigns agent and sets status to ACTIVE', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue({
      id: 'cs_1',
      workspaceId: 'ws_1',
      status: 'WAITING',
    });
    prisma.chatSession.update.mockResolvedValue({
      id: 'cs_1',
      assigneeId: 'u_1',
      status: 'ACTIVE',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.assignAgent('cs_1', 'u_1');
      expect(result.status).toBe('ACTIVE');
      expect(result.assigneeId).toBe('u_1');
    });
  });

  it('throws NotFoundException for non-existent session', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue(null);

    await tenant.run(ctx(), async () => {
      await expect(svc.assignAgent('bad_id', 'u_1')).rejects.toThrow(NotFoundException);
    });
  });

  it('throws BadRequestException if session already ended', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue({
      id: 'cs_1',
      workspaceId: 'ws_1',
      status: 'ENDED',
    });

    await tenant.run(ctx(), async () => {
      await expect(svc.assignAgent('cs_1', 'u_1')).rejects.toThrow(BadRequestException);
    });
  });
});

/* ──────────────────────── sendMessage ──────────────────────── */

describe('ChatService.sendMessage', () => {
  it('adds message to session', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue({
      id: 'cs_1',
      workspaceId: 'ws_1',
      status: 'ACTIVE',
    });
    prisma.chatMessage.create.mockResolvedValue({
      id: 'msg_1',
      sessionId: 'cs_1',
      senderType: 'visitor',
      content: 'Hello',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.sendMessage('cs_1', {
        senderType: 'visitor',
        content: 'Hello',
      });
      expect(result.content).toBe('Hello');
      expect(result.senderType).toBe('visitor');
    });
  });

  it('throws NotFoundException for non-existent session', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue(null);

    await tenant.run(ctx(), async () => {
      await expect(
        svc.sendMessage('bad_id', { senderType: 'visitor', content: 'Hi' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it('throws BadRequestException if session ended', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue({
      id: 'cs_1',
      workspaceId: 'ws_1',
      status: 'ENDED',
    });

    await tenant.run(ctx(), async () => {
      await expect(
        svc.sendMessage('cs_1', { senderType: 'agent', content: 'Hi' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

/* ──────────────────────── endSession ──────────────────────── */

describe('ChatService.endSession', () => {
  it('sets status to ENDED and endedAt', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue({
      id: 'cs_1',
      workspaceId: 'ws_1',
      status: 'ACTIVE',
    });
    prisma.chatSession.update.mockResolvedValue({
      id: 'cs_1',
      status: 'ENDED',
      endedAt: new Date(),
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.endSession('cs_1');
      expect(result.status).toBe('ENDED');
      expect(result.endedAt).toBeTruthy();
    });
  });

  it('throws NotFoundException for non-existent session', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue(null);

    await tenant.run(ctx(), async () => {
      await expect(svc.endSession('bad_id')).rejects.toThrow(NotFoundException);
    });
  });

  it('throws BadRequestException if already ended', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue({
      id: 'cs_1',
      workspaceId: 'ws_1',
      status: 'ENDED',
    });

    await tenant.run(ctx(), async () => {
      await expect(svc.endSession('cs_1')).rejects.toThrow(BadRequestException);
    });
  });
});

/* ──────────────────────── listSessions ──────────────────────── */

describe('ChatService.listSessions', () => {
  it('returns sessions filtered by status', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findMany.mockResolvedValue([
      { id: 'cs_1', status: 'WAITING' },
      { id: 'cs_2', status: 'WAITING' },
    ]);

    await tenant.run(ctx(), async () => {
      const result = await svc.listSessions({ status: 'WAITING' });
      expect(result).toHaveLength(2);
    });

    expect(prisma.chatSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: 'ws_1', status: 'WAITING' }),
      }),
    );
  });

  it('returns sessions filtered by assigneeId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findMany.mockResolvedValue([{ id: 'cs_1', assigneeId: 'u_1' }]);

    await tenant.run(ctx(), async () => {
      const result = await svc.listSessions({ assigneeId: 'u_1' });
      expect(result).toHaveLength(1);
    });

    expect(prisma.chatSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: 'ws_1', assigneeId: 'u_1' }),
      }),
    );
  });
});

/* ──────────────────────── getSession ──────────────────────── */

describe('ChatService.getSession', () => {
  it('returns session with messages', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue({
      id: 'cs_1',
      messages: [{ id: 'msg_1', content: 'Hello' }],
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.getSession('cs_1');
      expect(result.messages).toHaveLength(1);
    });
  });

  it('throws NotFoundException for non-existent session', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue(null);

    await tenant.run(ctx(), async () => {
      await expect(svc.getSession('bad_id')).rejects.toThrow(NotFoundException);
    });
  });
});

/* ──────────────────────── convertToTicket ──────────────────────── */

describe('ChatService.convertToTicket', () => {
  it('creates ticket from chat session and links', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue({
      id: 'cs_1',
      workspaceId: 'ws_1',
      visitorName: 'Ahmed',
      assigneeId: 'u_1',
      queueId: null,
      ticketId: null,
      endedAt: null,
      messages: [
        { senderType: 'visitor', content: 'Help me' },
        { senderType: 'agent', content: 'Sure' },
      ],
    });
    prisma.ticket.findFirst.mockResolvedValue({ ticketNumber: 10 });
    prisma.ticket.create.mockResolvedValue({
      id: 'tkt_1',
      ticketNumber: 11,
      subject: 'Chat with Ahmed',
    });
    prisma.chatSession.update.mockResolvedValue({ id: 'cs_1', ticketId: 'tkt_1' });

    await tenant.run(ctx(), async () => {
      const result = await svc.convertToTicket('cs_1');
      expect(result.subject).toBe('Chat with Ahmed');
      expect(result.ticketNumber).toBe(11);
    });

    const ticketData = prisma.ticket.create.mock.calls[0][0].data;
    expect(ticketData.channel).toBe('CHAT');
    expect(ticketData.description).toContain('[visitor] Help me');
    expect(ticketData.description).toContain('[agent] Sure');
  });

  it('throws BadRequestException if already converted', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue({
      id: 'cs_1',
      workspaceId: 'ws_1',
      ticketId: 'existing_ticket',
      messages: [],
    });

    await tenant.run(ctx(), async () => {
      await expect(svc.convertToTicket('cs_1')).rejects.toThrow(BadRequestException);
    });
  });

  it('throws NotFoundException for non-existent session', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.chatSession.findFirst.mockResolvedValue(null);

    await tenant.run(ctx(), async () => {
      await expect(svc.convertToTicket('bad_id')).rejects.toThrow(NotFoundException);
    });
  });
});
