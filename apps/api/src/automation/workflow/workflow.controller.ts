import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('workflows')
@UseGuards(PermissionGuard)
@Controller('workflows')
export class WorkflowController {
  constructor(private readonly svc: WorkflowService) {}

  @RequiresPermission(PERMISSIONS.WORKFLOW_WRITE)
  @Get()
  list() {
    return this.svc.list();
  }

  @RequiresPermission(PERMISSIONS.WORKFLOW_WRITE)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.WORKFLOW_WRITE)
  @Post()
  create(@Body() dto: CreateWorkflowDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.WORKFLOW_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.WORKFLOW_WRITE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.delete(id);
  }

  @RequiresPermission(PERMISSIONS.WORKFLOW_WRITE)
  @Get(':id/runs')
  listRuns(@Param('id') id: string) {
    return this.svc.listRuns(id);
  }
}
