import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActivityService } from './activity.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { QueryActivityDto } from './dto/query-activity.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('activities')
@UseGuards(PermissionGuard)
@Controller('activities')
export class ActivityController {
  constructor(private readonly svc: ActivityService) {}

  @RequiresPermission(PERMISSIONS.ACTIVITY_READ)
  @Get()
  list(@Query() q: QueryActivityDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.ACTIVITY_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.ACTIVITY_WRITE)
  @Post()
  create(@Body() dto: CreateActivityDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.ACTIVITY_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateActivityDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.ACTIVITY_WRITE)
  @Post(':id/complete')
  complete(@Param('id') id: string) {
    return this.svc.complete(id);
  }

  @RequiresPermission(PERMISSIONS.ACTIVITY_WRITE)
  @Post(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.svc.cancel(id);
  }
}
