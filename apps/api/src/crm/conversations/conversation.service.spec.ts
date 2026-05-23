import { NotFoundException } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    conversation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    channelMessage: { findMany: jest.fn() },
    chatMessage: { findMany: jest.fn() },
    emailMessage: { findMany: jest.fn() },
  };
}

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
  };
}

function makeNotification() {
  return { create: jest.fn().mockResolvedValue(undefined) };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const notification = makeNotification();
  const svc = new ConversationService(prisma as any, tenant, audit as any, notification as any);
  return { svc, tenant, prisma, audit, notification };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

/* ──────────── list ──────────── */

describe('ConversationService.list', () => {
  it('paginates with cursor', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const items = Array.from({ length: 51 }, (_, i) => ({ id: `conv_${i}` }));
    prisma.conversation.findMany.mockResolvedValue(items);

    await tenant.run(ctx(), async () => {
      const result = await svc.list({ limit: 50 });
      expect(result.items).toHaveLength(50);
      expect(result.nextCursor).toBe('conv_49');
    });
  });

  it('filters by assigneeId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.conversation.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ assigneeId: 'u_2' });
    });

    const where = prisma.conversation.findMany.mock.calls[0][0].where;
    expect(where.assigneeId).toBe('u_2');
  });

  it('filters by status', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.conversation.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ status: 'OPEN' });
    });

    const where = prisma.conversation.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('OPEN');
  });

  it('filters by channelType', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.conversation.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ channelType: 'WHATSAPP' });
    });

    const where = prisma.conversation.findMany.mock.calls[0][0].where;
    expect(where.channelType).toBe('WHATSAPP');
  });
});

/* ──────────── assign ──────────── */

describe('ConversationService.assign', () => {
  it('assigns conversation and audits', async () => {
    const { svc, tenant, prisma, audit, notification } = buildSvc();
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv_1',
      workspaceId: 'ws_1',
      assigneeId: null,
      subject: 'Help request',
    });
    prisma.conversation.update.mockResolvedValue({
      id: 'conv_1',
      assigneeId: 'u_2',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.assign('conv_1', 'u_2');
      expect(result.assigneeId).toBe('u_2');
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Conversation',
        action: 'UPDATE',
        fieldKey: 'assigneeId',
      }),
    );
    expect(notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u_2' }),
    );
  });

  it('throws NotFoundException for missing conversation', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.conversation.findUnique.mockResolvedValue(null);

    await tenant.run(ctx(), async () => {
      await expect(svc.assign('conv_missing', 'u_2')).rejects.toThrow(NotFoundException);
    });
  });
});

/* ──────────── snooze ──────────── */

describe('ConversationService.snooze', () => {
  it('sets status to SNOOZED with snoozedUntil date', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const until = new Date(Date.now() + 3600_000).toISOString();
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv_1',
      workspaceId: 'ws_1',
      status: 'OPEN',
    });
    prisma.conversation.update.mockResolvedValue({
      id: 'conv_1',
      status: 'SNOOZED',
      snoozedUntil: until,
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.snooze('conv_1', until);
      expect(result.status).toBe('SNOOZED');
    });

    const updateData = prisma.conversation.update.mock.calls[0][0].data;
    expect(updateData.status).toBe('SNOOZED');
    expect(updateData.snoozedUntil).toBe(until);
  });
});

/* ──────────── close ──────────── */

describe('ConversationService.close', () => {
  it('sets status to CLOSED', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv_1',
      workspaceId: 'ws_1',
      status: 'OPEN',
    });
    prisma.conversation.update.mockResolvedValue({
      id: 'conv_1',
      status: 'CLOSED',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.close('conv_1');
      expect(result.status).toBe('CLOSED');
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Conversation',
        fieldKey: 'status',
        newValue: 'CLOSED',
      }),
    );
  });
});

/* ──────────── merge ──────────── */

describe('ConversationService.merge', () => {
  it('merges source conversations into target', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv_target',
      workspaceId: 'ws_1',
    });
    prisma.channelMessage.findMany.mockResolvedValue([]);
    prisma.conversation.updateMany.mockResolvedValue({ count: 2 });
    prisma.conversation.update.mockResolvedValue({ id: 'conv_target' });

    await tenant.run(ctx(), async () => {
      await svc.merge('conv_target', ['conv_src_1', 'conv_src_2']);
    });

    expect(prisma.conversation.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['conv_src_1', 'conv_src_2'] } },
        data: { status: 'CLOSED' },
      }),
    );
    expect(audit.log).toHaveBeenCalled();
  });
});

/* ──────────── getMessages ──────────── */

describe('ConversationService.getMessages', () => {
  it('returns channel messages for SMS conversation', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv_1',
      workspaceId: 'ws_1',
      channelType: 'SMS',
    });
    prisma.channelMessage.findMany.mockResolvedValue([
      { id: 'cm_1', content: 'Hello', direction: 'IN', createdAt: new Date() },
    ]);

    await tenant.run(ctx(), async () => {
      const result = await svc.getMessages('conv_1');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Hello');
    });
  });

  it('returns chat messages for CHAT conversation', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv_2',
      workspaceId: 'ws_1',
      channelType: 'CHAT',
      chatSessionId: 'cs_1',
    });
    prisma.chatMessage.findMany.mockResolvedValue([
      { id: 'chatm_1', content: 'Hi there', senderType: 'visitor', createdAt: new Date() },
    ]);

    await tenant.run(ctx(), async () => {
      const result = await svc.getMessages('conv_2');
      expect(result).toHaveLength(1);
    });
  });
});
