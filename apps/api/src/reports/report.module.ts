import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { PipelineFunnelReport } from './standard-reports/pipeline-funnel.report';
import { ActivitiesByOwnerReport } from './standard-reports/activities-by-owner.report';
import { ConversionRatesReport } from './standard-reports/conversion-rates.report';
import { ForecastReport } from './standard-reports/forecast.report';
import { WonLostReasonsReport } from './standard-reports/won-lost-reasons.report';

@Module({
  providers: [
    PipelineFunnelReport,
    ActivitiesByOwnerReport,
    ConversionRatesReport,
    ForecastReport,
    WonLostReasonsReport,
    ReportService,
    DashboardService,
  ],
  controllers: [ReportController, DashboardController],
  exports: [ReportService, DashboardService],
})
export class ReportsModule {}
