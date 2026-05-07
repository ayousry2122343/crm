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
import { PipelineService } from './pipeline.service';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { QueryPipelineDto } from './dto/query-pipeline.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('pipelines')
@UseGuards(PermissionGuard)
@Controller('pipelines')
export class PipelineController {
  constructor(private readonly svc: PipelineService) {}

  @RequiresPermission('pipeline:read')
  @Get()
  list(@Query() q: QueryPipelineDto) {
    return this.svc.list(q);
  }

  @RequiresPermission('pipeline:read')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.PIPELINE_WRITE)
  @Post()
  create(@Body() dto: CreatePipelineDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.PIPELINE_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePipelineDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.PIPELINE_WRITE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }

  @RequiresPermission(PERMISSIONS.PIPELINE_WRITE)
  @Post(':id/stages')
  createStage(@Param('id') id: string, @Body() dto: CreateStageDto) {
    return this.svc.createStage(id, dto);
  }

  @RequiresPermission(PERMISSIONS.PIPELINE_WRITE)
  @Patch('stages/:stageId')
  updateStage(@Param('stageId') stageId: string, @Body() dto: UpdateStageDto) {
    return this.svc.updateStage(stageId, dto);
  }

  @RequiresPermission(PERMISSIONS.PIPELINE_WRITE)
  @Delete('stages/:stageId')
  deleteStage(@Param('stageId') stageId: string) {
    return this.svc.deleteStage(stageId);
  }

  @RequiresPermission(PERMISSIONS.PIPELINE_WRITE)
  @Post('seed-default')
  seedDefault() {
    return this.svc.seedDefault();
  }
}
