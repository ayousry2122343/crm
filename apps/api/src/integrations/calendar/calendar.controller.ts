import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CalendarSyncService } from './calendar-sync.service';
import { CreateCalendarAccountDto } from './dto/create-calendar-account.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('calendar')
@UseGuards(PermissionGuard)
@Controller('calendar')
export class CalendarController {
  constructor(private readonly svc: CalendarSyncService) {}

  @RequiresPermission(PERMISSIONS.CALENDAR_READ)
  @Get('accounts')
  list() {
    return this.svc.listAccounts();
  }

  @RequiresPermission(PERMISSIONS.CALENDAR_WRITE)
  @Get('auth-url')
  authUrl(
    @Query('provider') provider: string,
    @Query('redirectUri') redirectUri: string,
  ) {
    return this.svc.getAuthUrl(provider, redirectUri);
  }

  @RequiresPermission(PERMISSIONS.CALENDAR_WRITE)
  @Post('accounts')
  create(@Body() dto: CreateCalendarAccountDto) {
    return this.svc.createAccount(dto);
  }
}
