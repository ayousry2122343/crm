import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IStandardReport, FilterDef, ReportResult } from '../report.interface';

@Injectable()
export class ConversionRatesReport implements IStandardReport {
  id = 'conversion-rates';
  labelAr = 'معدلات التحويل';
  labelEn = 'Conversion Rates';
  acceptedFilters: FilterDef[] = [
    { key: 'pipelineId', labelAr: 'خط المبيعات', labelEn: 'Pipeline', type: 'string' },
    { key: 'from', labelAr: 'من تاريخ', labelEn: 'From date', type: 'date' },
    { key: 'to', labelAr: 'إلى تاريخ', labelEn: 'To date', type: 'date' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async run(workspaceId: string, filters: Record<string, unknown>): Promise<ReportResult> {
    const where: Record<string, unknown> = { workspaceId };
    if (filters.pipelineId) where.pipelineId = filters.pipelineId;
    if (filters.from || filters.to) {
      where.updatedAt = {};
      if (filters.from) (where.updatedAt as any).gte = new Date(filters.from as string);
      if (filters.to) (where.updatedAt as any).lte = new Date(filters.to as string);
    }

    const deals = await this.prisma.deal.findMany({
      where,
      select: { pipelineId: true, pipeline: { select: { name: true } }, status: true },
    });

    const pipelineMap = new Map<string, { name: string; total: number; won: number; lost: number; open: number }>();

    for (const d of deals) {
      const key = d.pipelineId;
      const existing = pipelineMap.get(key) ?? { name: d.pipeline.name, total: 0, won: 0, lost: 0, open: 0 };
      existing.total++;
      if (d.status === 'WON') existing.won++;
      else if (d.status === 'LOST') existing.lost++;
      else existing.open++;
      pipelineMap.set(key, existing);
    }

    const rows = Array.from(pipelineMap.entries()).map(([pipelineId, v]) => ({
      pipelineId,
      pipelineName: v.name,
      total: v.total,
      won: v.won,
      lost: v.lost,
      open: v.open,
      winRate: v.total > 0 ? Math.round((v.won / v.total) * 100) : 0,
    }));

    const totalWon = rows.reduce((s, r) => s + r.won, 0);
    const totalAll = rows.reduce((s, r) => s + r.total, 0);

    return {
      rows,
      summary: { overallWinRate: totalAll > 0 ? Math.round((totalWon / totalAll) * 100) : 0 },
    };
  }
}
