import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { PermissionGuard } from '../rbac/permission.guard';
import { RequiresPermission } from '../rbac/requires-permission.decorator';
import { PERMISSIONS } from '../rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('audit')
@UseGuards(PermissionGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @RequiresPermission(PERMISSIONS.AUDIT_READ)
  @Get(':entityType/:entityId')
  list(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.audit.listForRecord(entityType, entityId);
  }
}
