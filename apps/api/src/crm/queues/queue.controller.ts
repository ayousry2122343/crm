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
import { QueueService } from './queue.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { QueryQueueDto } from './dto/query-queue.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('queues')
@UseGuards(PermissionGuard)
@Controller('queues')
export class QueueController {
  constructor(private readonly svc: QueueService) {}

  @RequiresPermission(PERMISSIONS.QUEUE_READ)
  @Get()
  list(@Query() q: QueryQueueDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.QUEUE_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.QUEUE_WRITE)
  @Post()
  create(@Body() dto: CreateQueueDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.QUEUE_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQueueDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.QUEUE_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }

  @RequiresPermission(PERMISSIONS.QUEUE_WRITE)
  @Post(':id/members')
  addMember(@Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.svc.addMember(id, dto.userId);
  }

  @RequiresPermission(PERMISSIONS.QUEUE_WRITE)
  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.svc.removeMember(id, userId);
  }
}
