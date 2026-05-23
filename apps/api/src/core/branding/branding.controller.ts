import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../rbac/permission.guard';
import { RequiresPermission } from '../rbac/requires-permission.decorator';
import { PERMISSIONS } from '../rbac/permissions.constants';
import { BrandingService } from './branding.service';
import { WorkspaceBranding } from './branding.interface';

@ApiBearerAuth()
@ApiTags('branding')
@UseGuards(PermissionGuard)
@Controller('branding')
export class BrandingController {
  constructor(private readonly svc: BrandingService) {}

  @Get()
  resolve() {
    return this.svc.resolve();
  }

  @RequiresPermission(PERMISSIONS.WORKSPACE_ADMIN)
  @Put()
  update(@Body() body: Partial<WorkspaceBranding>) {
    return this.svc.update(body);
  }
}
