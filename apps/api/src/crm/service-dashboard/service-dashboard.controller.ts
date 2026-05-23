import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ServiceDashboardService } from './service-dashboard.service';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('service-dashboard')
@UseGuards(PermissionGuard)
@Controller('service-dashboard')
export class ServiceDashboardController {
  constructor(private readonly svc: ServiceDashboardService) {}

  @RequiresPermission(PERMISSIONS.SERVICE_DASHBOARD_READ)
  @Get('overview')
  overview() {
    return this.svc.overview();
  }

  @RequiresPermission(PERMISSIONS.SERVICE_DASHBOARD_READ)
  @Get('tickets-by-channel')
  ticketsByChannel() {
    return this.svc.ticketsByChannel();
  }

  @RequiresPermission(PERMISSIONS.SERVICE_DASHBOARD_READ)
  @Get('tickets-by-priority')
  ticketsByPriority() {
    return this.svc.ticketsByPriority();
  }

  @RequiresPermission(PERMISSIONS.SERVICE_DASHBOARD_READ)
  @Get('tickets-by-status')
  ticketsByStatus() {
    return this.svc.ticketsByStatus();
  }

  @RequiresPermission(PERMISSIONS.SERVICE_DASHBOARD_READ)
  @Get('volume-over-time')
  volumeOverTime(@Query('period') period?: string) {
    return this.svc.volumeOverTime(period ?? '7d');
  }

  @RequiresPermission(PERMISSIONS.SERVICE_DASHBOARD_READ)
  @Get('agent-performance')
  agentPerformance() {
    return this.svc.agentPerformance();
  }

  @RequiresPermission(PERMISSIONS.SERVICE_DASHBOARD_READ)
  @Get('queue-stats')
  queueStats() {
    return this.svc.queueStats();
  }
}
