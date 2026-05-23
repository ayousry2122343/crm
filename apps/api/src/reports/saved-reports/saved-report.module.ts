import { Module } from '@nestjs/common';
import { SavedReportController } from './saved-report.controller';
import { SavedReportService } from './saved-report.service';
import { ReportQueryEngine } from './report-query-engine';

@Module({
  controllers: [SavedReportController],
  providers: [SavedReportService, ReportQueryEngine],
})
export class SavedReportModule {}
