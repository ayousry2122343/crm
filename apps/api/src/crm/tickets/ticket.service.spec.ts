import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    ticket: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
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

function makeQueueService() {
  return { getNextAssignee: jest.fn().mockResolvedValue(null) };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const notification = makeNotification();
  const queueSvc = makeQueueService();
  const svc = new TicketService(prisma as any, tenant, audit as any, notification as any, queueSvc as any);
  return { svc, tenant, prisma, audit, notification, queueSvc };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

/* ──────────────────────── create ──────────────────────── */

describe('TicketService.create', () => {
  it('creates ticket with valid data + auto-number (first ticket = 1)', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.ticket.create.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
      ticketNumber: 1,
      subject: 'Cannot login',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.create({ subject: 'Cannot login' });
      expect(result.ticketNumber).toBe(1);
      expect(result.subject).toBe('Cannot login');
    });

    expect(prisma.ticket.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: 'ws_1' },
        orderBy: { ticketNumber: 'desc' },
        select: { ticketNumber: true },
      }),
    );
    const createArgs = prisma.ticket.create.mock.calls[0][0];
    expect(createArgs.data.ticketNumber).toBe(1);
    expect(createArgs.data.workspaceId).toBe('ws_1');
  });

  it('auto-increments ticketNumber per workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findFirst.mockResolvedValue({ ticketNumber: 42 });
    prisma.ticket.create.mockResolvedValue({
      id: 't_2',
      workspaceId: 'ws_1',
      ticketNumber: 43,
      subject: 'Bug report',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.create({ subject: 'Bug report' });
      expect(result.ticketNumber).toBe(43);
    });

    const createArgs = prisma.ticket.create.mock.calls[0][0];
    expect(createArgs.data.ticketNumber).toBe(43);
  });

  it('sets default status/priority via Prisma defaults', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.ticket.create.mockResolvedValue({
      id: 't_3',
      workspaceId: 'ws_1',
      ticketNumber: 1,
      subject: 'Test',
      status: 'NEW',
      priority: 'MEDIUM',
    });

    await tenant.run(ctx(), async () => {
      await svc.create({ subject: 'Test' });
    });

    const createArgs = prisma.ticket.create.mock.calls[0][0];
    expect(createArgs.data.status).toBeUndefined();
    expect(createArgs.data.priority).toBeUndefined();
  });

  it('notifies assignee when assigneeId is set', async () => {
    const { svc, tenant, prisma, notification } = buildSvc();
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.ticket.create.mockResolvedValue({
      id: 't_4',
      workspaceId: 'ws_1',
      ticketNumber: 1,
      subject: 'Login issue',
      assigneeId: 'u_2',
    });

    await tenant.run(ctx(), async () => {
      await svc.create({ subject: 'Login issue', assigneeId: 'u_2' });
    });

    expect(notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u_2',
        type: 'GENERAL',
        title: expect.stringContaining('Login issue'),
        link: expect.stringContaining('/tickets/'),
      }),
    );
  });

  it('audits creation', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.ticket.create.mockResolvedValue({
      id: 't_5',
      workspaceId: 'ws_1',
      ticketNumber: 1,
      subject: 'Audit test',
    });

    await tenant.run(ctx(), async () => {
      await svc.create({ subject: 'Audit test' });
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Ticket', entityId: 't_5', action: 'CREATE' }),
    );
  });
});

/* ──────────────────────── list ──────────────────────── */

