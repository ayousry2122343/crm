import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { GenerateForecastDto } from './dto/generate-forecast.dto';
import type { UpdateForecastEntryDto } from './dto/update-forecast-entry.dto';
import type { ForecastCategory, ForecastPeriodType } from '@prisma/client';

@Injectable()
export class ForecastService {
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

  private deriveForecastCategory(deal: {
    status: string;
    probability: number | null;
    forecastCategory: ForecastCategory | null;
  }): ForecastCategory {
    if (deal.forecastCategory) return deal.forecastCategory;
    if (deal.status === 'WON') return 'CLOSED_WON';
    const prob = deal.probability ?? 0;
    if (prob === 0 || prob === null) return 'OMITTED';
    if (prob >= 90) return 'COMMIT';
    if (prob >= 60) return 'BEST_CASE';
    return 'PIPELINE';
  }

  private parsePeriodDates(
    periodType: string,
    date: string,
  ): { startDate: Date; endDate: Date } {
    if (periodType === 'QUARTERLY') {
      const match = date.match(/^(\d{4})-Q([1-4])$/);
      if (!match) throw new BadRequestException('Invalid quarter format, use YYYY-QN');
      const year = parseInt(match[1], 10);
      const quarter = parseInt(match[2], 10);
      const startMonth = (quarter - 1) * 3;
      const startDate = new Date(year, startMonth, 1);
      const endDate = new Date(year, startMonth + 3, 0);
      return { startDate, endDate };
    }
    const match = date.match(/^(\d{4})-(\d{2})$/);
    if (!match) throw new BadRequestException('Invalid month format, use YYYY-MM');
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    return { startDate, endDate };
  }

  async generateForecast(dto: GenerateForecastDto) {
    const workspaceId = this.requireWs();
    const userId = this.currentUser()!;
    const periodType = dto.periodType as ForecastPeriodType;
    const { startDate, endDate } = this.parsePeriodDates(dto.periodType, dto.date);

    let period = await this.prisma.forecastPeriod.findFirst({
      where: { workspaceId, periodType, startDate },
    });

    if (!period) {
      period = await this.prisma.forecastPeriod.create({
        data: {
          workspaceId,
          periodType,
          startDate,
          endDate,
          createdById: userId,
        },
      });

      await this.audit.log({
        entityType: 'ForecastPeriod',
        entityId: period.id,
        action: 'CREATE',
        newValue: { periodType, startDate, endDate },
      });
    }

    const dealWhere: any = {
      workspaceId,
      status: { in: ['OPEN', 'WON'] },
      expectedCloseDate: { gte: startDate, lte: endDate },
    };
    if (dto.pipelineId) dealWhere.pipelineId = dto.pipelineId;

    const deals = await this.prisma.deal.findMany({
      where: dealWhere,
      select: {
        id: true,
        ownerId: true,
        pipelineId: true,
        amount: true,
        status: true,
        probability: true,
        forecastCategory: true,
      },
    });

    const entryMap = new Map<string, { userId: string; pipelineId: string; category: ForecastCategory; amount: number }>();

    for (const deal of deals) {
      if (!deal.ownerId) continue;
      const category = this.deriveForecastCategory(deal);
      if (category === 'OMITTED') continue;
      const key = `${deal.ownerId}|${deal.pipelineId}|${category}`;
      const existing = entryMap.get(key);
      const amt = typeof deal.amount === 'object' && deal.amount !== null && 'toNumber' in deal.amount
        ? (deal.amount as any).toNumber()
        : Number(deal.amount);
      if (existing) {
        existing.amount += amt;
      } else {
        entryMap.set(key, {
          userId: deal.ownerId,
          pipelineId: deal.pipelineId,
          category,
          amount: amt,
        });
      }
    }

    await this.prisma.forecastEntry.deleteMany({
      where: { forecastPeriodId: period.id },
    });

    const entries = Array.from(entryMap.values());
    if (entries.length > 0) {
      await this.prisma.forecastEntry.createMany({
        data: entries.map((e) => ({
          forecastPeriodId: period!.id,
          userId: e.userId,
          pipelineId: e.pipelineId,
          category: e.category,
          amount: e.amount,
        })),
      });
    }

    return this.prisma.forecastPeriod.findUnique({
      where: { id: period.id },
      include: {
        entries: { include: { user: true, pipeline: true } },
      },
    });
  }

  async getByPeriod(periodType: string, date: string) {
    const workspaceId = this.requireWs();
    const { startDate } = this.parsePeriodDates(periodType, date);

    const period = await this.prisma.forecastPeriod.findFirst({
      where: { workspaceId, periodType: periodType as ForecastPeriodType, startDate },
      include: {
        entries: { include: { user: true, pipeline: true } },
      },
    });

    if (!period) throw new NotFoundException();
    return period;
  }

  async updateEntry(entryId: string, dto: UpdateForecastEntryDto) {
    const workspaceId = this.requireWs();

    const entry = await this.prisma.forecastEntry.findUnique({
      where: { id: entryId },
      include: { forecastPeriod: true },
    });

    if (!entry || entry.forecastPeriod.workspaceId !== workspaceId) {
      throw new NotFoundException();
    }

    const updated = await this.prisma.forecastEntry.update({
      where: { id: entryId },
      data: {
        adjustedAmount: dto.adjustedAmount,
        note: dto.note,
      },
    });

    await this.audit.log({
      entityType: 'ForecastEntry',
      entityId: entryId,
      action: 'UPDATE',
      newValue: { adjustedAmount: dto.adjustedAmount, note: dto.note },
    });

    return updated;
  }

  async takeSnapshot(periodId: string) {
    const workspaceId = this.requireWs();

    const period = await this.prisma.forecastPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period || period.workspaceId !== workspaceId) {
      throw new NotFoundException();
    }

    const entries = await this.prisma.forecastEntry.findMany({
      where: { forecastPeriodId: periodId },
    });

    return this.prisma.forecastSnapshot.create({
      data: {
        forecastPeriodId: periodId,
        snapshotDate: new Date(),
        data: entries as any,
      },
    });
  }

  async getSnapshots(periodId: string) {
    const workspaceId = this.requireWs();

    const period = await this.prisma.forecastPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period || period.workspaceId !== workspaceId) {
      throw new NotFoundException();
    }

    return this.prisma.forecastSnapshot.findMany({
      where: { forecastPeriodId: periodId },
      orderBy: { snapshotDate: 'desc' },
    });
  }
}
