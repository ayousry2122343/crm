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
import { DealService } from './deal.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { MoveDealDto } from './dto/move-deal.dto';
import { QueryDealDto } from './dto/query-deal.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('deals')
@UseGuards(PermissionGuard)
@Controller('deals')
export class DealController {
  constructor(private readonly svc: DealService) {}

  @RequiresPermission(PERMISSIONS.DEAL_READ)
  @Get()
  list(@Query() q: QueryDealDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.DEAL_READ)
  @Get('kanban')
  kanban(@Query('pipelineId') pipelineId: string) {
    return this.svc.kanban(pipelineId);
  }

  @RequiresPermission(PERMISSIONS.DEAL_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.DEAL_WRITE)
  @Post()
  create(@Body() dto: CreateDealDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.DEAL_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.DEAL_WRITE)
  @Post(':id/move')
  moveStage(@Param('id') id: string, @Body() dto: MoveDealDto) {
    return this.svc.moveStage(id, dto);
  }

  @RequiresPermission(PERMISSIONS.DEAL_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