describe('TicketService.list', () => {
  it('paginates with cursor — 51 items, limit 50, hasMore=true', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const items = Array.from({ length: 51 }, (_, i) => ({ id: `t_${i}` }));
    prisma.ticket.findMany.mockResolvedValue(items);

    await tenant.run(ctx(), async () => {
      const result = await svc.list({ limit: 50 });
      expect(result.items).toHaveLength(50);
      expect(result.nextCursor).toBe('t_49');
    });
  });

  it('filters by status', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ status: 'OPEN' });
    });

    const where = prisma.ticket.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('OPEN');
  });

  it('filters by priority', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ priority: 'HIGH' });
    });

    const where = prisma.ticket.findMany.mock.calls[0][0].where;
    expect(where.priority).toBe('HIGH');
  });

  it('filters by assigneeId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ assigneeId: 'u_2' });
    });

    const where = prisma.ticket.findMany.mock.calls[0][0].where;
    expect(where.assigneeId).toBe('u_2');
  });

  it('filters by contactId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ contactId: 'c_1' });
    });

    const where = prisma.ticket.findMany.mock.calls[0][0].where;
    expect(where.contactId).toBe('c_1');
  });

  it('filters by channel', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ channel: 'EMAIL' });
    });

    const where = prisma.ticket.findMany.mock.calls[0][0].where;
    expect(where.channel).toBe('EMAIL');
  });

  it('searches by subject (contains, case-insensitive)', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ search: 'login' });
    });

    const where = prisma.ticket.findMany.mock.calls[0][0].where;
    expect(where.subject).toEqual({ contains: 'login', mode: 'insensitive' });
  });
});

/* ──────────────────────── get ──────────────────────── */

describe('TicketService.get', () => {
  it('returns ticket with relations', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
      archivedAt: null,
      contact: { id: 'c_1' },
      company: { id: 'co_1' },
      assignee: null,
      team: null,
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.get('t_1');
      expect(result.id).toBe('t_1');
    });

    expect(prisma.ticket.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't_1' },
        include: { contact: true, company: true, assignee: true, team: true, queue: true },
      }),
    );
  });

  it('throws NotFoundException for missing ticket', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue(null);

    await tenant.run(ctx(), async () => {
      await expect(svc.get('t_missing')).rejects.toThrow(NotFoundException);
    });
  });
});

/* ──────────────────────── update ──────────────────────── */

describe('TicketService.update', () => {
  it('updates subject and description', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    const before = { id: 't_1', workspaceId: 'ws_1', subject: 'Old', description: 'Old desc' };
    prisma.ticket.findUnique.mockResolvedValue(before);
    prisma.ticket.update.mockResolvedValue({ ...before, subject: 'New', description: 'New desc' });

    await tenant.run(ctx(), async () => {
      const result = await svc.update('t_1', { subject: 'New', description: 'New desc' });
      expect(result.subject).toBe('New');
    });

    expect(prisma.ticket.update).toHaveBeenCalled();
  });

  it('updates priority', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const before = { id: 't_1', workspaceId: 'ws_1', priority: 'LOW' };
    prisma.ticket.findUnique.mockResolvedValue(before);
    prisma.ticket.update.mockResolvedValue({ ...before, priority: 'HIGH' });

    await tenant.run(ctx(), async () => {
      const result = await svc.update('t_1', { priority: 'HIGH' });
      expect(result.priority).toBe('HIGH');
    });

    const updateArgs = prisma.ticket.update.mock.calls[0][0];
    expect(updateArgs.data.priority).toBe('HIGH');
  });

  it('does NOT allow status change via update', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const before = { id: 't_1', workspaceId: 'ws_1', status: 'NEW' };
    prisma.ticket.findUnique.mockResolvedValue(before);
    prisma.ticket.update.mockResolvedValue(before);

    await tenant.run(ctx(), async () => {
      await svc.update('t_1', { subject: 'Updated' } as any);
    });

    const updateArgs = prisma.ticket.update.mock.calls[0][0];
    expect(updateArgs.data.status).toBeUndefined();
  });

  it('audits update', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    const before = { id: 't_1', workspaceId: 'ws_1', subject: 'Old' };
    prisma.ticket.findUnique.mockResolvedValue(before);
    prisma.ticket.update.mockResolvedValue({ ...before, subject: 'New' });

    await tenant.run(ctx(), async () => {
      await svc.update('t_1', { subject: 'New' });
    });

    expect(audit.logUpdate).toHaveBeenCalledWith('Ticket', 't_1', expect.anything(), expect.anything());
  });
});

