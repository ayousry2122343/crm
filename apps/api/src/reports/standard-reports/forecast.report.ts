import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IStandardReport, FilterDef, ReportResult } from '../report.interface';

@Injectable()
export class ForecastReport implements IStandardReport {
  id = 'forecast';
  labelAr = 'التوقعات';
  labelEn = 'Forecast';
  acceptedFilters: FilterDef[] = [
    { key: 'pipelineId', labelAr: 'خط المبيعات', labelEn: 'Pipeline', type: 'string' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async run(workspaceId: string, filters: Record<string, unknown>): Promise<ReportResult> {
    const where: Record<string, unknown> = { workspaceId, status: 'OPEN' };
    if (filters.pipelineId) where.pipelineId = filters.pipelineId;

    const deals = await this.prisma.deal.findMany({
      where,
      select: { amount: true, probability: true, expectedCloseDate: true },
    });

    const monthMap = new Map<string, { count: number; rawTotal: number; weightedTotal: number }>();

    for (const d of deals) {
      const date = d.expectedCloseDate ? new Date(d.expectedCloseDate) : null;
      const key = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : 'unset';
      const amount = Number(d.amount ?? 0);
      const prob = Number(d.probability ?? 50) / 100;
      const existing = monthMap.get(key) ?? { count: 0, rawTotal: 0, weightedTotal: 0 };
      existing.count++;
      existing.rawTotal += amount;
      existing.weightedTotal += Math.round(amount * prob);
      monthMap.set(key, existing);
    }

    const rows = Array.from(monthMap.entries())
      .map(([month, v]) => ({ month, ...v }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const totalWeighted = rows.reduce((s, r) => s + r.weightedTotal, 0);
    const totalRaw = rows.reduce((s, r) => s + r.rawTotal, 0);

    return {
      rows,
      summary: { totalDeals: deals.length, totalRaw, totalWeighted },
    };
  }
}
