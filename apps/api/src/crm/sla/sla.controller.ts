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
import { SLAService } from './sla.service';
import { CreateSLAPolicyDto } from './dto/create-sla-policy.dto';
import { UpdateSLAPolicyDto } from './dto/update-sla-policy.dto';
import { QuerySLAPolicyDto } from './dto/query-sla-policy.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('sla')
@UseGuards(PermissionGuard)
@Controller('sla/policies')
export class SLAController {
  constructor(private readonly svc: SLAService) {}

  @RequiresPermission(PERMISSIONS.SLA_READ)
  @Get()
  list(@Query() q: QuerySLAPolicyDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.SLA_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.SLA_WRITE)
  @Post()
  create(@Body() dto: CreateSLAPolicyDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.SLA_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSLAPolicyDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.SLA_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
