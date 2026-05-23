import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('whatsapp-templates')
@UseGuards(PermissionGuard)
@Controller('channels/:configId/whatsapp-templates')
export class WhatsAppTemplateController {
  constructor(private readonly svc: WhatsAppTemplateService) {}

  @RequiresPermission(PERMISSIONS.CHANNEL_READ)
  @Get()
  list(@Param('configId') configId: string) {
    return this.svc.listTemplates(configId);
  }

  @RequiresPermission(PERMISSIONS.CHANNEL_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getTemplate(id);
  }

  @RequiresPermission(PERMISSIONS.CHANNEL_WRITE)
  @Post('sync')
  sync(
    @Param('configId') configId: string,
    @Body() body: { templates: any[] },
  ) {
    return this.svc.syncTemplates(configId, body.templates);
  }
}
