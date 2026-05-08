import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import type { IStandardReport, ReportResult } from './report.interface';
import { PipelineFunnelReport } from './standard-reports/pipeline-funnel.report';
import { ActivitiesByOwnerReport } from './standard-reports/activities-by-owner.report';
import { ConversionRatesReport } from './standard-reports/conversion-rates.report';
import { ForecastReport } from './standard-reports/forecast.report';
import { WonLostReasonsReport } from './standard-reports/won-lost-reasons.report';

@Injectable()
export class ReportService {
  private readonly registry: Map<string, IStandardReport>;

  constructor(
    private readonly tenant: TenantContextService,
    pipelineFunnel: PipelineFunnelReport,
    activitiesByOwner: ActivitiesByOwnerReport,
    conversionRates: ConversionRatesReport,
    forecast: ForecastReport,
    wonLostReasons: WonLostReasonsReport,
  ) {
    this.registry = new Map<string, IStandardReport>([
      [pipelineFunnel.id, pipelineFunnel],
      [activitiesByOwner.id, activitiesByOwner],
      [conversionRates.id, conversionRates],
      [forecast.id, forecast],
      [wonLostReasons.id, wonLostReasons],
    ]);
  }

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  listReports() {
    return Array.from(this.registry.values()).map((r) => ({
      id: r.id,
      labelAr: r.labelAr,
      labelEn: r.labelEn,
      acceptedFilters: r.acceptedFilters,
    }));
  }

  async runReport(reportId: string, filters: Record<string, unknown>): Promise<ReportResult> {
    const workspaceId = this.requireWs();
    const report = this.registry.get(reportId);
    if (!report) throw new NotFoundException(`Report "${reportId}" not found`);
    return report.run(workspaceId, filters);
  }
}
