import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    channelConfig: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    channelMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    person: {
      findFirst: jest.fn(),
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

function makeTwilioAdapter() {
  return {
    send: jest.fn().mockResolvedValue({ externalId: 'SM_ext_1' }),
    parseWebhook: jest.fn(),
    validateWebhook: jest.fn().mockReturnValue(true),
    getMessageStatus: jest.fn(),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const notification = makeNotification();
  const twilioAdapter = makeTwilioAdapter();
  const svc = new ChannelService(
    prisma as any,
    tenant,
    audit as any,
    notification as any,
    twilioAdapter as any,
  );
  return { svc, tenant, prisma, audit, notification, twilioAdapter };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

/* ──────────────────── createConfig ──────────────────── */

describe('ChannelService.createConfig', () => {
  it('creates channel config with webhook secret', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.channelConfig.create.mockResolvedValue({
      id: 'cc_1',
      workspaceId: 'ws_1',
      provider: 'TWILIO',
      name: 'Main SMS',
      phoneNumber: '+15551234567',
      isActive: true,
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.createConfig({
        name: 'Main SMS',
        provider: 'TWILIO',
        credentials: { accountSid: 'AC_test', authToken: 'tok' },
        phoneNumber: '+15551234567',
      });
      expect(result.id).toBe('cc_1');
      expect(result.name).toBe('Main SMS');
    });

    expect(prisma.channelConfig.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'ws_1',
          provider: 'TWILIO',
          name: 'Main SMS',
        }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'ChannelConfig',
        action: 'CREATE',
      }),
    );
  });
});

/* ──────────────────── send ──────────────────── */

