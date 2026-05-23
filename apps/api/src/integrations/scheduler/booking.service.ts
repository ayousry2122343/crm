import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  private currentUser(): string | undefined {
    return this.tenant.getStore()?.userId;
  }

  async getAvailableSlots(pageIdOrSlug: string, dateStr: string) {
    const page = await this.prisma.bookingPage.findUnique({
      where: pageIdOrSlug.startsWith('cl') ? { id: pageIdOrSlug } : { slug: pageIdOrSlug },
    });
    if (!page) throw new NotFoundException('Booking page not found');

    if (page.maxPerDay) {
      const dayStart = new Date(dateStr);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(dateStr);
      dayEnd.setUTCHours(23, 59, 59, 999);

      const existingCount = await this.prisma.booking.count({
        where: {
          bookingPageId: page.id,
          startAt: { gte: dayStart, lte: dayEnd },
          status: { in: ['CONFIRMED', 'RESCHEDULED'] },
        },
      });
      if (existingCount >= page.maxPerDay) return [];
    }

    const date = new Date(dateStr);
    const dayName = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][date.getUTCDay()];
    const availability = (page.availability as any)?.[dayName!] as Array<{ start: string; end: string }> | undefined;
    if (!availability || availability.length === 0) return [];

    const existingBookings = await this.prisma.booking.findMany({
      where: {
        bookingPageId: page.id,
        startAt: {
          gte: new Date(dateStr + 'T00:00:00Z'),
          lt: new Date(dateStr + 'T23:59:59Z'),
        },
        status: { in: ['CONFIRMED', 'RESCHEDULED'] },
      },
    });

    const busyEvents = await this.prisma.calendarEvent.findMany({
      where: {
        workspaceId: page.workspaceId,
        startAt: {
          gte: new Date(dateStr + 'T00:00:00Z'),
          lt: new Date(dateStr + 'T23:59:59Z'),
        },
      },
    });

    const slots: Array<{ start: string; end: string }> = [];

    for (const window of availability) {
      const [startH, startM] = window.start.split(':').map(Number);
      const [endH, endM] = window.end.split(':').map(Number);

      let current = new Date(date);
      current.setUTCHours(startH!, startM!, 0, 0);
      const windowEnd = new Date(date);
      windowEnd.setUTCHours(endH!, endM!, 0, 0);

      while (current.getTime() + page.duration * 60_000 <= windowEnd.getTime()) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current.getTime() + page.duration * 60_000);

        const bufferedStart = new Date(slotStart.getTime() - page.bufferBefore * 60_000);
        const bufferedEnd = new Date(slotEnd.getTime() + page.bufferAfter * 60_000);

        const isBookingConflict = existingBookings.some(
          (b: any) => new Date(b.startAt) < bufferedEnd && new Date(b.endAt) > bufferedStart,
        );
        const isCalendarConflict = busyEvents.some(
          (e: any) => new Date(e.startAt) < bufferedEnd && new Date(e.endAt) > bufferedStart,
        );

        if (!isBookingConflict && !isCalendarConflict) {
          slots.push({
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }

        current = new Date(current.getTime() + page.duration * 60_000);
      }
    }

    return slots;
  }

  async createBooking(slug: string, dto: CreateBookingDto) {
    const page = await this.prisma.bookingPage.findUnique({
      where: { slug },
    });
    if (!page) throw new NotFoundException('Booking page not found');

    let person = await this.prisma.person.findFirst({
      where: {
        workspaceId: page.workspaceId,
        emailNormalized: dto.guestEmail.toLowerCase(),
      },
    });

    if (!person) {
      person = await this.prisma.person.create({
        data: {
          workspaceId: page.workspaceId,
          fullName: dto.guestName,
          email: dto.guestEmail,
          emailNormalized: dto.guestEmail.toLowerCase(),
          phone: dto.guestPhone,
          phoneNormalized: dto.guestPhone?.replace(/[^+\d]/g, '') ?? null,
          source: 'booking',
        },
      });
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(startAt.getTime() + page.duration * 60_000);
    const cancelToken = crypto.randomBytes(24).toString('hex');

    const activity = await this.prisma.activity.create({
      data: {
        workspaceId: page.workspaceId,
        type: 'MEETING',
        subject: `${page.title} with ${dto.guestName}`,
        startAt,
        endAt,
        ownerId: page.userId,
        personId: person.id,
        createdById: page.userId,
      },
    });

    const booking = await this.prisma.booking.create({
      data: {
        workspaceId: page.workspaceId,
        bookingPageId: page.id,
        hostUserId: page.userId,
        guestName: dto.guestName,
        guestEmail: dto.guestEmail,
        guestPhone: dto.guestPhone,
        startAt,
        endAt,
        status: 'CONFIRMED',
        activityId: activity.id,
        personId: person.id,
        notes: dto.notes,
        cancelToken,
      },
    });

    await this.audit.log({
      entityType: 'Booking',
      entityId: booking.id,
      action: 'CREATE',
      newValue: { guestName: dto.guestName, startAt: dto.startAt },
    });

    return booking;
  }

  async cancelBooking(cancelToken: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { cancelToken },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status === 'CANCELED') {
      throw new BadRequestException('Booking already canceled');
    }

    const updated = await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });

    await this.audit.log({
      entityType: 'Booking',
      entityId: booking.id,
      action: 'UPDATE',
      fieldKey: 'status',
      oldValue: booking.status,
      newValue: 'CANCELED',
    });

    return updated;
  }

  async rescheduleBooking(cancelToken: string, newStartAt: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { cancelToken },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'CONFIRMED') {
      throw new BadRequestException('Only confirmed bookings can be rescheduled');
    }

    const page = await this.prisma.bookingPage.findUnique({
      where: { id: booking.bookingPageId },
    });
    if (!page) throw new NotFoundException();

    const newStart = new Date(newStartAt);
    const newEnd = new Date(newStart.getTime() + page.duration * 60_000);
    const newCancelToken = crypto.randomBytes(24).toString('hex');

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'RESCHEDULED' },
    });

    const newBooking = await this.prisma.booking.create({
      data: {
        workspaceId: page.workspaceId,
        bookingPageId: page.id,
        hostUserId: booking.hostUserId,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        startAt: newStart,
        endAt: newEnd,
        status: 'CONFIRMED',
        personId: booking.personId,
        notes: booking.notes,
        cancelToken: newCancelToken,
      },
    });

    await this.audit.log({
      entityType: 'Booking',
      entityId: newBooking.id,
      action: 'CREATE',
      newValue: { rescheduledFrom: booking.id },
    });

    return newBooking;
  }

  async createPage(dto: any) {
    const workspaceId = this.requireWs();
    const page = await this.prisma.bookingPage.create({
      data: {
        workspaceId,
        userId: this.currentUser()!,
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        availability: dto.availability,
        timezone: dto.timezone ?? 'Africa/Cairo',
        bufferBefore: dto.bufferBefore ?? 0,
        bufferAfter: dto.bufferAfter ?? 0,
        maxPerDay: dto.maxPerDay,
        queueId: dto.queueId,
        reminderMinutes: dto.reminderMinutes ?? [60, 1440],
        createdById: this.currentUser()!,
      },
    });

    await this.audit.log({
      entityType: 'BookingPage',
      entityId: page.id,
      action: 'CREATE',
      newValue: { slug: dto.slug, title: dto.title },
    });

    return page;
  }

  async listPages() {
    const workspaceId = this.requireWs();
    return this.prisma.bookingPage.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPageBySlug(slug: string) {
    const page = await this.prisma.bookingPage.findUnique({ where: { slug } });
    if (!page || !page.isActive) throw new NotFoundException();
    return {
      slug: page.slug,
      title: page.title,
      description: page.description,
      duration: page.duration,
      timezone: page.timezone,
      brandingOverride: page.brandingOverride,
    };
  }
}
