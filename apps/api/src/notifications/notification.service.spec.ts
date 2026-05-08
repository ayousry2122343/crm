import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    notificationPreference: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };
}

function makeGateway() {
  return { emitToUser: jest.fn() };
}

function makeQueue() {
  return { add: jest.fn().mockResolvedValue(undefined) };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const gateway = makeGateway();
  const queue = makeQueue();
  const svc = new NotificationService(
    prisma as any,
    tenant,
    gateway as any,
    queue as any,
  );
  return { svc, tenant, prisma, gateway, queue };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

// ─── create ───

describe('NotificationService.create', () => {
  it('creates notification, emits socket event, and queues email job', async () => {
    const { svc, tenant, prisma, gateway, queue } = buildSvc();
    const created = {
      id: 'n_1',
      workspaceId: 'ws_1',
      userId: 'u_1',
      type: 'ASSIGNMENT',
      title: 'You were assigned a deal',
      body: 'Deal: Acme',
      link: '/deals/d_1',
      isRead: false,
      createdAt: new Date(),
    };
    prisma.notification.create.mockResolvedValue(created);
    prisma.notificationPreference.findMany.mockResolvedValue([]);

    const result = await tenant.run(ctx(), async () =>
      svc.create({
        userId: 'u_1',
        type: 'ASSIGNMENT',
        title: 'You were assigned a deal',
        body: 'Deal: Acme',
        link: '/deals/d_1',
      }),
    );

    expect(result.id).toBe('n_1');
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'ws_1',
        userId: 'u_1',
        type: 'ASSIGNMENT',
        title: 'You were assigned a deal',
      }),
    });
    expect(gateway.emitToUser).toHaveBeenCalledWith('u_1', created);
    expect(queue.add).toHaveBeenCalledWith(
      'notification-email',
      expect.objectContaining({ notificationId: 'n_1' }),
    );
  });

  it('skips email queue when user has opted out of email for the type', async () => {
    const { svc, tenant, prisma, gateway, queue } = buildSvc();
    prisma.notification.create.mockResolvedValue({
      id: 'n_2',
      workspaceId: 'ws_1',
      userId: 'u_1',
      type: 'SYSTEM',
      title: 'System update',
    });
    prisma.notificationPreference.findMany.mockResolvedValue([
      { channel: 'EMAIL', type: 'SYSTEM', enabled: false },
    ]);

    await tenant.run(ctx(), async () =>
      svc.create({
        userId: 'u_1',
        type: 'SYSTEM',
        title: 'System update',
      }),
    );

    expect(gateway.emitToUser).toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('skips in-app emit when user has opted out of IN_APP for the type', async () => {
    const { svc, tenant, prisma, gateway, queue } = buildSvc();
    prisma.notification.create.mockResolvedValue({
      id: 'n_3',
      workspaceId: 'ws_1',
      userId: 'u_1',
      type: 'WORKFLOW',
      title: 'Workflow ran',
    });
    prisma.notificationPreference.findMany.mockResolvedValue([
      { channel: 'IN_APP', type: 'WORKFLOW', enabled: false },
    ]);

    await tenant.run(ctx(), async () =>
      svc.create({
        userId: 'u_1',
        type: 'WORKFLOW',
        title: 'Workflow ran',
      }),
    );

    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('throws when no tenant context', async () => {
    const { svc } = buildSvc();
    await expect(
      svc.create({ userId: 'u_1', type: 'SYSTEM', title: 'test' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ─── markRead ───

describe('NotificationService.markRead', () => {
  it('marks a notification as read with timestamp', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.notification.findUnique.mockResolvedValue({
      id: 'n_1',
      workspaceId: 'ws_1',
      userId: 'u_1',
      isRead: false,
    });
    prisma.notification.update.mockResolvedValue({
      id: 'n_1',
      isRead: true,
      readAt: new Date(),
    });

    const result = await tenant.run(ctx(), async () => svc.markRead('n_1'));

    expect(result.isRead).toBe(true);
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'n_1' },
      data: { isRead: true, readAt: expect.any(Date) },
    });
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.notification.findUnique.mockResolvedValue({
      id: 'n_1',
      workspaceId: 'OTHER',
      userId: 'u_1',
    });
    await expect(
      tenant.run(ctx(), async () => svc.markRead('n_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException for wrong user', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.notification.findUnique.mockResolvedValue({
      id: 'n_1',
      workspaceId: 'ws_1',
      userId: 'OTHER_USER',
    });
    await expect(
      tenant.run(ctx(), async () => svc.markRead('n_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

// ─── markAllRead ───

describe('NotificationService.markAllRead', () => {
  it('marks all unread notifications for the current user as read', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.notification.updateMany.mockResolvedValue({ count: 5 });

    const result = await tenant.run(ctx(), async () => svc.markAllRead());

    expect(result.count).toBe(5);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { workspaceId: 'ws_1', userId: 'u_1', isRead: false },
      data: { isRead: true, readAt: expect.any(Date) },
    });
  });
});

// ─── list ───

describe('NotificationService.list', () => {
  it('returns paginated notifications for current user', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const rows = Array.from({ length: 3 }, (_, i) => ({
      id: `n_${i}`,
      type: 'SYSTEM',
      title: `Notification ${i}`,
      createdAt: new Date(),
    }));
    prisma.notification.findMany.mockResolvedValue(rows);

    const result = await tenant.run(ctx(), async () =>
      svc.list({ limit: 2 }),
    );

    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('n_1');
    const where = prisma.notification.findMany.mock.calls[0][0].where;
    expect(where).toMatchObject({ workspaceId: 'ws_1', userId: 'u_1' });
  });

  it('supports cursor pagination', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.notification.findMany.mockResolvedValue([
      { id: 'n_5', title: 'Older' },
    ]);

    await tenant.run(ctx(), async () =>
      svc.list({ cursor: 'n_3', limit: 10 }),
    );

    const args = prisma.notification.findMany.mock.calls[0][0];
    expect(args.cursor).toEqual({ id: 'n_3' });
    expect(args.skip).toBe(1);
  });
});

// ─── unreadCount ───

describe('NotificationService.unreadCount', () => {
  it('returns count of unread notifications for current user', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.notification.count.mockResolvedValue(7);

    const result = await tenant.run(ctx(), async () => svc.unreadCount());

    expect(result).toBe(7);
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { workspaceId: 'ws_1', userId: 'u_1', isRead: false },
    });
  });
});

// ─── preferences ───

describe('NotificationService.getPreferences', () => {
  it('returns all preferences for current user', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.notificationPreference.findMany.mockResolvedValue([
      { channel: 'EMAIL', type: 'ASSIGNMENT', enabled: true },
    ]);

    const result = await tenant.run(ctx(), async () => svc.getPreferences());
    expect(result).toHaveLength(1);
  });
});

describe('NotificationService.upsertPreference', () => {
  it('upserts a notification preference', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.notificationPreference.upsert.mockResolvedValue({
      id: 'pref_1',
      channel: 'EMAIL',
      type: 'ASSIGNMENT',
      enabled: false,
    });

    const result = await tenant.run(ctx(), async () =>
      svc.upsertPreference({
        channel: 'EMAIL',
        type: 'ASSIGNMENT',
        enabled: false,
      }),
    );

    expect(result.enabled).toBe(false);
    expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          workspaceId_userId_channel_type: {
            workspaceId: 'ws_1',
            userId: 'u_1',
            channel: 'EMAIL',
            type: 'ASSIGNMENT',
          },
        },
        update: { enabled: false },
        create: expect.objectContaining({
          workspaceId: 'ws_1',
          userId: 'u_1',
          channel: 'EMAIL',
          type: 'ASSIGNMENT',
          enabled: false,
        }),
      }),
    );
  });
});
