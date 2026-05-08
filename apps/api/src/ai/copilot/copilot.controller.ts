import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CopilotService, type CopilotChatDto } from './copilot.service';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';
import { PermissionGuard } from '../../core/rbac/permission.guard';

@Controller('ai/copilot')
@UseGuards(PermissionGuard)
export class CopilotController {
  constructor(private readonly copilot: CopilotService) {}

  @Post('chat')
  @RequiresPermission(PERMISSIONS.AI_USE)
  chat(@Body() dto: CopilotChatDto) {
    return this.copilot.chat(dto);
  }
}