/* ──────────────────────── changeStatus ──────────────────────── */

describe('TicketService.changeStatus', () => {
  it('valid: NEW -> OPEN', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
      status: 'NEW',
      archivedAt: null,
    });
    prisma.ticket.update.mockResolvedValue({
      id: 't_1',
      status: 'OPEN',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.changeStatus('t_1', { status: 'OPEN' });
      expect(result.status).toBe('OPEN');
    });
  });

  it('valid: OPEN -> RESOLVED (sets resolvedAt)', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
      status: 'OPEN',
      archivedAt: null,
    });
    prisma.ticket.update.mockResolvedValue({
      id: 't_1',
      status: 'RESOLVED',
      resolvedAt: new Date(),
    });

    await tenant.run(ctx(), async () => {
      await svc.changeStatus('t_1', { status: 'RESOLVED' });
    });

    const updateArgs = prisma.ticket.update.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('RESOLVED');
    expect(updateArgs.data.resolvedAt).toBeInstanceOf(Date);
  });

  it('valid: RESOLVED -> CLOSED (sets closedAt)', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
      status: 'RESOLVED',
      archivedAt: null,
    });
    prisma.ticket.update.mockResolvedValue({
      id: 't_1',
      status: 'CLOSED',
      closedAt: new Date(),
    });

    await tenant.run(ctx(), async () => {
      await svc.changeStatus('t_1', { status: 'CLOSED' });
    });

    const updateArgs = prisma.ticket.update.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('CLOSED');
    expect(updateArgs.data.closedAt).toBeInstanceOf(Date);
  });

  it('valid: CLOSED -> OPEN (reopen — clears resolvedAt and closedAt)', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
      status: 'CLOSED',
      archivedAt: null,
    });
    prisma.ticket.update.mockResolvedValue({
      id: 't_1',
      status: 'OPEN',
      resolvedAt: null,
      closedAt: null,
    });

    await tenant.run(ctx(), async () => {
      await svc.changeStatus('t_1', { status: 'OPEN' });
    });

    const updateArgs = prisma.ticket.update.mock.calls[0][0];
    expect(updateArgs.data.status).toBe('OPEN');
    expect(updateArgs.data.resolvedAt).toBeNull();
    expect(updateArgs.data.closedAt).toBeNull();
  });

  it('invalid: NEW -> ON_HOLD (throws BadRequestException)', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
      status: 'NEW',
      archivedAt: null,
    });

    await tenant.run(ctx(), async () => {
      await expect(
        svc.changeStatus('t_1', { status: 'ON_HOLD' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('invalid: CLOSED -> PENDING (throws BadRequestException)', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
      status: 'CLOSED',
      archivedAt: null,
    });

    await tenant.run(ctx(), async () => {
      await expect(
        svc.changeStatus('t_1', { status: 'PENDING' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('audits status change with fieldKey', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
      status: 'NEW',
      archivedAt: null,
    });
    prisma.ticket.update.mockResolvedValue({
      id: 't_1',
      status: 'OPEN',
    });

    await tenant.run(ctx(), async () => {
      await svc.changeStatus('t_1', { status: 'OPEN' });
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Ticket',
        entityId: 't_1',
        action: 'UPDATE',
        fieldKey: 'status',
        oldValue: 'NEW',
        newValue: 'OPEN',
      }),
    );
  });
});

/* ──────────────────────── assign ──────────────────────── */

describe('TicketService.assign', () => {
  it('assigns user to ticket', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
      assigneeId: null,
      subject: 'Test ticket',
      archivedAt: null,
    });
    prisma.ticket.update.mockResolvedValue({
      id: 't_1',
      assigneeId: 'u_2',
      subject: 'Test ticket',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.assign('t_1', { assigneeId: 'u_2' });
      expect(result.assigneeId).toBe('u_2');
    });

    const updateArgs = prisma.ticket.update.mock.calls[0][0];
    expect(updateArgs.data.assigneeId).toBe('u_2');
  });

  it('notifies new assignee', async () => {
    const { svc, tenant, prisma, notification } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
      assigneeId: null,
      subject: 'Notify test',
      archivedAt: null,
    });
    prisma.ticket.update.mockResolvedValue({
      id: 't_1',
      assigneeId: 'u_3',
      subject: 'Notify test',
    });

    await tenant.run(ctx(), async () => {
      await svc.assign('t_1', { assigneeId: 'u_3' });
    });

    expect(notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u_3',
        type: 'GENERAL',
        title: expect.stringContaining('Notify test'),
        link: expect.stringContaining('/tickets/t_1'),
      }),
    );
  });

  it('audits assignment with fieldKey', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
      assigneeId: 'u_old',
      subject: 'Audit assign',
      archivedAt: null,
    });
    prisma.ticket.update.mockResolvedValue({
      id: 't_1',
      assigneeId: 'u_new',
    });

    await tenant.run(ctx(), async () => {
      await svc.assign('t_1', { assigneeId: 'u_new' });
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Ticket',
        entityId: 't_1',
        action: 'UPDATE',
        fieldKey: 'assigneeId',
        oldValue: 'u_old',
        newValue: 'u_new',
      }),
    );
  });
});

