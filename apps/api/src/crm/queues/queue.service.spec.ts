import { NotFoundException } from '@nestjs/common';
import { QueueService } from './queue.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    queue: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ticket: {
      groupBy: jest.fn(),
    },
  };
}

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const svc = new QueueService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

/* ──────────────────────── create ──────────────────────── */

describe('QueueService.create', () => {
  it('creates queue with valid data', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.queue.create.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      name: 'Support',
      assignmentMode: 'MANUAL',
      members: [],
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.create({ name: 'Support' });
      expect(result.name).toBe('Support');
    });

    const createArgs = prisma.queue.create.mock.calls[0][0];
    expect(createArgs.data.workspaceId).toBe('ws_1');
    expect(createArgs.data.name).toBe('Support');
  });

  it('sets default assignmentMode MANUAL', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.queue.create.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      name: 'Default',
      assignmentMode: 'MANUAL',
    });

    await tenant.run(ctx(), async () => {
      await svc.create({ name: 'Default' });
    });

    const createArgs = prisma.queue.create.mock.calls[0][0];
    expect(createArgs.data.assignmentMode).toBeUndefined();
  });

  it('audits creation', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.queue.create.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      name: 'Audit Q',
    });

    await tenant.run(ctx(), async () => {
      await svc.create({ name: 'Audit Q' });
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Queue', entityId: 'q_1', action: 'CREATE' }),
    );
  });
});

/* ──────────────────────── list ──────────────────────── */

describe('QueueService.list', () => {
  it('paginates with cursor', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const items = Array.from({ length: 51 }, (_, i) => ({ id: `q_${i}` }));
    prisma.queue.findMany.mockResolvedValue(items);

    await tenant.run(ctx(), async () => {
      const result = await svc.list({ limit: 50 });
      expect(result.items).toHaveLength(50);
      expect(result.nextCursor).toBe('q_49');
    });
  });

  it('filters by assignmentMode', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.queue.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.list({ assignmentMode: 'ROUND_ROBIN' });
    });

    const where = prisma.queue.findMany.mock.calls[0][0].where;
    expect(where.assignmentMode).toBe('ROUND_ROBIN');
  });
});

/* ──────────────────────── get ──────────────────────── */

describe('QueueService.get', () => {
  it('returns queue', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.queue.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      name: 'Support',
      members: ['u_1', 'u_2'],
      archivedAt: null,
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.get('q_1');
      expect(result.id).toBe('q_1');
    });
  });

  it('throws NotFoundException for missing queue', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.queue.findUnique.mockResolvedValue(null);

    await tenant.run(ctx(), async () => {
      await expect(svc.get('q_missing')).rejects.toThrow(NotFoundException);
    });
  });
});

/* ──────────────────────── update ──────────────────────── */

describe('QueueService.update', () => {
  it('updates name and description', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const before = { id: 'q_1', workspaceId: 'ws_1', name: 'Old', description: null };
    prisma.queue.findUnique.mockResolvedValue(before);
    prisma.queue.update.mockResolvedValue({ ...before, name: 'New', description: 'Desc' });

    await tenant.run(ctx(), async () => {
      const result = await svc.update('q_1', { name: 'New', description: 'Desc' });
      expect(result.name).toBe('New');
    });

    const updateArgs = prisma.queue.update.mock.calls[0][0];
    expect(updateArgs.data.name).toBe('New');
    expect(updateArgs.data.description).toBe('Desc');
  });

  it('updates assignmentMode', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const before = { id: 'q_1', workspaceId: 'ws_1', assignmentMode: 'MANUAL' };
    prisma.queue.findUnique.mockResolvedValue(before);
    prisma.queue.update.mockResolvedValue({ ...before, assignmentMode: 'ROUND_ROBIN' });

    await tenant.run(ctx(), async () => {
      const result = await svc.update('q_1', { assignmentMode: 'ROUND_ROBIN' });
      expect(result.assignmentMode).toBe('ROUND_ROBIN');
    });
  });

  it('updates members array', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const before = { id: 'q_1', workspaceId: 'ws_1', members: [] };
    prisma.queue.findUnique.mockResolvedValue(before);
    prisma.queue.update.mockResolvedValue({ ...before, members: ['u_1', 'u_2'] });

    await tenant.run(ctx(), async () => {
      const result = await svc.update('q_1', { members: ['u_1', 'u_2'] });
      expect(result.members).toEqual(['u_1', 'u_2']);
    });

    const updateArgs = prisma.queue.update.mock.calls[0][0];
    expect(updateArgs.data.members).toEqual(['u_1', 'u_2']);
  });

  it('audits update', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    const before = { id: 'q_1', workspaceId: 'ws_1', name: 'Old' };
    prisma.queue.findUnique.mockResolvedValue(before);
    prisma.queue.update.mockResolvedValue({ ...before, name: 'New' });

    await tenant.run(ctx(), async () => {
      await svc.update('q_1', { name: 'New' });
    });

    expect(audit.logUpdate).toHaveBeenCalledWith('Queue', 'q_1', expect.anything(), expect.anything());
  });
});

/* ──────────────────────── archive ──────────────────────── */

describe('QueueService.archive', () => {
  it('soft deletes + audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.queue.findUnique.mockResolvedValue({ id: 'q_1', workspaceId: 'ws_1' });
    prisma.queue.update.mockResolvedValue({ id: 'q_1', archivedAt: new Date() });

    await tenant.run(ctx(), async () => {
      await svc.archive('q_1');
    });

    expect(prisma.queue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Queue', entityId: 'q_1', action: 'DELETE' }),
    );
  });
});

