import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';
import { SavedReportService } from './saved-report.service';

@ApiBearerAuth()
@ApiTags('reports')
@UseGuards(PermissionGuard)
@Controller('reports/saved')
export class SavedReportController {
  constructor(private readonly svc: SavedReportService) {}

  @RequiresPermission(PERMISSIONS.REPORT_WRITE)
  @Post()
  create(@Body() dto: any) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.REPORT_READ)
  @Get()
  list() {
    return this.svc.list();
  }

  @RequiresPermission(PERMISSIONS.REPORT_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.REPORT_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.REPORT_WRITE)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }

  @RequiresPermission(PERMISSIONS.REPORT_READ)
  @Post(':id/run')
  run(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.svc.run(id, limit || 100, offset || 0);
  }

  @RequiresPermission(PERMISSIONS.REPORT_READ)
  @Post(':id/export')
  export(
    @Param('id') id: string,
    @Query('format') format: 'csv' | 'xlsx',
  ) {
    return this.svc.export(id, format || 'csv');
  }
}
