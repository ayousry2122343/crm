import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { EmailComposerService, ComposeEmailDto } from './email-composer.service';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('ai')
@UseGuards(PermissionGuard)
@Controller('ai')
export class EmailComposerController {
  constructor(private readonly svc: EmailComposerService) {}

  @RequiresPermission(PERMISSIONS.AI_USE)
  @Post('email-composer')
  compose(@Body() dto: ComposeEmailDto) {
    return this.svc.compose(dto);
  }
}
