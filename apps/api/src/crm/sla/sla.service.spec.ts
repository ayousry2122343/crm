import { NotFoundException } from '@nestjs/common';
import { SLAService } from './sla.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    sLAPolicy: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    ticket: {
      findMany: jest.fn(),
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

function makeBusinessHoursService() {
  return {
    calculateDueDate: jest.fn().mockResolvedValue(new Date('2026-01-05T10:00:00')),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const notification = makeNotification();
  const bhService = makeBusinessHoursService();
  const svc = new SLAService(
    prisma as any,
    tenant,
    audit as any,
    bhService as any,
    notification as any,
  );
  return { svc, tenant, prisma, audit, notification, bhService };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

const SAMPLE_RULES = [
  { priority: 'HIGH', firstResponseMinutes: 60, resolutionMinutes: 480, breachAction: 'NOTIFY' },
  { priority: 'URGENT', firstResponseMinutes: 15, resolutionMinutes: 120, breachAction: 'ESCALATE' },
];

/* ──────────────────────── create ──────────────────────── */

describe('SLAService.create', () => {
  it('creates SLA policy with rules', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sLAPolicy.create.mockResolvedValue({
      id: 'sla_1',
      workspaceId: 'ws_1',
      name: 'Standard SLA',
      rules: SAMPLE_RULES,
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.create({
        name: 'Standard SLA',
        businessHoursId: 'bh_1',
        rules: SAMPLE_RULES,
      });
      expect(result.name).toBe('Standard SLA');
      expect(result.rules).toEqual(SAMPLE_RULES);
    });

    expect(prisma.sLAPolicy.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workspaceId: 'ws_1',
          name: 'Standard SLA',
          businessHoursId: 'bh_1',
          rules: SAMPLE_RULES,
        }),
      }),
    );
  });

  it('sets isDefault and unsets previous default', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sLAPolicy.updateMany.mockResolvedValue({ count: 1 });
    prisma.sLAPolicy.create.mockResolvedValue({
      id: 'sla_2',
      workspaceId: 'ws_1',
      name: 'Default SLA',
      isDefault: true,
      rules: SAMPLE_RULES,
    });

    await tenant.run(ctx(), async () => {
      await svc.create({
        name: 'Default SLA',
        businessHoursId: 'bh_1',
        isDefault: true,
        rules: SAMPLE_RULES,
      });
    });

    expect(prisma.sLAPolicy.updateMany).toHaveBeenCalledWith({
      where: { workspaceId: 'ws_1', isDefault: true },
      data: { isDefault: false },
    });
  });
});

/* ──────────────────────── list ──────────────────────── */

describe('SLAService.list', () => {
  it('returns paginated results', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const items = Array.from({ length: 51 }, (_, i) => ({ id: `sla_${i}` }));
    prisma.sLAPolicy.findMany.mockResolvedValue(items);

    await tenant.run(ctx(), async () => {
      const result = await svc.list({ limit: 50 });
      expect(result.items).toHaveLength(50);
      expect(result.nextCursor).toBe('sla_49');
    });
  });
});

/* ──────────────────────── get ──────────────────────── */

describe('SLAService.get', () => {
  it('returns by id', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sLAPolicy.findUnique.mockResolvedValue({
      id: 'sla_1',
      workspaceId: 'ws_1',
      archivedAt: null,
      businessHours: { id: 'bh_1' },
    });

    await tenant.run(ctx(), async () => {
      const result = await svc.get('sla_1');
      expect(result.id).toBe('sla_1');
    });

    expect(prisma.sLAPolicy.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sla_1' },
        include: { businessHours: true },
      }),
    );
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.sLAPolicy.findUnique.mockResolvedValue({
      id: 'sla_1',
      workspaceId: 'ws_other',
      archivedAt: null,
    });

    await tenant.run(ctx(), async () => {
      await expect(svc.get('sla_1')).rejects.toThrow(NotFoundException);
    });
  });
});

/* ──────────────────────── update ──────────────────────── */

describe('SLAService.update', () => {
  it('updates rules', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const before = { id: 'sla_1', workspaceId: 'ws_1', rules: SAMPLE_RULES };
    const newRules = [{ priority: 'LOW', firstResponseMinutes: 240, resolutionMinutes: 960, breachAction: 'NOTIFY' }];
    prisma.sLAPolicy.findUnique.mockResolvedValue(before);
    prisma.sLAPolicy.update.mockResolvedValue({ ...before, rules: newRules });

    await tenant.run(ctx(), async () => {
      const result = await svc.update('sla_1', { rules: newRules });
      expect(result.rules).toEqual(newRules);
    });

    const updateArgs = prisma.sLAPolicy.update.mock.calls[0][0];
    expect(updateArgs.data.rules).toEqual(newRules);
  });
});

/* ──────────────────────── archive ──────────────────────── */

describe('SLAService.archive', () => {
  it('soft deletes', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.sLAPolicy.findUnique.mockResolvedValue({ id: 'sla_1', workspaceId: 'ws_1' });
    prisma.sLAPolicy.update.mockResolvedValue({ id: 'sla_1', archivedAt: new Date() });

    await tenant.run(ctx(), async () => {
      await svc.archive('sla_1');
    });

    expect(prisma.sLAPolicy.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'SLAPolicy', entityId: 'sla_1', action: 'DELETE' }),
    );
  });
});

/* ──────────────────────── assignSLA ──────────────────────── */