/* ──────────────────────── addMember ──────────────────────── */

describe('QueueService.addMember', () => {
  it('adds userId to members array', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.queue.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      members: ['u_1'],
      archivedAt: null,
    });
    prisma.queue.update.mockResolvedValue({
      id: 'q_1',
      members: ['u_1', 'u_2'],
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.addMember('q_1', 'u_2');
      expect(result.members).toEqual(['u_1', 'u_2']);
    });

    const updateArgs = prisma.queue.update.mock.calls[0][0];
    expect(updateArgs.data.members).toEqual(['u_1', 'u_2']);
  });

  it('audits member addition', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.queue.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      members: [],
      archivedAt: null,
    });
    prisma.queue.update.mockResolvedValue({ id: 'q_1', members: ['u_1'] });

    await tenant.run(ctx(), async () => {
      await svc.addMember('q_1', 'u_1');
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Queue', action: 'UPDATE' }),
    );
  });
});

/* ──────────────────────── removeMember ──────────────────────── */

describe('QueueService.removeMember', () => {
  it('removes userId from members array', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.queue.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      members: ['u_1', 'u_2'],
      archivedAt: null,
    });
    prisma.queue.update.mockResolvedValue({
      id: 'q_1',
      members: ['u_1'],
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.removeMember('q_1', 'u_2');
      expect(result.members).toEqual(['u_1']);
    });

    const updateArgs = prisma.queue.update.mock.calls[0][0];
    expect(updateArgs.data.members).toEqual(['u_1']);
  });

  it('audits member removal', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.queue.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      members: ['u_1'],
      archivedAt: null,
    });
    prisma.queue.update.mockResolvedValue({ id: 'q_1', members: [] });

    await tenant.run(ctx(), async () => {
      await svc.removeMember('q_1', 'u_1');
    });

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Queue', action: 'UPDATE' }),
    );
  });
});

/* ──────────────────────── getNextAssignee ──────────────────────── */

describe('QueueService.getNextAssignee', () => {
  it('MANUAL mode → returns null', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.queue.findUnique.mockResolvedValue({
      id: 'q_1',
      workspaceId: 'ws_1',
      assignmentMode: 'MANUAL',
      members: ['u_1', 'u_2'],
      archivedAt: null,
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.getNextAssignee('q_1');
      expect(result).toBeNull();
    });
  });

  it('ROUND_ROBIN → returns members in sequence', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const queue = {
      id: 'q_rr',
      workspaceId: 'ws_1',
      assignmentMode: 'ROUND_ROBIN',
      members: ['u_A', 'u_B', 'u_C'],
      archivedAt: null,
    };
    prisma.queue.findUnique.mockResolvedValue(queue);

    await tenant.run(ctx(), async () => {
      const first = await svc.getNextAssignee('q_rr');
      expect(first).toBe('u_A');
      const second = await svc.getNextAssignee('q_rr');
      expect(second).toBe('u_B');
      const third = await svc.getNextAssignee('q_rr');
      expect(third).toBe('u_C');
    });
  });

  it('ROUND_ROBIN → wraps around at end of members', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const queue = {
      id: 'q_wrap',
      workspaceId: 'ws_1',
      assignmentMode: 'ROUND_ROBIN',
      members: ['u_X', 'u_Y'],
      archivedAt: null,
    };
    prisma.queue.findUnique.mockResolvedValue(queue);

    await tenant.run(ctx(), async () => {
      await svc.getNextAssignee('q_wrap'); // u_X
      await svc.getNextAssignee('q_wrap'); // u_Y
      const wrapped = await svc.getNextAssignee('q_wrap'); // back to u_X
      expect(wrapped).toBe('u_X');
    });
  });

  it('LEAST_ACTIVE → returns member with fewest open tickets', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.queue.findUnique.mockResolvedValue({
      id: 'q_la',
      workspaceId: 'ws_1',
      assignmentMode: 'LEAST_ACTIVE',
      members: ['u_1', 'u_2', 'u_3'],
      archivedAt: null,
    });
    prisma.ticket.groupBy.mockResolvedValue([
      { assigneeId: 'u_1', _count: { _all: 5 } },
      { assigneeId: 'u_2', _count: { _all: 2 } },
    ]);

    await tenant.run(ctx(), async () => {
      const result = await svc.getNextAssignee('q_la');
      expect(result).toBe('u_3');
    });
  });

  it('LEAST_ACTIVE → returns first member when all have zero tickets', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.queue.findUnique.mockResolvedValue({
      id: 'q_la0',
      workspaceId: 'ws_1',
      assignmentMode: 'LEAST_ACTIVE',
      members: ['u_A', 'u_B'],
      archivedAt: null,
    });
    prisma.ticket.groupBy.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      const result = await svc.getNextAssignee('q_la0');
      expect(result).toBe('u_A');
    });
  });

  it('empty members → returns null', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.queue.findUnique.mockResolvedValue({
      id: 'q_empty',
      workspaceId: 'ws_1',
      assignmentMode: 'ROUND_ROBIN',
      members: [],
      archivedAt: null,
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.getNextAssignee('q_empty');
      expect(result).toBeNull();
    });
  });
});
