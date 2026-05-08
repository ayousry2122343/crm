import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { PermissionGuard } from '../core/rbac/permission.guard';
import { RequiresPermission } from '../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('reports')
@UseGuards(PermissionGuard)
@Controller('reports')
export class ReportController {
  constructor(private readonly svc: ReportService) {}

  @RequiresPermission(PERMISSIONS.REPORT_READ)
  @Get()
  list() {
    return this.svc.listReports();
  }

  @RequiresPermission(PERMISSIONS.REPORT_READ)
  @Get(':reportId/run')
  run(@Param('reportId') reportId: string, @Query('filters') filtersJson?: string) {
    const filters = filtersJson ? JSON.parse(filtersJson) : {};
    return this.svc.runReport(reportId, filters);
  }
}
