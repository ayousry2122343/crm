import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { EmailSyncService } from './email-sync.service';
import { ConnectAccountDto } from './dto/connect-account.dto';
import { QueryThreadsDto } from './dto/query-threads.dto';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';
import { PermissionGuard } from '../../core/rbac/permission.guard';

@Controller('email-sync')
@UseGuards(PermissionGuard)
export class EmailSyncController {
  constructor(private readonly svc: EmailSyncService) {}

  @Post('accounts')
  @RequiresPermission(PERMISSIONS.EMAIL_ACCOUNT_WRITE)
  connect(@Body() dto: ConnectAccountDto) {
    return this.svc.connectAccount(dto);
  }

  @Get('accounts')
  @RequiresPermission(PERMISSIONS.EMAIL_ACCOUNT_READ)
  listAccounts() {
    return this.svc.listAccounts();
  }

  @Get('accounts/:id')
  @RequiresPermission(PERMISSIONS.EMAIL_ACCOUNT_READ)
  getAccount(@Param('id') id: string) {
    return this.svc.getAccount(id);
  }

  @Delete('accounts/:id')
  @RequiresPermission(PERMISSIONS.EMAIL_ACCOUNT_WRITE)
  disconnect(@Param('id') id: string) {
    return this.svc.disconnectAccount(id);
  }

  @Get('threads')
  @RequiresPermission(PERMISSIONS.EMAIL_SYNC_READ)
  listThreads(@Query() dto: QueryThreadsDto) {
    return this.svc.listThreads(dto);
  }

  @Get('threads/:id')
  @RequiresPermission(PERMISSIONS.EMAIL_SYNC_READ)
  getThread(@Param('id') id: string) {
    return this.svc.getThread(id);
  }

  @Get('person/:personId/threads')
  @RequiresPermission(PERMISSIONS.EMAIL_SYNC_READ)
  threadsForPerson(@Param('personId') personId: string) {
    return this.svc.threadsForPerson(personId);
  }
}
