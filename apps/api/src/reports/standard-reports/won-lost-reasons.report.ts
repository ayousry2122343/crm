import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IStandardReport, FilterDef, ReportResult } from '../report.interface';

@Injectable()
export class WonLostReasonsReport implements IStandardReport {
  id = 'won-lost-reasons';
  labelAr = 'أسباب الربح والخسارة';
  labelEn = 'Won/Lost Reasons';
  acceptedFilters: FilterDef[] = [
    { key: 'from', labelAr: 'من تاريخ', labelEn: 'From date', type: 'date' },
    { key: 'to', labelAr: 'إلى تاريخ', labelEn: 'To date', type: 'date' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async run(workspaceId: string, filters: Record<string, unknown>): Promise<ReportResult> {
    const where: Record<string, unknown> = {
      workspaceId,
      status: { in: ['WON', 'LOST'] },
      wonLostReasonId: { not: null },
    };
    if (filters.from || filters.to) {
      where.updatedAt = {};
      if (filters.from) (where.updatedAt as any).gte = new Date(filters.from as string);
      if (filters.to) (where.updatedAt as any).lte = new Date(filters.to as string);
    }

    const deals = await this.prisma.deal.findMany({
      where,
      select: {
        status: true,
        wonLostReasonId: true,
        wonLostReason: { select: { label: true, kind: true } },
      },
    });

    const reasonMap = new Map<string, { label: string; kind: string; count: number }>();

    for (const d of deals) {
      const key = d.wonLostReasonId!;
      const existing = reasonMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        reasonMap.set(key, {
          label: d.wonLostReason!.label,
          kind: d.wonLostReason!.kind,
          count: 1,
        });
      }
    }

    const rows = Array.from(reasonMap.entries())
      .map(([reasonId, v]) => ({ reasonId, ...v }))
      .sort((a, b) => b.count - a.count);

    const totalWon = rows.filter((r) => r.kind === 'WON').reduce((s, r) => s + r.count, 0);
    const totalLost = rows.filter((r) => r.kind === 'LOST').reduce((s, r) => s + r.count, 0);

    return {
      rows,
      summary: { totalWon, totalLost, totalDeals: deals.length },
    };
  }
}
