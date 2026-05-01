import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { PermissionGuard } from '../rbac/permission.guard';
import { RequiresPermission } from '../rbac/requires-permission.decorator';
import { PERMISSIONS } from '../rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('workspace')
@UseGuards(PermissionGuard)
@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly svc: WorkspaceService) {}

  @Get()
  getCurrent() {
    return this.svc.getCurrent();
  }

  @RequiresPermission(PERMISSIONS.WORKSPACE_SETTINGS_WRITE)
  @Patch()
  update(@Body() dto: UpdateWorkspaceDto) {
    return this.svc.update(dto);
  }
}
