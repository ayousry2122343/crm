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
import { WonLostReasonService } from './won-lost-reason.service';
import { CreateWonLostReasonDto } from './dto/create-won-lost-reason.dto';
import { UpdateWonLostReasonDto } from './dto/update-won-lost-reason.dto';
import { QueryWonLostReasonDto } from './dto/query-won-lost-reason.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('won-lost-reasons')
@UseGuards(PermissionGuard)
@Controller('won-lost-reasons')
export class WonLostReasonController {
  constructor(private readonly svc: WonLostReasonService) {}

  @RequiresPermission(PERMISSIONS.PIPELINE_WRITE)
  @Get()
  list(@Query() q: QueryWonLostReasonDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.PIPELINE_WRITE)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.PIPELINE_WRITE)
  @Post()
  create(@Body() dto: CreateWonLostReasonDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.PIPELINE_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWonLostReasonDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.PIPELINE_WRITE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
