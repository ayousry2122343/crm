import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { UpsertPreferenceDto } from './dto/upsert-preference.dto';
import { PermissionGuard } from '../core/rbac/permission.guard';
import { RequiresPermission } from '../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('notifications')
@UseGuards(PermissionGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly svc: NotificationService) {}

  @RequiresPermission(PERMISSIONS.NOTIFICATION_READ)
  @Get()
  list(@Query() q: QueryNotificationDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.NOTIFICATION_READ)
  @Get('unread-count')
  unreadCount() {
    return this.svc.unreadCount().then((count) => ({ count }));
  }

  @RequiresPermission(PERMISSIONS.NOTIFICATION_WRITE)
  @Patch(':id/read')
  markRead(@Param('id') id: string) {
    return this.svc.markRead(id);
  }

  @RequiresPermission(PERMISSIONS.NOTIFICATION_WRITE)
  @Patch('read-all')
  markAllRead() {
    return this.svc.markAllRead();
  }

  @RequiresPermission(PERMISSIONS.NOTIFICATION_READ)
  @Get('preferences')
  getPreferences() {
    return this.svc.getPreferences();
  }

  @RequiresPermission(PERMISSIONS.NOTIFICATION_WRITE)
  @Put('preferences')
  upsertPreference(@Body() dto: UpsertPreferenceDto) {
    return this.svc.upsertPreference(dto);
  }
}
