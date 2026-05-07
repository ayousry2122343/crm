import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OutboundEmailService } from './outbound-email.service';
import { EmailTemplateService } from './email-template.service';
import { SendEmailDto } from './dto/send-email.dto';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';

@ApiBearerAuth()
@ApiTags('email')
@UseGuards(PermissionGuard)
@Controller('email')
export class OutboundEmailController {
  constructor(
    private readonly outbound: OutboundEmailService,
    private readonly templates: EmailTemplateService,
  ) {}

  @RequiresPermission('email:send')
  @Post('send')
  send(@Body() dto: SendEmailDto) {
    return this.outbound.send(dto);
  }

  @RequiresPermission('email:send')
  @Get('sent')
  listSent(@Query('entityType') entityType?: string, @Query('entityId') entityId?: string) {
    return this.outbound.list(entityType, entityId);
  }

  @RequiresPermission('email-template:read')
  @Get('templates')
  listTemplates() {
    return this.templates.list();
  }

  @RequiresPermission('email-template:read')
  @Get('templates/:id')
  getTemplate(@Param('id') id: string) {
    return this.templates.get(id);
  }

  @RequiresPermission('email-template:write')
  @Post('templates')
  createTemplate(@Body() dto: CreateEmailTemplateDto) {
    return this.templates.create(dto);
  }

  @RequiresPermission('email-template:write')
  @Patch('templates/:id')
  updateTemplate(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) {
    return this.templates.update(id, dto);
  }

  @RequiresPermission('email-template:write')
  @Delete('templates/:id')
  archiveTemplate(@Param('id') id: string) {
    return this.templates.archive(id);
  }
}
