import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IStandardReport, FilterDef, ReportResult } from '../report.interface';

@Injectable()
export class ActivitiesByOwnerReport implements IStandardReport {
  id = 'activities-by-owner';
  labelAr = 'الأنشطة حسب المالك';
  labelEn = 'Activities by Owner';
  acceptedFilters: FilterDef[] = [
    { key: 'from', labelAr: 'من تاريخ', labelEn: 'From date', type: 'date' },
    { key: 'to', labelAr: 'إلى تاريخ', labelEn: 'To date', type: 'date' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async run(workspaceId: string, filters: Record<string, unknown>): Promise<ReportResult> {
    const where: Record<string, unknown> = { workspaceId };
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) (where.createdAt as any).gte = new Date(filters.from as string);
      if (filters.to) (where.createdAt as any).lte = new Date(filters.to as string);
    }

    const activities = await this.prisma.activity.findMany({
      where,
      select: { ownerId: true, owner: { select: { fullName: true } }, type: true },
    });

    const ownerMap = new Map<string, { ownerName: string; byType: Record<string, number>; total: number }>();

    for (const a of activities) {
      const key = a.ownerId;
      const existing = ownerMap.get(key);
      if (existing) {
        existing.byType[a.type] = (existing.byType[a.type] ?? 0) + 1;
        existing.total++;
      } else {
        ownerMap.set(key, {
          ownerName: a.owner.fullName,
          byType: { [a.type]: 1 },
          total: 1,
        });
      }
    }

    const rows = Array.from(ownerMap.entries())
      .map(([ownerId, v]) => ({ ownerId, ownerName: v.ownerName, ...v.byType, total: v.total }))
      .sort((a, b) => b.total - a.total);

    return {
      rows,
      summary: { totalActivities: activities.length, owners: rows.length },
    };
  }
}
