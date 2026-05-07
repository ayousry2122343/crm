import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('webhooks')
@UseGuards(PermissionGuard)
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly svc: WebhookService) {}

  @RequiresPermission(PERMISSIONS.WEBHOOK_WRITE)
  @Get()
  list() {
    return this.svc.list();
  }

  @RequiresPermission(PERMISSIONS.WEBHOOK_WRITE)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.WEBHOOK_WRITE)
  @Post()
  create(@Body() dto: CreateWebhookDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.WEBHOOK_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.WEBHOOK_WRITE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }

  @RequiresPermission(PERMISSIONS.WEBHOOK_WRITE)
  @Get(':id/deliveries')
  listDeliveries(@Param('id') id: string) {
    return this.svc.listDeliveries(id);
  }
}