/* ──────────────────────── archive ──────────────────────── */

describe('TicketService.archive', () => {
  it('soft deletes and audits with action DELETE', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.ticket.findUnique.mockResolvedValue({
      id: 't_1',
      workspaceId: 'ws_1',
    });
    prisma.ticket.update.mockResolvedValue({
      id: 't_1',
      archivedAt: new Date(),
    });

    await tenant.run(ctx(), async () => {
      await svc.archive('t_1');
    });

    expect(prisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Ticket', entityId: 't_1', action: 'DELETE' }),
    );
  });
});

/* ──────────────────────── queue integration ──────────────────────── */

describe('TicketService queue integration', () => {
  it('create with queueId + no assigneeId → auto-assigns from queue', async () => {
    const { svc, tenant, prisma, queueSvc, notification } = buildSvc();
    queueSvc.getNextAssignee.mockResolvedValue('u_auto');
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.ticket.create.mockResolvedValue({
      id: 't_q1',
      workspaceId: 'ws_1',
      ticketNumber: 1,
      subject: 'Queue ticket',
      assigneeId: 'u_auto',
      queueId: 'q_1',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.create({ subject: 'Queue ticket', queueId: 'q_1' });
      expect(result.assigneeId).toBe('u_auto');
    });

    expect(queueSvc.getNextAssignee).toHaveBeenCalledWith('q_1');
    const createArgs = prisma.ticket.create.mock.calls[0][0];
    expect(createArgs.data.queueId).toBe('q_1');
    expect(createArgs.data.assigneeId).toBe('u_auto');
    expect(notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u_auto' }),
    );
  });

  it('create with queueId + assigneeId → uses provided assigneeId (no auto-assign)', async () => {
    const { svc, tenant, prisma, queueSvc } = buildSvc();
    prisma.ticket.findFirst.mockResolvedValue(null);
    prisma.ticket.create.mockResolvedValue({
      id: 't_q2',
      workspaceId: 'ws_1',
      ticketNumber: 1,
      subject: 'Manual assign',
      assigneeId: 'u_manual',
      queueId: 'q_1',
    });

    await tenant.run(ctx(), async () => {
      await svc.create({ subject: 'Manual assign', queueId: 'q_1', assigneeId: 'u_manual' });
    });

    expect(queueSvc.getNextAssignee).not.toHaveBeenCalled();
    const createArgs = prisma.ticket.create.mock.calls[0][0];
    expect(createArgs.data.assigneeId).toBe('u_manual');
  });

  it('list filters by queueId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ queueId: 'q_1' });
    });

    const where = prisma.ticket.findMany.mock.calls[0][0].where;
    expect(where.queueId).toBe('q_1');
  });
});
