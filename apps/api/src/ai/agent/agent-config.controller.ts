import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AgentConfigService } from './agent-config.service';
import { CreateAgentConfigDto } from './dto/create-agent-config.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('agent-configs')
@UseGuards(PermissionGuard)
@Controller('agent-configs')
export class AgentConfigController {
  constructor(private readonly svc: AgentConfigService) {}

  @RequiresPermission(PERMISSIONS.AGENT_READ)
  @Get()
  list() {
    return this.svc.list();
  }

  @RequiresPermission(PERMISSIONS.AGENT_READ)
  @Get('dashboard')
  dashboard() {
    return this.svc.getDashboardStats();
  }

  @RequiresPermission(PERMISSIONS.AGENT_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.AGENT_WRITE)
  @Post()
  create(@Body() dto: CreateAgentConfigDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.AGENT_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateAgentConfigDto>) {
    return this.svc.update(id, dto);
  }
}
