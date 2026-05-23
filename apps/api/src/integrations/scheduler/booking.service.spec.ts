import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingService } from './booking.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    bookingPage: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    calendarEvent: {
      findMany: jest.fn(),
    },
    person: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    activity: {
      create: jest.fn(),
    },
  };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const svc = new BookingService(prisma as any, tenant, audit as any);
  return { svc, tenant, prisma, audit };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('BookingService.getAvailableSlots', () => {
  it('returns slots based on availability schedule', async () => {
    const { svc, prisma } = buildSvc();
    prisma.bookingPage.findUnique.mockResolvedValue({
      id: 'bp_1',
      workspaceId: 'ws_1',
      userId: 'u_1',
      duration: 30,
      availability: {
        mon: [{ start: '09:00', end: '12:00' }],
        tue: [{ start: '09:00', end: '12:00' }],
        wed: [{ start: '09:00', end: '12:00' }],
        thu: [{ start: '09:00', end: '12:00' }],
        fri: [{ start: '09:00', end: '12:00' }],
      },
      timezone: 'Africa/Cairo',
      bufferBefore: 0,
      bufferAfter: 0,
      maxPerDay: null,
    });
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.calendarEvent.findMany.mockResolvedValue([]);

    const slots = await svc.getAvailableSlots('bp_1', '2026-06-02');
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]).toHaveProperty('start');
    expect(slots[0]).toHaveProperty('end');
  });

  it('excludes slots that overlap existing bookings', async () => {
    const { svc, prisma } = buildSvc();
    prisma.bookingPage.findUnique.mockResolvedValue({
      id: 'bp_1',
      workspaceId: 'ws_1',
      userId: 'u_1',
      duration: 30,
      availability: {
        mon: [{ start: '09:00', end: '10:00' }],
      },
      timezone: 'UTC',
      bufferBefore: 0,
      bufferAfter: 0,
      maxPerDay: null,
    });
    prisma.booking.findMany.mockResolvedValue([
      {
        startAt: new Date('2026-06-01T09:00:00Z'),
        endAt: new Date('2026-06-01T09:30:00Z'),
        status: 'CONFIRMED',
      },
    ]);
    prisma.calendarEvent.findMany.mockResolvedValue([]);

    const slots = await svc.getAvailableSlots('bp_1', '2026-06-01');
    const nineAM = slots.find((s: any) => s.start.includes('09:00'));
    expect(nineAM).toBeUndefined();
  });

  it('respects maxPerDay limit', async () => {
    const { svc, prisma } = buildSvc();
    prisma.bookingPage.findUnique.mockResolvedValue({
      id: 'bp_1',
      workspaceId: 'ws_1',
      userId: 'u_1',
      duration: 30,
      availability: {
        mon: [{ start: '09:00', end: '17:00' }],
      },
      timezone: 'UTC',
      bufferBefore: 0,
      bufferAfter: 0,
      maxPerDay: 2,
    });
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.count.mockResolvedValue(2);
    prisma.calendarEvent.findMany.mockResolvedValue([]);

    const slots = await svc.getAvailableSlots('bp_1', '2026-06-01');
    expect(slots).toHaveLength(0);
  });
});

describe('BookingService.createBooking', () => {
  it('creates booking + person + activity', async () => {
    const { svc, prisma, audit } = buildSvc();
    prisma.bookingPage.findUnique.mockResolvedValue({
      id: 'bp_1',
      workspaceId: 'ws_1',
      userId: 'u_1',
      slug: 'discovery-call',
      duration: 30,
      availability: { mon: [{ start: '09:00', end: '17:00' }] },
      timezone: 'UTC',
      bufferBefore: 0,
      bufferAfter: 0,
      maxPerDay: null,
      confirmationEmail: true,
    });
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.count.mockResolvedValue(0);
    prisma.calendarEvent.findMany.mockResolvedValue([]);
    prisma.person.findFirst.mockResolvedValue(null);
    prisma.person.create.mockResolvedValue({ id: 'p_new' });
    prisma.activity.create.mockResolvedValue({ id: 'act_new' });
    prisma.booking.create.mockResolvedValue({
      id: 'bk_1',
      status: 'CONFIRMED',
      guestName: 'Sara Ali',
      guestEmail: 'sara@test.com',
      startAt: new Date('2026-06-01T09:00:00Z'),
      endAt: new Date('2026-06-01T09:30:00Z'),
      personId: 'p_new',
      cancelToken: 'tok_abc',
    });

    const result = await svc.createBooking('discovery-call', {
      guestName: 'Sara Ali',
      guestEmail: 'sara@test.com',
      startAt: '2026-06-01T09:00:00Z',
    });

    expect(result.status).toBe('CONFIRMED');
    expect(result.guestName).toBe('Sara Ali');
    expect(prisma.person.create).toHaveBeenCalled();
    expect(prisma.activity.create).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Booking',
        action: 'CREATE',
      }),
    );
  });

  it('links existing person by email instead of creating new', async () => {
    const { svc, prisma } = buildSvc();
    prisma.bookingPage.findUnique.mockResolvedValue({
      id: 'bp_1',
      workspaceId: 'ws_1',
      userId: 'u_1',
      slug: 'call',
      duration: 30,
      availability: { mon: [{ start: '09:00', end: '17:00' }] },
      timezone: 'UTC',
      bufferBefore: 0,
      bufferAfter: 0,
      maxPerDay: null,
    });
    prisma.booking.findMany.mockResolvedValue([]);
    prisma.booking.count.mockResolvedValue(0);
    prisma.calendarEvent.findMany.mockResolvedValue([]);
    prisma.person.findFirst.mockResolvedValue({ id: 'p_existing', email: 'sara@test.com' });
    prisma.activity.create.mockResolvedValue({ id: 'act_1' });
    prisma.booking.create.mockResolvedValue({
      id: 'bk_2',
      status: 'CONFIRMED',
      personId: 'p_existing',
      cancelToken: 'tok_def',
    });

    const result = await svc.createBooking('call', {
      guestName: 'Sara Ali',
      guestEmail: 'sara@test.com',
      startAt: '2026-06-01T10:00:00Z',
    });

    expect(result.personId).toBe('p_existing');
    expect(prisma.person.create).not.toHaveBeenCalled();
  });
});

describe('BookingService.cancelBooking', () => {
  it('cancels booking by cancel token', async () => {
    const { svc, prisma, audit } = buildSvc();
    prisma.booking.findFirst.mockResolvedValue({
      id: 'bk_1',
      status: 'CONFIRMED',
      cancelToken: 'tok_abc',
    });
    prisma.booking.update.mockResolvedValue({
      id: 'bk_1',
      status: 'CANCELED',
      canceledAt: new Date(),
    });

    const result = await svc.cancelBooking('tok_abc');
    expect(result.status).toBe('CANCELED');

    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'Booking',
        action: 'UPDATE',
        fieldKey: 'status',
        newValue: 'CANCELED',
      }),
    );
  });

  it('throws NotFoundException for invalid token', async () => {
    const { svc, prisma } = buildSvc();
    prisma.booking.findFirst.mockResolvedValue(null);

    await expect(svc.cancelBooking('tok_invalid')).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException if already canceled', async () => {
    const { svc, prisma } = buildSvc();
    prisma.booking.findFirst.mockResolvedValue({
      id: 'bk_1',
      status: 'CANCELED',
      cancelToken: 'tok_abc',
    });

    await expect(svc.cancelBooking('tok_abc')).rejects.toThrow(BadRequestException);
  });
});