describe('ChannelService.send', () => {
  it('sends message via adapter and creates ChannelMessage record', async () => {
    const { svc, tenant, prisma, twilioAdapter } = buildSvc();
    prisma.channelConfig.findUnique.mockResolvedValue({
      id: 'cc_1',
      workspaceId: 'ws_1',
      provider: 'TWILIO',
      credentials: { accountSid: 'AC_test', authToken: 'tok' },
      phoneNumber: '+15551234567',
      isActive: true,
    });
    prisma.person.findFirst.mockResolvedValue({
      id: 'p_1',
      phone: '+201001234567',
      phoneNormalized: '+201001234567',
    });
    prisma.channelMessage.create.mockResolvedValue({
      id: 'cm_1',
      externalId: 'SM_ext_1',
      status: 'QUEUED',
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.send({
        channelConfigId: 'cc_1',
        personId: 'p_1',
        content: 'Hello!',
      });
      expect(result.externalId).toBe('SM_ext_1');
    });

    expect(twilioAdapter.send).toHaveBeenCalledWith(
      expect.objectContaining({ phoneNumber: '+15551234567' }),
      '+201001234567',
      'Hello!',
      undefined,
    );
    expect(prisma.channelMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: 'OUT',
          content: 'Hello!',
          personId: 'p_1',
        }),
      }),
    );
  });

  it('throws NotFoundException if config not found', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.channelConfig.findUnique.mockResolvedValue(null);

    await tenant.run(ctx(), async () => {
      await expect(
        svc.send({ channelConfigId: 'cc_missing', personId: 'p_1', content: 'Hi' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  it('throws BadRequestException if config is inactive', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.channelConfig.findUnique.mockResolvedValue({
      id: 'cc_1',
      workspaceId: 'ws_1',
      isActive: false,
    });

    await tenant.run(ctx(), async () => {
      await expect(
        svc.send({ channelConfigId: 'cc_1', personId: 'p_1', content: 'Hi' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('throws NotFoundException if person not found', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.channelConfig.findUnique.mockResolvedValue({
      id: 'cc_1',
      workspaceId: 'ws_1',
      provider: 'TWILIO',
      isActive: true,
    });
    prisma.person.findFirst.mockResolvedValue(null);

    await tenant.run(ctx(), async () => {
      await expect(
        svc.send({ channelConfigId: 'cc_1', personId: 'p_missing', content: 'Hi' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

/* ──────────────────── handleInbound ──────────────────── */

describe('ChannelService.handleInbound', () => {
  it('creates inbound ChannelMessage and auto-links person by phone', async () => {
    const { svc, prisma } = buildSvc();
    prisma.channelConfig.findUnique.mockResolvedValue({
      id: 'cc_1',
      workspaceId: 'ws_1',
      provider: 'TWILIO',
      webhookSecret: 'whsec_test',
      isActive: true,
    });
    prisma.person.findFirst.mockResolvedValue({
      id: 'p_1',
      phoneNormalized: '+201001234567',
    });
    prisma.channelMessage.create.mockResolvedValue({
      id: 'cm_in_1',
      direction: 'IN',
      personId: 'p_1',
    });

    const result = await svc.handleInbound('cc_1', {
      externalId: 'SM_in_1',
      from: '+201001234567',
      to: '+15551234567',
      content: 'I need help',
      contentType: 'TEXT',
    });

    expect(result.direction).toBe('IN');
    expect(result.personId).toBe('p_1');
    expect(prisma.channelMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          direction: 'IN',
          from: '+201001234567',
          personId: 'p_1',
        }),
      }),
    );
  });

  it('creates inbound message with null personId when no phone match', async () => {
    const { svc, prisma } = buildSvc();
    prisma.channelConfig.findUnique.mockResolvedValue({
      id: 'cc_1',
      workspaceId: 'ws_1',
      provider: 'TWILIO',
      webhookSecret: 'whsec_test',
      isActive: true,
    });
    prisma.person.findFirst.mockResolvedValue(null);
    prisma.channelMessage.create.mockResolvedValue({
      id: 'cm_in_2',
      direction: 'IN',
      personId: null,
    });

    const result = await svc.handleInbound('cc_1', {
      externalId: 'SM_in_2',
      from: '+20999999999',
      to: '+15551234567',
      content: 'Unknown sender',
      contentType: 'TEXT',
    });

    expect(result.personId).toBeNull();
  });
});

/* ──────────────────── listMessages ──────────────────── */

describe('ChannelService.listMessages', () => {
  it('paginates messages with cursor', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const items = Array.from({ length: 51 }, (_, i) => ({ id: `cm_${i}` }));
    prisma.channelMessage.findMany.mockResolvedValue(items);

    await tenant.run(ctx(), async () => {
      const result = await svc.listMessages({ limit: 50 });
      expect(result.items).toHaveLength(50);
      expect(result.nextCursor).toBe('cm_49');
    });
  });

  it('filters by personId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.channelMessage.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.listMessages({ personId: 'p_1' });
    });

    const where = prisma.channelMessage.findMany.mock.calls[0][0].where;
    expect(where.personId).toBe('p_1');
  });

  it('filters by channelConfigId', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.channelMessage.findMany.mockResolvedValue([]);

    await tenant.run(ctx(), async () => {
      await svc.listMessages({ channelConfigId: 'cc_1' });
    });

    const where = prisma.channelMessage.findMany.mock.calls[0][0].where;
    expect(where.channelConfigId).toBe('cc_1');
  });
});

/* ──────────────────── listConfigs ──────────────────── */

describe('ChannelService.listConfigs', () => {
  it('lists active configs for workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.channelConfig.findMany.mockResolvedValue([
      { id: 'cc_1', name: 'Main SMS' },
    ]);

    await tenant.run(ctx(), async () => {
      const result = await svc.listConfigs();
      expect(result).toHaveLength(1);
    });

    const where = prisma.channelConfig.findMany.mock.calls[0][0].where;
    expect(where.workspaceId).toBe('ws_1');
  });
});

/* ──────────────────── processWebhook ──────────────────── */

describe('ChannelService.processWebhook', () => {
  it('validates webhook and creates inbound message', async () => {
    const { svc, prisma, twilioAdapter } = buildSvc();
    prisma.channelConfig.findUnique.mockResolvedValue({
      id: 'cc_1',
      workspaceId: 'ws_1',
      provider: 'TWILIO',
      webhookSecret: 'whsec_test',
      isActive: true,
    });
    twilioAdapter.parseWebhook.mockReturnValue({
      externalId: 'SM_wh_1',
      from: '+201001234567',
      to: '+15551234567',
      content: 'Webhook msg',
      contentType: 'TEXT',
    });
    prisma.person.findFirst.mockResolvedValue(null);
    prisma.channelMessage.create.mockResolvedValue({
      id: 'cm_wh_1',
      direction: 'IN',
    });

    const result = await svc.processWebhook('cc_1', {}, { 'x-twilio-signature': 'sig' });
    expect(result.direction).toBe('IN');
    expect(twilioAdapter.validateWebhook).toHaveBeenCalled();
  });

  it('throws BadRequestException for invalid signature', async () => {
    const { svc, prisma, twilioAdapter } = buildSvc();
    prisma.channelConfig.findUnique.mockResolvedValue({
      id: 'cc_1',
      workspaceId: 'ws_1',
      provider: 'TWILIO',
      webhookSecret: 'whsec_test',
      isActive: true,
    });
    twilioAdapter.validateWebhook.mockReturnValue(false);

    await expect(
      svc.processWebhook('cc_1', {}, { 'x-twilio-signature': 'bad' }),
    ).rejects.toThrow(BadRequestException);
  });
});

/* ──────────────────── updateMessageStatus ──────────────────── */

describe('ChannelService.updateMessageStatus', () => {
  it('maps Twilio status and updates message', async () => {
    const { svc, prisma } = buildSvc();
    prisma.channelConfig.findUnique.mockResolvedValue({ id: 'cc_1' });

    await svc.updateMessageStatus('cc_1', 'SM_ext_1', 'delivered');

    expect(prisma.channelMessage.updateMany).toHaveBeenCalledWith({
      where: { channelConfigId: 'cc_1', externalId: 'SM_ext_1' },
      data: { status: 'DELIVERED' },
    });
  });
});
