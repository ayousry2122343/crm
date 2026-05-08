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
import { SequenceService } from './sequence.service';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';
import { QuerySequenceDto } from './dto/query-sequence.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('sequences')
@UseGuards(PermissionGuard)
@Controller('sequences')
export class SequenceController {
  constructor(private readonly svc: SequenceService) {}

  @RequiresPermission(PERMISSIONS.SEQUENCE_READ)
  @Get()
  list(@Query() q: QuerySequenceDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.SEQUENCE_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.SEQUENCE_WRITE)
  @Post()
  create(@Body() dto: CreateSequenceDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.SEQUENCE_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSequenceDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.SEQUENCE_WRITE)
  @Post(':id/enroll')
  enroll(@Param('id') id: string, @Body('personId') personId: string) {
    return this.svc.enroll(id, personId);
  }

  @RequiresPermission(PERMISSIONS.SEQUENCE_WRITE)
  @Post('enrollments/:enrollmentId/pause')
  pauseEnrollment(@Param('enrollmentId') enrollmentId: string) {
    return this.svc.pauseEnrollment(enrollmentId);
  }

  @RequiresPermission(PERMISSIONS.SEQUENCE_WRITE)
  @Post('enrollments/:enrollmentId/resume')
  resumeEnrollment(@Param('enrollmentId') enrollmentId: string) {
    return this.svc.resumeEnrollment(enrollmentId);
  }

  @RequiresPermission(PERMISSIONS.SEQUENCE_WRITE)
  @Post('enrollments/:enrollmentId/exit')
  exitEnrollment(
    @Param('enrollmentId') enrollmentId: string,
    @Body('reason') reason?: string,
  ) {
    return this.svc.exitEnrollment(enrollmentId, reason);
  }

  @RequiresPermission(PERMISSIONS.SEQUENCE_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
