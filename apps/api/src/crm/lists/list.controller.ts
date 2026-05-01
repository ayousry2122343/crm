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
import { ListService } from './list.service';
import { CreateListDto } from './dto/create-list.dto';
import { UpdateListDto } from './dto/update-list.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('lists')
@UseGuards(PermissionGuard)
@Controller('lists')
export class ListController {
  constructor(private readonly svc: ListService) {}

  @RequiresPermission(PERMISSIONS.LIST_WRITE)
  @Post()
  create(@Body() dto: CreateListDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.LIST_READ)
  @Get()
  list(@Query('entityType') entityType?: string) {
    return this.svc.list({ entityType });
  }

  @RequiresPermission(PERMISSIONS.LIST_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.LIST_READ)
  @Get(':id/members')
  members(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.members(id, {
      cursor,
      limit: limit ? Number.parseInt(limit, 10) : undefined,
    });
  }

  @RequiresPermission(PERMISSIONS.LIST_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateListDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.LIST_WRITE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
