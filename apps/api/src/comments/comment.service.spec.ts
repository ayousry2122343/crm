import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommentService } from './comment.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    comment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    follower: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

function makeNotificationService() {
  return { create: jest.fn().mockResolvedValue({ id: 'n_1' }) };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const notifications = makeNotificationService();
  const audit = makeAudit();
  const svc = new CommentService(
    prisma as any,
    tenant,
    notifications as any,
    audit as any,
  );
  return { svc, tenant, prisma, notifications, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

// ─── create ───

describe('CommentService.create', () => {
  it('creates comment, auto-follows author, and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.comment.create.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      entityType: 'DEAL',
      entityId: 'd_1',
      authorId: 'u_1',
      body: 'Looks good',
      mentions: [],
    });
    prisma.follower.upsert.mockResolvedValue({});
    prisma.follower.findMany.mockResolvedValue([]);

    const result = await tenant.run(ctx(), async () =>
      svc.create({
        entityType: 'DEAL',
        entityId: 'd_1',
        body: 'Looks good',
      }),
    );

    expect(result.id).toBe('c_1');
    expect(prisma.comment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'ws_1',
        entityType: 'DEAL',
        entityId: 'd_1',
        authorId: 'u_1',
        body: 'Looks good',
        mentions: [],
      }),
      include: expect.any(Object),
    });
    expect(prisma.follower.upsert).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Comment', action: 'CREATE' }),
    );
  });

  it('parses mentions and notifies mentioned users', async () => {
    const { svc, tenant, prisma, notifications } = buildSvc();
    prisma.comment.create.mockResolvedValue({
      id: 'c_2',
      workspaceId: 'ws_1',
      entityType: 'PERSON',
      entityId: 'p_1',
      authorId: 'u_1',
      body: 'Hey @[Sara](u_2) check this',
      mentions: ['u_2'],
    });
    prisma.follower.upsert.mockResolvedValue({});
    prisma.follower.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () =>
      svc.create({
        entityType: 'PERSON',
        entityId: 'p_1',
        body: 'Hey @[Sara](u_2) check this',
      }),
    );

    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u_2',
        type: 'MENTION',
      }),
    );
  });

  it('notifies followers excluding author', async () => {
    const { svc, tenant, prisma, notifications } = buildSvc();
    prisma.comment.create.mockResolvedValue({
      id: 'c_3',
      workspaceId: 'ws_1',
      entityType: 'DEAL',
      entityId: 'd_1',
      authorId: 'u_1',
      body: 'Update',
      mentions: [],
    });
    prisma.follower.upsert.mockResolvedValue({});
    prisma.follower.findMany.mockResolvedValue([
      { userId: 'u_1' },
      { userId: 'u_3' },
    ]);

    await tenant.run(ctx(), async () =>
      svc.create({
        entityType: 'DEAL',
        entityId: 'd_1',
        body: 'Update',
      }),
    );

    const calls = notifications.create.mock.calls;
    const notifiedUsers = calls.map((c: any) => c[0].userId);
    expect(notifiedUsers).toContain('u_3');
    expect(notifiedUsers).not.toContain('u_1');
  });

  it('creates reply with parentId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.comment.create.mockResolvedValue({
      id: 'c_reply',
      parentId: 'c_1',
      body: 'Reply',
    });
    prisma.follower.upsert.mockResolvedValue({});
    prisma.follower.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () =>
      svc.create({
        entityType: 'DEAL',
        entityId: 'd_1',
        body: 'Reply',
        parentId: 'c_1',
      }),
    );

    expect(prisma.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ parentId: 'c_1' }),
      }),
    );
  });

  it('throws when no tenant context', async () => {
    const { svc } = buildSvc();
    await expect(
      svc.create({ entityType: 'DEAL', entityId: 'd_1', body: 'test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ─── list ───

describe('CommentService.list', () => {
  it('returns paginated top-level comments with nested replies', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const rows = [
      { id: 'c_1', body: 'First', parentId: null, replies: [] },
      { id: 'c_2', body: 'Second', parentId: null, replies: [] },
      { id: 'c_3', body: 'Third', parentId: null, replies: [] },
    ];
    prisma.comment.findMany.mockResolvedValue(rows);

    const result = await tenant.run(ctx(), async () =>
      svc.list('DEAL', 'd_1', { limit: 2 }),
    );

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('c_2');
    const where = prisma.comment.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({
      workspaceId: 'ws_1',
      entityType: 'DEAL',
      entityId: 'd_1',
      parentId: null,
      archivedAt: null,
    });
  });
});

// ─── update ───

describe('CommentService.update', () => {
  it('updates comment body', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.comment.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      authorId: 'u_1',
      archivedAt: null,
    });
    prisma.comment.update.mockResolvedValue({
      id: 'c_1',
      body: 'Updated body',
    });

    const result = await tenant.run(ctx(), async () =>
      svc.update('c_1', { body: 'Updated body' }),
    );

    expect(result.body).toBe('Updated body');
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.comment.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'OTHER',
      authorId: 'u_1',
    });
    await expect(
      tenant.run(ctx(), async () => svc.update('c_1', { body: 'x' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when not author', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.comment.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      authorId: 'u_other',
      archivedAt: null,
    });
    await expect(
      tenant.run(ctx(), async () => svc.update('c_1', { body: 'x' })),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── pin/unpin ───

describe('CommentService.pin', () => {
  it('pins a comment', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.comment.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      archivedAt: null,
    });
    prisma.comment.update.mockResolvedValue({ id: 'c_1', isPinned: true });

    const result = await tenant.run(ctx(), async () => svc.pin('c_1', true));
    expect(result.isPinned).toBe(true);
  });
});

// ─── archive ───

describe('CommentService.archive', () => {
  it('soft-deletes a comment and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.comment.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      authorId: 'u_1',
      archivedAt: null,
    });
    prisma.comment.update.mockResolvedValue({
      id: 'c_1',
      archivedAt: new Date(),
    });

    await tenant.run(ctx(), async () => svc.archive('c_1'));

    expect(prisma.comment.update).toHaveBeenCalledWith({
      where: { id: 'c_1' },
      data: { archivedAt: expect.any(Date) },
    });
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'Comment', action: 'DELETE' }),
    );
  });
});

// ─── followers ───

describe('CommentService.follow / unfollow', () => {
  it('follows an entity', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.follower.upsert.mockResolvedValue({
      id: 'f_1',
      userId: 'u_1',
      entityType: 'DEAL',
      entityId: 'd_1',
    });

    const result = await tenant.run(ctx(), async () =>
      svc.follow('DEAL', 'd_1'),
    );
    expect(result.userId).toBe('u_1');
  });

  it('unfollows an entity', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.follower.deleteMany.mockResolvedValue({ count: 1 });

    const result = await tenant.run(ctx(), async () =>
      svc.unfollow('DEAL', 'd_1'),
    );
    expect(result.count).toBe(1);
  });

  it('lists followers for an entity', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.follower.findMany.mockResolvedValue([
      { userId: 'u_1', user: { fullName: 'Ahmed' } },
    ]);

    const result = await tenant.run(ctx(), async () =>
      svc.listFollowers('DEAL', 'd_1'),
    );
    expect(result).toHaveLength(1);
  });
});
