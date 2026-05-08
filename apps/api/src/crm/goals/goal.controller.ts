import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GoalService } from './goal.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { QueryGoalDto } from './dto/query-goal.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('goals')
@UseGuards(PermissionGuard)
@Controller('goals')
export class GoalController {
  constructor(private readonly svc: GoalService) {}

  @RequiresPermission(PERMISSIONS.GOAL_READ)
  @Get()
  list(@Query() q: QueryGoalDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.GOAL_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.GOAL_WRITE)
  @Post()
  create(@Body() dto: CreateGoalDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.GOAL_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.GOAL_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }

  @RequiresPermission(PERMISSIONS.GOAL_WRITE)
  @Post(':id/recalculate')
  recalculate(@Param('id') id: string) {
    return this.svc.recalculateProgress(id);
  }
}
