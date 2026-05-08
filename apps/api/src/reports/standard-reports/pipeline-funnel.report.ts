import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IStandardReport, FilterDef, ReportResult } from '../report.interface';

@Injectable()
export class PipelineFunnelReport implements IStandardReport {
  id = 'pipeline-funnel';
  labelAr = 'قمع المبيعات';
  labelEn = 'Pipeline Funnel';
  acceptedFilters: FilterDef[] = [
    { key: 'pipelineId', labelAr: 'خط المبيعات', labelEn: 'Pipeline', type: 'string' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async run(workspaceId: string, filters: Record<string, unknown>): Promise<ReportResult> {
    const pipelineId = filters.pipelineId as string | undefined;

    const where: Record<string, unknown> = { workspaceId };
    if (pipelineId) where.pipelineId = pipelineId;

    const deals = await this.prisma.deal.findMany({
      where,
      select: { stageId: true, stage: { select: { name: true, order: true } }, amount: true },
    });

    const stageMap = new Map<string, { name: string; order: number; count: number; total: number }>();

    for (const d of deals) {
      const key = d.stageId;
      const existing = stageMap.get(key);
      if (existing) {
        existing.count++;
        existing.total += Number(d.amount ?? 0);
      } else {
        stageMap.set(key, {
          name: d.stage.name,
          order: d.stage.order,
          count: 1,
          total: Number(d.amount ?? 0),
        });
      }
    }

    const rows = Array.from(stageMap.entries())
      .map(([stageId, v]) => ({ stageId, stageName: v.name, order: v.order, count: v.count, totalAmount: v.total }))
      .sort((a, b) => a.order - b.order);

    return {
      rows,
      summary: { totalDeals: deals.length, stages: rows.length },
    };
  }
}
