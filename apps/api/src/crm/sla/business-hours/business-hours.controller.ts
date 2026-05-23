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
import { BusinessHoursService } from './business-hours.service';
import { CreateBusinessHoursDto } from './dto/create-business-hours.dto';
import { UpdateBusinessHoursDto } from './dto/update-business-hours.dto';
import { QueryBusinessHoursDto } from './dto/query-business-hours.dto';
import { PermissionGuard } from '../../../core/rbac/permission.guard';
import { RequiresPermission } from '../../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('sla')
@UseGuards(PermissionGuard)
@Controller('sla/business-hours')
export class BusinessHoursController {
  constructor(private readonly svc: BusinessHoursService) {}

  @RequiresPermission(PERMISSIONS.QUEUE_READ)
  @Get()
  list(@Query() q: QueryBusinessHoursDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.QUEUE_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.SLA_WRITE)
  @Post()
  create(@Body() dto: CreateBusinessHoursDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.SLA_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBusinessHoursDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.SLA_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
