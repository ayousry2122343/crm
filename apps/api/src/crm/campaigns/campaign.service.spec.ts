import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    campaign: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    campaignRecipient: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    person: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    list: { findUnique: jest.fn() },
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
  const svc = new CampaignService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('CampaignService.create', () => {
  it('creates a campaign and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.campaign.create.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      name: 'Summer Sale',
      status: 'DRAFT',
    });
    await tenant.run(ctx(), async () => {
      const result = await svc.create({
        name: 'Summer Sale',
        subject: 'Big savings!',
        body: '<p>Hello</p>',
      });
      expect(result.id).toBe('c_1');
      expect(prisma.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'ws_1',
            name: 'Summer Sale',
          }),
        }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'Campaign', action: 'CREATE' }),
      );
    });
  });

  it('throws without tenant context', async () => {
    const { svc } = buildSvc();
    await expect(
      svc.create({ name: 'X', subject: 'Y', body: 'Z' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CampaignService.list', () => {
  it('returns paginated campaigns', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const rows = [
      { id: 'c_1', name: 'A' },
      { id: 'c_2', name: 'B' },
    ];
    prisma.campaign.findMany.mockResolvedValue(rows);
    const result = await tenant.run(ctx(), async () => svc.list({ limit: 1 }));
    expect(result.items).toHaveLength(1);
    expect(result.nextCursor).toBe('c_1');
    expect(result.hasMore).toBe(true);
  });

  it('filters by status', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.campaign.findMany.mockResolvedValue([]);
    await tenant.run(ctx(), async () => svc.list({ status: 'DRAFT' }));
    const args = prisma.campaign.findMany.mock.calls[0][0];
    expect(args.where).toMatchObject({ workspaceId: 'ws_1', status: 'DRAFT' });
  });
});

describe('CampaignService.get', () => {
  it('returns campaign by id', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      archivedAt: null,
      _count: { recipients: 5 },
    });
    const result = await tenant.run(ctx(), async () => svc.get('c_1'));
    expect(result.id).toBe('c_1');
  });

  it('throws for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'OTHER',
      archivedAt: null,
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('c_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws for archived campaign', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      archivedAt: new Date(),
    });
    await expect(
      tenant.run(ctx(), async () => svc.get('c_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CampaignService.update', () => {
  it('updates draft campaign fields', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      status: 'DRAFT',
    });
    prisma.campaign.update.mockResolvedValue({ id: 'c_1', name: 'Updated' });
    await tenant.run(ctx(), async () => {
      const result = await svc.update('c_1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
      expect(audit.logUpdate).toHaveBeenCalled();
    });
  });

  it('throws when editing non-DRAFT campaign', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      status: 'SENT',
    });
    await expect(
      tenant.run(ctx(), async () => svc.update('c_1', { name: 'X' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CampaignService.schedule', () => {
  it('schedules a DRAFT campaign', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    const when = new Date('2026-06-01');
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      status: 'DRAFT',
    });
    prisma.campaign.update.mockResolvedValue({ id: 'c_1', status: 'SCHEDULED', scheduledAt: when });
    await tenant.run(ctx(), async () => {
      const result = await svc.schedule('c_1', when);
      expect(result.status).toBe('SCHEDULED');
      expect(audit.log).toHaveBeenCalled();
    });
  });

  it('throws when not DRAFT', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      status: 'SENT',
    });
    await expect(
      tenant.run(ctx(), async () => svc.schedule('c_1', new Date())),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CampaignService.send', () => {
  it('sends campaign and creates recipient records from list members', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      status: 'DRAFT',
      listId: 'list_1',
    });
    prisma.list.findUnique.mockResolvedValue({
      id: 'list_1',
      workspaceId: 'ws_1',
      memberIds: ['p_1', 'p_2'],
    });
    prisma.person.findMany.mockResolvedValue([
      { id: 'p_1', email: 'a@test.com' },
      { id: 'p_2', email: 'b@test.com' },
    ]);
    prisma.campaignRecipient.createMany.mockResolvedValue({ count: 2 });
    prisma.campaign.update.mockResolvedValue({ id: 'c_1', status: 'SENDING' });

    await tenant.run(ctx(), async () => {
      const result = await svc.send('c_1');
      expect(result.status).toBe('SENDING');
      expect(prisma.campaignRecipient.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ personId: 'p_1', email: 'a@test.com' }),
          expect.objectContaining({ personId: 'p_2', email: 'b@test.com' }),
        ]),
      });
      expect(audit.log).toHaveBeenCalled();
    });
  });

  it('filters unsubscribed and doNotContact people', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      status: 'DRAFT',
      listId: 'list_1',
    });
    prisma.list.findUnique.mockResolvedValue({
      id: 'list_1',
      workspaceId: 'ws_1',
      memberIds: ['p_1'],
    });
    prisma.person.findMany.mockResolvedValue([]);
    prisma.campaign.update.mockResolvedValue({ id: 'c_1', status: 'SENDING' });

    await tenant.run(ctx(), async () => {
      await svc.send('c_1');
      const where = prisma.person.findMany.mock.calls[0][0].where;
      expect(where.unsubscribed).toBe(false);
      expect(where.doNotContact).toBe(false);
    });
  });

  it('throws without listId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      status: 'DRAFT',
      listId: null,
    });
    await expect(
      tenant.run(ctx(), async () => svc.send('c_1')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws when not DRAFT or SCHEDULED', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      status: 'SENT',
      listId: 'list_1',
    });
    await expect(
      tenant.run(ctx(), async () => svc.send('c_1')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CampaignService.pause', () => {
  it('pauses a SENDING campaign', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      status: 'SENDING',
    });
    prisma.campaign.update.mockResolvedValue({ id: 'c_1', status: 'PAUSED' });
    await tenant.run(ctx(), async () => {
      const result = await svc.pause('c_1');
      expect(result.status).toBe('PAUSED');
    });
  });

  it('throws when DRAFT', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({
      id: 'c_1',
      workspaceId: 'ws_1',
      status: 'DRAFT',
    });
    await expect(
      tenant.run(ctx(), async () => svc.pause('c_1')),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CampaignService.trackOpen', () => {
  it('updates recipient openedAt and status', async () => {
    const { svc, prisma } = buildSvc();
    prisma.campaignRecipient.findUnique.mockResolvedValue({
      id: 'r_1',
      status: 'SENT',
      openedAt: null,
    });
    prisma.campaignRecipient.update.mockResolvedValue({ id: 'r_1', status: 'OPENED' });
    const result = await svc.trackOpen('r_1');
    expect(result.status).toBe('OPENED');
    const args = prisma.campaignRecipient.update.mock.calls[0][0];
    expect(args.data.openedAt).toBeInstanceOf(Date);
  });

  it('skips if already opened', async () => {
    const { svc, prisma } = buildSvc();
    prisma.campaignRecipient.findUnique.mockResolvedValue({
      id: 'r_1',
      status: 'OPENED',
      openedAt: new Date(),
    });
    await svc.trackOpen('r_1');
    expect(prisma.campaignRecipient.update).not.toHaveBeenCalled();
  });
});

