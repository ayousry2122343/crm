import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService, CreateDashboardDto, UpdateDashboardDto } from './dashboard.service';
import { PermissionGuard } from '../core/rbac/permission.guard';
import { RequiresPermission } from '../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('dashboards')
@UseGuards(PermissionGuard)
@Controller('dashboards')
export class DashboardController {
  constructor(private readonly svc: DashboardService) {}

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

  @RequiresPermission(PERMISSIONS.DASHBOARD_WRITE)
  @Post()
  create(@Body() dto: CreateDashboardDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.DASHBOARD_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDashboardDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.DASHBOARD_WRITE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
