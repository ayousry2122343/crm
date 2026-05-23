import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../core/auth/jwt.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';
import { ChatService } from './chat.service';
import type { StartSessionDto } from './dto/start-session.dto';
import type { SendMessageDto } from './dto/send-message.dto';

@ApiTags('chat')
@Controller('chat/sessions')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Public()
  @Post()
  async startSession(@Body() dto: StartSessionDto & { workspaceId: string }) {
    return this.chatService.startSession(dto, dto.workspaceId);
  }

  @RequiresPermission(PERMISSIONS.CHAT_READ)
  @Get()
  async listSessions(
    @Query('status') status?: string,
    @Query('assigneeId') assigneeId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chatService.listSessions({
      status: status as any,
      assigneeId,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @RequiresPermission(PERMISSIONS.CHAT_READ)
  @Get(':id')
  async getSession(@Param('id') id: string) {
    return this.chatService.getSession(id);
  }

  @Public()
  @Post(':id/messages')
  async sendMessagePublic(
    @Param('id') id: string,
    @Body() dto: SendMessageDto & { workspaceId?: string },
  ) {
    return this.chatService.sendMessage(id, dto, dto.workspaceId);
  }

  @RequiresPermission(PERMISSIONS.CHAT_WRITE)
  @Patch(':id/assign')
  async assignAgent(
    @Param('id') id: string,
    @Body('agentId') agentId: string,
  ) {
    return this.chatService.assignAgent(id, agentId);
  }

  @RequiresPermission(PERMISSIONS.CHAT_WRITE)
  @Patch(':id/end')
  async endSession(@Param('id') id: string) {
    return this.chatService.endSession(id);
  }

  @RequiresPermission(PERMISSIONS.CHAT_WRITE)
  @Post(':id/convert')
  async convertToTicket(@Param('id') id: string) {
    return this.chatService.convertToTicket(id);
  }
}
