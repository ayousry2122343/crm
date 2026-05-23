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
import { ConversationService } from './conversation.service';
import { QueryConversationDto } from './dto/query-conversation.dto';
import {
  AssignConversationDto,
  SnoozeConversationDto,
  MergeConversationDto,
} from './dto/reply-conversation.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('conversations')
@UseGuards(PermissionGuard)
@Controller('conversations')
export class ConversationController {
  constructor(private readonly svc: ConversationService) {}

  @RequiresPermission(PERMISSIONS.CONVERSATION_READ)
  @Get()
  list(@Query() q: QueryConversationDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.CONVERSATION_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.CONVERSATION_READ)
  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.svc.getMessages(id);
  }

  @RequiresPermission(PERMISSIONS.CONVERSATION_ASSIGN)
  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignConversationDto) {
    return this.svc.assign(id, dto.assigneeId);
  }

  @RequiresPermission(PERMISSIONS.CONVERSATION_WRITE)
  @Patch(':id/snooze')
  snooze(@Param('id') id: string, @Body() dto: SnoozeConversationDto) {
    return this.svc.snooze(id, dto.until);
  }

  @RequiresPermission(PERMISSIONS.CONVERSATION_WRITE)
  @Patch(':id/close')
  close(@Param('id') id: string) {
    return this.svc.close(id);
  }

  @RequiresPermission(PERMISSIONS.CONVERSATION_WRITE)
  @Post(':id/merge')
  merge(@Param('id') id: string, @Body() dto: MergeConversationDto) {
    return this.svc.merge(id, dto.sourceIds);
  }
}