describe('CampaignService.trackClick', () => {
  it('updates recipient clickedAt and status', async () => {
    const { svc, prisma } = buildSvc();
    prisma.campaignRecipient.findUnique.mockResolvedValue({
      id: 'r_1',
      status: 'OPENED',
      openedAt: new Date(),
      clickedAt: null,
    });
    prisma.campaignRecipient.update.mockResolvedValue({ id: 'r_1', status: 'CLICKED' });
    const result = await svc.trackClick('r_1');
    expect(result.status).toBe('CLICKED');
    const args = prisma.campaignRecipient.update.mock.calls[0][0];
    expect(args.data.clickedAt).toBeInstanceOf(Date);
  });
});

describe('CampaignService.unsubscribe', () => {
  it('marks recipient unsubscribed and updates person', async () => {
    const { svc, prisma } = buildSvc();
    prisma.campaignRecipient.findUnique.mockResolvedValue({
      id: 'r_1',
      personId: 'p_1',
    });
    prisma.campaignRecipient.update.mockResolvedValue({ id: 'r_1', status: 'UNSUBSCRIBED' });
    prisma.person.update.mockResolvedValue({ id: 'p_1', unsubscribed: true });

    await svc.unsubscribe('r_1');
    expect(prisma.campaignRecipient.update.mock.calls[0][0].data.status).toBe('UNSUBSCRIBED');
    expect(prisma.person.update).toHaveBeenCalledWith({
      where: { id: 'p_1' },
      data: { unsubscribed: true },
    });
  });

  it('returns silently for non-existent recipient', async () => {
    const { svc, prisma } = buildSvc();
    prisma.campaignRecipient.findUnique.mockResolvedValue(null);
    await svc.unsubscribe('bad');
    expect(prisma.campaignRecipient.update).not.toHaveBeenCalled();
  });
});

describe('CampaignService.archive', () => {
  it('sets archivedAt and audits', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({ id: 'c_1', workspaceId: 'ws_1' });
    prisma.campaign.update.mockResolvedValue({ id: 'c_1', archivedAt: new Date() });
    await tenant.run(ctx(), async () => {
      await svc.archive('c_1');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'Campaign', action: 'DELETE' }),
      );
    });
  });

  it('throws for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.campaign.findUnique.mockResolvedValue({ id: 'c_1', workspaceId: 'OTHER' });
    await expect(
      tenant.run(ctx(), async () => svc.archive('c_1')),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