describe('SLAService.assignSLA', () => {
  it('assigns default policy when no queue-specific policy', async () => {
    const { svc, prisma, bhService } = buildSvc();
    prisma.sLAPolicy.findFirst.mockResolvedValue({
      id: 'sla_1',
      businessHoursId: 'bh_1',
      rules: SAMPLE_RULES,
    });
    prisma.ticket.update.mockResolvedValue({});

    await svc.assignSLA({ id: 't_1', workspaceId: 'ws_1', priority: 'HIGH' });

    expect(prisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't_1' },
        data: expect.objectContaining({
          slaPolicyId: 'sla_1',
          slaFirstResponseDue: expect.any(Date),
          slaResolutionDue: expect.any(Date),
        }),
      }),
    );
  });

  it('calculates firstResponseDue using business hours', async () => {
    const { svc, prisma, bhService } = buildSvc();
    prisma.sLAPolicy.findFirst.mockResolvedValue({
      id: 'sla_1',
      businessHoursId: 'bh_1',
      rules: SAMPLE_RULES,
    });
    prisma.ticket.update.mockResolvedValue({});

    await svc.assignSLA({ id: 't_1', workspaceId: 'ws_1', priority: 'HIGH' });

    expect(bhService.calculateDueDate).toHaveBeenCalledWith('bh_1', expect.any(Date), 60);
  });

  it('calculates resolutionDue using business hours', async () => {
    const { svc, prisma, bhService } = buildSvc();
    prisma.sLAPolicy.findFirst.mockResolvedValue({
      id: 'sla_1',
      businessHoursId: 'bh_1',
      rules: SAMPLE_RULES,
    });
    prisma.ticket.update.mockResolvedValue({});

    await svc.assignSLA({ id: 't_1', workspaceId: 'ws_1', priority: 'HIGH' });

    expect(bhService.calculateDueDate).toHaveBeenCalledWith('bh_1', expect.any(Date), 480);
  });

  it('skips when no matching priority rule', async () => {
    const { svc, prisma } = buildSvc();
    prisma.sLAPolicy.findFirst.mockResolvedValue({
      id: 'sla_1',
      businessHoursId: 'bh_1',
      rules: SAMPLE_RULES,
    });

    await svc.assignSLA({ id: 't_1', workspaceId: 'ws_1', priority: 'LOW' });

    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('skips when no policy found', async () => {
    const { svc, prisma } = buildSvc();
    prisma.sLAPolicy.findFirst.mockResolvedValue(null);

    await svc.assignSLA({ id: 't_1', workspaceId: 'ws_1', priority: 'HIGH' });

    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });
});

/* ──────────────────────── checkBreaches ──────────────────────── */

describe('SLAService.checkBreaches', () => {
  const past = new Date('2025-01-01T00:00:00');

  it('marks first response breached', async () => {
    const { svc, prisma } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([
      {
        id: 't_1',
        subject: 'Test',
        priority: 'HIGH',
        assigneeId: 'u_1',
        slaFirstResponseDue: past,
        firstResponseAt: null,
        slaFirstResponseBreached: false,
        slaResolutionDue: new Date('2099-01-01'),
        slaResolutionBreached: false,
        slaPolicy: { rules: SAMPLE_RULES },
      },
    ]);
    prisma.ticket.update.mockResolvedValue({});

    await svc.checkBreaches();

    expect(prisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't_1' },
        data: expect.objectContaining({ slaFirstResponseBreached: true }),
      }),
    );
  });

  it('marks resolution breached', async () => {
    const { svc, prisma } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([
      {
        id: 't_2',
        subject: 'Test 2',
        priority: 'HIGH',
        assigneeId: 'u_1',
        slaFirstResponseDue: new Date('2099-01-01'),
        firstResponseAt: new Date(),
        slaFirstResponseBreached: false,
        slaResolutionDue: past,
        slaResolutionBreached: false,
        slaPolicy: { rules: SAMPLE_RULES },
      },
    ]);
    prisma.ticket.update.mockResolvedValue({});

    await svc.checkBreaches();

    expect(prisma.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't_2' },
        data: expect.objectContaining({ slaResolutionBreached: true }),
      }),
    );
  });

  it('skips already-breached tickets', async () => {
    const { svc, prisma } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([]);

    await svc.checkBreaches();

    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });

  it('triggers NOTIFY breach action', async () => {
    const { svc, prisma, notification } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([
      {
        id: 't_3',
        subject: 'Notify ticket',
        priority: 'HIGH',
        assigneeId: 'u_1',
        slaFirstResponseDue: past,
        firstResponseAt: null,
        slaFirstResponseBreached: false,
        slaResolutionDue: new Date('2099-01-01'),
        slaResolutionBreached: false,
        slaPolicy: { rules: SAMPLE_RULES },
      },
    ]);
    prisma.ticket.update.mockResolvedValue({});

    await svc.checkBreaches();

    expect(notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u_1',
        title: expect.stringContaining('SLA Breach'),
      }),
    );
  });

  it('triggers ESCALATE breach action', async () => {
    const { svc, prisma, notification } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([
      {
        id: 't_4',
        subject: 'Escalate ticket',
        priority: 'URGENT',
        assigneeId: 'u_1',
        slaFirstResponseDue: past,
        firstResponseAt: null,
        slaFirstResponseBreached: false,
        slaResolutionDue: new Date('2099-01-01'),
        slaResolutionBreached: false,
        slaPolicy: { rules: SAMPLE_RULES },
      },
    ]);
    prisma.ticket.update.mockResolvedValue({});

    await svc.checkBreaches();

    expect(notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u_1',
        title: expect.stringContaining('ESCALATION'),
      }),
    );
  });

  it('skips resolved/closed tickets', async () => {
    const { svc, prisma } = buildSvc();
    prisma.ticket.findMany.mockResolvedValue([]);

    await svc.checkBreaches();

    expect(prisma.ticket.update).not.toHaveBeenCalled();
  });
});
