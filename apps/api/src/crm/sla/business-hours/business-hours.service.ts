import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { TenantContextService } from '../../../core/tenant/tenant-context.service';
import { AuditService } from '../../../core/audit/audit.service';
import type { CreateBusinessHoursDto } from './dto/create-business-hours.dto';
import type { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import type { QueryBusinessHoursDto } from './dto/query-business-hours.dto';

interface ScheduleEntry {
  day: number;
  startTime: string;
  endTime: string;
}

interface HolidayEntry {
  date: string;
  name: string;
}

@Injectable()
export class BusinessHoursService {
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

  async create(dto: CreateBusinessHoursDto) {
    const workspaceId = this.requireWs();

    if (dto.isDefault) {
      await this.prisma.businessHours.updateMany({
        where: { workspaceId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const data: any = {
      workspaceId,
      name: dto.name,
      schedule: dto.schedule,
      createdById: this.currentUser()!,
    };
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.holidays !== undefined) data.holidays = dto.holidays;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

    const bh = await this.prisma.businessHours.create({ data });

    await this.audit.log({
      entityType: 'BusinessHours',
      entityId: bh.id,
      action: 'CREATE',
      newValue: { name: dto.name },
    });

    return bh;
  }

  async list(q: QueryBusinessHoursDto) {
    const workspaceId = this.requireWs();
    const limit = Math.min(q.limit ?? 50, 200);
    const where: any = { workspaceId, archivedAt: null };

    const items = await this.prisma.businessHours.findMany({
      where: q.cursor ? { ...where, id: { lt: q.cursor } } : where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = items.length > limit;
    const trimmed = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.id ?? null : null;
    return { items: trimmed, nextCursor };
  }

  async get(id: string) {
    const workspaceId = this.requireWs();
    const bh = await this.prisma.businessHours.findUnique({ where: { id } });
    if (!bh || bh.workspaceId !== workspaceId || bh.archivedAt) {
      throw new NotFoundException();
    }
    return bh;
  }

  async update(id: string, dto: UpdateBusinessHoursDto) {
    const workspaceId = this.requireWs();
    const before = await this.prisma.businessHours.findUnique({ where: { id } });
    if (!before || before.workspaceId !== workspaceId) throw new NotFoundException();

    if (dto.isDefault) {
      await this.prisma.businessHours.updateMany({
        where: { workspaceId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.timezone !== undefined) data.timezone = dto.timezone;
    if (dto.schedule !== undefined) data.schedule = dto.schedule;
    if (dto.holidays !== undefined) data.holidays = dto.holidays;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;

    const updated = await this.prisma.businessHours.update({ where: { id }, data });
    await this.audit.logUpdate('BusinessHours', id, before as any, data);
    return updated;
  }

  async archive(id: string) {
    const workspaceId = this.requireWs();
    const bh = await this.prisma.businessHours.findUnique({ where: { id } });
    if (!bh || bh.workspaceId !== workspaceId) throw new NotFoundException();

    const activePolicy = await this.prisma.sLAPolicy.findFirst({
      where: { businessHoursId: id, archivedAt: null },
    });
    if (activePolicy) {
      throw new BadRequestException('Business hours used by active SLA policy');
    }

    const archived = await this.prisma.businessHours.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'BusinessHours',
      entityId: id,
      action: 'DELETE',
    });

    return archived;
  }

  async isWithinBusinessHours(businessHoursId: string, date: Date): Promise<boolean> {
    const bh = await this.prisma.businessHours.findUnique({ where: { id: businessHoursId } });
    if (!bh) throw new NotFoundException();

    const schedule: ScheduleEntry[] = bh.schedule as any;
    const holidays: HolidayEntry[] = (bh.holidays as any) ?? [];

    const dateStr = this.formatDateStr(date);
    if (holidays.some((h) => h.date === dateStr)) return false;

    const dayOfWeek = date.getDay();
    const entry = schedule.find((s) => s.day === dayOfWeek);
    if (!entry) return false;

    const timeMinutes = date.getHours() * 60 + date.getMinutes();
    const startMinutes = this.parseTime(entry.startTime);
    const endMinutes = this.parseTime(entry.endTime);

    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
  }

  async calculateDueDate(businessHoursId: string, startDate: Date, minutes: number): Promise<Date> {
    const bh = await this.prisma.businessHours.findUnique({ where: { id: businessHoursId } });
    if (!bh) throw new NotFoundException();

    const schedule: ScheduleEntry[] = bh.schedule as any;
    const holidays: HolidayEntry[] = (bh.holidays as any) ?? [];

    let remaining = minutes;
    let current = new Date(startDate.getTime());

    // Advance to next business time if outside hours
    current = this.advanceToBusinessHours(current, schedule, holidays);

    while (remaining > 0) {
      const dayOfWeek = current.getDay();
      const entry = schedule.find((s) => s.day === dayOfWeek);

      if (!entry || holidays.some((h) => h.date === this.formatDateStr(current))) {
        current = this.advanceToNextDay(current, schedule, holidays);
        continue;
      }

      const endMinutes = this.parseTime(entry.endTime);
      const currentMinutes = current.getHours() * 60 + current.getMinutes();
      const minutesLeftToday = endMinutes - currentMinutes;

      if (remaining <= minutesLeftToday) {
        current = new Date(current.getTime() + remaining * 60_000);
        remaining = 0;
      } else {
        remaining -= minutesLeftToday;
        current = this.advanceToNextDay(current, schedule, holidays);
      }
    }

    return current;
  }

  private advanceToBusinessHours(date: Date, schedule: ScheduleEntry[], holidays: HolidayEntry[]): Date {
    let current = new Date(date.getTime());
    // safety limit to prevent infinite loop
    for (let i = 0; i < 365; i++) {
      const dayOfWeek = current.getDay();
      const dateStr = this.formatDateStr(current);
      const entry = schedule.find((s) => s.day === dayOfWeek);

      if (!entry || holidays.some((h) => h.date === dateStr)) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }

      const startMinutes = this.parseTime(entry.startTime);
      const endMinutes = this.parseTime(entry.endTime);
      const currentMinutes = current.getHours() * 60 + current.getMinutes();

      if (currentMinutes < startMinutes) {
        current.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
        return current;
      }

      if (currentMinutes >= endMinutes) {
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        continue;
      }

      return current;
    }
    return current;
  }

  private advanceToNextDay(current: Date, schedule: ScheduleEntry[], holidays: HolidayEntry[]): Date {
    const next = new Date(current.getTime());
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return this.advanceToBusinessHours(next, schedule, holidays);
  }

  private parseTime(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }

  private formatDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
