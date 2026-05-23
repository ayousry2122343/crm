import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BusinessHoursService } from './business-hours.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';

const STD_SCHEDULE = [
  { day: 0, startTime: '09:00', endTime: '17:00' },
  { day: 1, startTime: '09:00', endTime: '17:00' },
  { day: 2, startTime: '09:00', endTime: '17:00' },
  { day: 3, startTime: '09:00', endTime: '17:00' },
  { day: 4, startTime: '09:00', endTime: '17:00' },
];

function makePrisma() {
  return {
    businessHours: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    sLAPolicy: {
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

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const svc = new BusinessHoursService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

function makeBhRecord(overrides: any = {}) {
  return {
    id: 'bh_1',
    workspaceId: 'ws_1',
    name: 'Default Hours',
    timezone: 'Asia/Riyadh',
    schedule: STD_SCHEDULE,
    holidays: [],
    isDefault: false,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 'u_1',
    ...overrides,
  };
}

/* ──────────────────────── create ──────────────────────── */

describe('BusinessHoursService.create', () => {
  it('creates business hours with default timezone', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.create.mockResolvedValue(makeBhRecord());

    await tenant.run(ctx(), async () => {
      const result = await svc.create({ name: 'Default Hours', schedule: STD_SCHEDULE });
      expect(result.name).toBe('Default Hours');
    });

    const createArgs = prisma.businessHours.create.mock.calls[0][0];
    expect(createArgs.data.workspaceId).toBe('ws_1');
    expect(createArgs.data.name).toBe('Default Hours');
    expect(createArgs.data.schedule).toEqual(STD_SCHEDULE);
  });

  it('sets isDefault and unsets previous default', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.updateMany.mockResolvedValue({ count: 1 });
    prisma.businessHours.create.mockResolvedValue(makeBhRecord({ isDefault: true }));

    await tenant.run(ctx(), async () => {
      await svc.create({ name: 'Default Hours', schedule: STD_SCHEDULE, isDefault: true });
    });

    expect(prisma.businessHours.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: 'ws_1', isDefault: true },
        data: { isDefault: false },
      }),
    );
    const createArgs = prisma.businessHours.create.mock.calls[0][0];
    expect(createArgs.data.isDefault).toBe(true);
  });
});

/* ──────────────────────── list ──────────────────────── */

describe('BusinessHoursService.list', () => {
  it('returns paginated results', async () => {
    const { svc, tenant, prisma } = buildSvc();
    const items = Array.from({ length: 51 }, (_, i) => ({ id: `bh_${i}` }));
    prisma.businessHours.findMany.mockResolvedValue(items);

    await tenant.run(ctx(), async () => {
      const result = await svc.list({ limit: 50 });
      expect(result.items).toHaveLength(50);
      expect(result.nextCursor).toBe('bh_49');
    });
  });
});

/* ──────────────────────── get ──────────────────────── */

describe('BusinessHoursService.get', () => {
  it('returns by id', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.findUnique.mockResolvedValue(makeBhRecord());

    await tenant.run(ctx(), async () => {
      const result = await svc.get('bh_1');
      expect(result.id).toBe('bh_1');
    });
  });

  it('throws NotFoundException for wrong workspace', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.findUnique.mockResolvedValue(makeBhRecord({ workspaceId: 'ws_other' }));

    await tenant.run(ctx(), async () => {
      await expect(svc.get('bh_1')).rejects.toThrow(NotFoundException);
    });
  });
});

/* ──────────────────────── update ──────────────────────── */

describe('BusinessHoursService.update', () => {
  it('updates name and schedule', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    const before = makeBhRecord();
    prisma.businessHours.findUnique.mockResolvedValue(before);
    prisma.businessHours.update.mockResolvedValue({ ...before, name: 'Updated' });

    await tenant.run(ctx(), async () => {
      const result = await svc.update('bh_1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    expect(prisma.businessHours.update).toHaveBeenCalled();
    expect(audit.logUpdate).toHaveBeenCalledWith('BusinessHours', 'bh_1', expect.anything(), expect.anything());
  });
});

/* ──────────────────────── archive ──────────────────────── */

describe('BusinessHoursService.archive', () => {
  it('soft deletes', async () => {
    const { svc, tenant, prisma, audit } = buildSvc();
    prisma.businessHours.findUnique.mockResolvedValue(makeBhRecord());
    prisma.sLAPolicy.findFirst.mockResolvedValue(null);
    prisma.businessHours.update.mockResolvedValue(makeBhRecord({ archivedAt: new Date() }));

    await tenant.run(ctx(), async () => {
      await svc.archive('bh_1');
    });

    expect(prisma.businessHours.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ archivedAt: expect.any(Date) }),
      }),
    );
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'BusinessHours', entityId: 'bh_1', action: 'DELETE' }),
    );
  });

  it('throws if used by active SLA policy', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.findUnique.mockResolvedValue(makeBhRecord());
    prisma.sLAPolicy.findFirst.mockResolvedValue({ id: 'sla_1', archivedAt: null });

    await tenant.run(ctx(), async () => {
      await expect(svc.archive('bh_1')).rejects.toThrow(BadRequestException);
    });
  });
});

