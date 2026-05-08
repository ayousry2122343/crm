import { CommentService } from '../comments/comment.service';
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
      upsert: jest.fn().mockResolvedValue({ id: 'f_1' }),
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn(),
    },
  };
}

function makeAudit() {
  return {
    log: jest.fn().mockResolvedValue(undefined),
  };
}

function makeNotificationService() {
  return {
    create: jest.fn().mockResolvedValue({ id: 'notif_1' }),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const notifications = makeNotificationService();
  const audit = makeAudit();
  const svc = new CommentService(prisma as any, tenant, notifications as any, audit as any);
  return { svc, tenant, prisma, notifications, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_author') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('Comment → Notification Integration', () => {
  it('creating a comment with @mention sends notification to mentioned user', async () => {
    const { svc, tenant, prisma, notifications } = buildSvc();
    prisma.comment.create.mockResolvedValue({
      id: 'c_1',
      body: 'Hey @[Sara](u_sara), check this',
      mentions: ['u_sara'],
      author: { id: 'u_author', fullName: 'Ahmed', email: 'a@b.com' },
    });

    await tenant.run(ctx(), async () => {
      await svc.create({
        entityType: 'DEAL',
        entityId: 'd_1',
        body: 'Hey @[Sara](u_sara), check this',
      });
    });

    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u_sara',
        type: 'MENTION',
        title: 'You were mentioned in a comment',
      }),
    );
  });

  it('creating a comment with multiple @mentions sends notification to each unique user', async () => {
    const { svc, tenant, prisma, notifications } = buildSvc();
    prisma.comment.create.mockResolvedValue({
      id: 'c_2',
      body: '@[Sara](u_sara) and @[John](u_john)',
      mentions: ['u_sara', 'u_john'],
      author: { id: 'u_author', fullName: 'Ahmed', email: 'a@b.com' },
    });

    await tenant.run(ctx(), async () => {
      await svc.create({
        entityType: 'PERSON',
        entityId: 'p_1',
        body: '@[Sara](u_sara) and @[John](u_john)',
      });
    });

    expect(notifications.create).toHaveBeenCalledTimes(2);
    const userIds = notifications.create.mock.calls.map((c: any) => c[0].userId);
    expect(userIds).toContain('u_sara');
    expect(userIds).toContain('u_john');
  });

  it('does not send mention notification to the author themselves', async () => {
    const { svc, tenant, prisma, notifications } = buildSvc();
    prisma.comment.create.mockResolvedValue({
      id: 'c_3',
      body: '@[Author](u_author) self-mention',
      mentions: ['u_author'],
      author: { id: 'u_author', fullName: 'Ahmed', email: 'a@b.com' },
    });

    await tenant.run(ctx(), async () => {
      await svc.create({
        entityType: 'DEAL',
        entityId: 'd_1',
        body: '@[Author](u_author) self-mention',
      });
    });

    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('sends follower notifications to non-mentioned followers', async () => {
    const { svc, tenant, prisma, notifications } = buildSvc();
    prisma.comment.create.mockResolvedValue({
      id: 'c_4',
      body: 'Update on deal',
      mentions: [],
      author: { id: 'u_author', fullName: 'Ahmed', email: 'a@b.com' },
    });
    prisma.follower.findMany.mockResolvedValue([
      { userId: 'u_follower1' },
      { userId: 'u_author' },
    ]);

    await tenant.run(ctx(), async () => {
      await svc.create({
        entityType: 'DEAL',
        entityId: 'd_1',
        body: 'Update on deal',
      });
    });

    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u_follower1',
        type: 'SYSTEM',
      }),
    );
  });

  it('does not double-notify a user who is both mentioned and a follower', async () => {
    const { svc, tenant, prisma, notifications } = buildSvc();
    prisma.comment.create.mockResolvedValue({
      id: 'c_5',
      body: '@[Sara](u_sara) update',
      mentions: ['u_sara'],
      author: { id: 'u_author', fullName: 'Ahmed', email: 'a@b.com' },
    });
    prisma.follower.findMany.mockResolvedValue([
      { userId: 'u_sara' },
      { userId: 'u_author' },
    ]);

    await tenant.run(ctx(), async () => {
      await svc.create({
        entityType: 'DEAL',
        entityId: 'd_1',
        body: '@[Sara](u_sara) update',
      });
    });

    const saraNotifs = notifications.create.mock.calls.filter(
      (c: any) => c[0].userId === 'u_sara',
    );
    expect(saraNotifs).toHaveLength(1);
    expect(saraNotifs[0][0].type).toBe('MENTION');
  });

  it('auto-follows the comment author', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.comment.create.mockResolvedValue({
      id: 'c_6',
      body: 'New comment',
      mentions: [],
      author: { id: 'u_author', fullName: 'Ahmed', email: 'a@b.com' },
    });

    await tenant.run(ctx(), async () => {
      await svc.create({
        entityType: 'DEAL',
        entityId: 'd_1',
        body: 'New comment',
      });
    });

    expect(prisma.follower.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId_userId_entityType_entityId: {
            workspaceId: 'ws_1',
            userId: 'u_author',
            entityType: 'DEAL',
            entityId: 'd_1',
          },
        },
      }),
    );
  });

  it('comment with no mentions and no followers sends no notifications', async () => {
    const { svc, tenant, prisma, notifications } = buildSvc();
    prisma.comment.create.mockResolvedValue({
      id: 'c_7',
      body: 'Just a note',
      mentions: [],
      author: { id: 'u_author', fullName: 'Ahmed', email: 'a@b.com' },
    });
    prisma.follower.findMany.mockResolvedValue([
      { userId: 'u_author' },
    ]);

    await tenant.run(ctx(), async () => {
      await svc.create({
        entityType: 'DEAL',
        entityId: 'd_1',
        body: 'Just a note',
      });
    });

    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('comment with empty mentions array still notifies followers', async () => {
    const { svc, tenant, prisma, notifications } = buildSvc();
    prisma.comment.create.mockResolvedValue({
      id: 'c_8',
      body: 'Status update',
      mentions: [],
      author: { id: 'u_author', fullName: 'Ahmed', email: 'a@b.com' },
    });
    prisma.follower.findMany.mockResolvedValue([
      { userId: 'u_follower_a' },
      { userId: 'u_follower_b' },
    ]);

    await tenant.run(ctx(), async () => {
      await svc.create({
        entityType: 'PERSON',
        entityId: 'p_1',
        body: 'Status update',
      });
    });

    expect(notifications.create).toHaveBeenCalledTimes(2);
    const ids = notifications.create.mock.calls.map((c: any) => c[0].userId);
    expect(ids).toContain('u_follower_a');
    expect(ids).toContain('u_follower_b');
  });
});