/* ──────────────────────── isWithinBusinessHours ──────────────────────── */

describe('BusinessHoursService.isWithinBusinessHours', () => {
  it('returns true during work hours', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.findUnique.mockResolvedValue(makeBhRecord());

    await tenant.run(ctx(), async () => {
      // Sunday Jan 4 2026 10:00 — day 0 is in schedule, 10:00 within 09:00-17:00
      const result = await svc.isWithinBusinessHours('bh_1', new Date('2026-01-04T10:00:00'));
      expect(result).toBe(true);
    });
  });

  it('returns false outside work hours', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.findUnique.mockResolvedValue(makeBhRecord());

    await tenant.run(ctx(), async () => {
      // Sunday Jan 4 2026 20:00 — after 17:00
      const result = await svc.isWithinBusinessHours('bh_1', new Date('2026-01-04T20:00:00'));
      expect(result).toBe(false);
    });
  });

  it('returns false on holidays', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.findUnique.mockResolvedValue(
      makeBhRecord({ holidays: [{ date: '2026-01-04', name: 'Holiday' }] }),
    );

    await tenant.run(ctx(), async () => {
      // Sunday Jan 4 2026 10:00 — it IS a working day but also a holiday
      const result = await svc.isWithinBusinessHours('bh_1', new Date('2026-01-04T10:00:00'));
      expect(result).toBe(false);
    });
  });
});

/* ──────────────────────── calculateDueDate ──────────────────────── */

describe('BusinessHoursService.calculateDueDate', () => {
  it('same-day resolution (within business hours)', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.findUnique.mockResolvedValue(makeBhRecord());

    await tenant.run(ctx(), async () => {
      // Sunday Jan 4 2026 10:00 + 60 minutes = 11:00
      const result = await svc.calculateDueDate('bh_1', new Date('2026-01-04T10:00:00'), 60);
      expect(result.getHours()).toBe(11);
      expect(result.getMinutes()).toBe(0);
      expect(result.getDate()).toBe(4);
    });
  });

  it('spans to next business day', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.findUnique.mockResolvedValue(makeBhRecord());

    await tenant.run(ctx(), async () => {
      // Sunday Jan 4 2026 16:30 + 60 min
      // 30 min left today (16:30 → 17:00), 30 min carry to Monday Jan 5 → 09:30
      const result = await svc.calculateDueDate('bh_1', new Date('2026-01-04T16:30:00'), 60);
      expect(result.getDate()).toBe(5); // Jan 5 = Monday
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(30);
    });
  });

  it('skips weekends (non-scheduled days)', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.findUnique.mockResolvedValue(makeBhRecord());

    await tenant.run(ctx(), async () => {
      // Thursday Jan 8 2026 16:30 + 60 min
      // 30 min left today (16:30 → 17:00), Fri (5) + Sat (6) are off
      // Next business day is Sunday Jan 11 (day 0) → 09:00 + 30 = 09:30
      const result = await svc.calculateDueDate('bh_1', new Date('2026-01-08T16:30:00'), 60);
      expect(result.getDate()).toBe(11); // Jan 11 = Sunday
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(30);
    });
  });

  it('skips holidays', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.findUnique.mockResolvedValue(
      makeBhRecord({ holidays: [{ date: '2026-01-05', name: 'Holiday' }] }),
    );

    await tenant.run(ctx(), async () => {
      // Sunday Jan 4 2026 16:30 + 60 min
      // 30 min left today. Next day Mon Jan 5 is a holiday → skip to Tue Jan 6 09:00 + 30 = 09:30
      const result = await svc.calculateDueDate('bh_1', new Date('2026-01-04T16:30:00'), 60);
      expect(result.getDate()).toBe(6); // Jan 6 = Tuesday
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(30);
    });
  });

  it('starts from next business day if created outside hours', async () => {
    const { svc, tenant, prisma } = buildSvc();
    prisma.businessHours.findUnique.mockResolvedValue(makeBhRecord());

    await tenant.run(ctx(), async () => {
      // Sunday Jan 4 2026 20:00 (after hours) + 60 min
      // Should advance to Mon Jan 5 09:00 → 09:00 + 60 = 10:00
      const result = await svc.calculateDueDate('bh_1', new Date('2026-01-04T20:00:00'), 60);
      expect(result.getDate()).toBe(5); // Jan 5 = Monday
      expect(result.getHours()).toBe(10);
      expect(result.getMinutes()).toBe(0);
    });
  });
});
