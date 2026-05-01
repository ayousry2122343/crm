import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserService } from './user.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { Public } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/jwt.strategy';
import { PermissionGuard } from '../rbac/permission.guard';
import { RequiresPermission } from '../rbac/requires-permission.decorator';
import { PERMISSIONS } from '../rbac/permissions.constants';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly svc: UserService) {}

  @ApiBearerAuth()
  @Get()
  list() {
    return this.svc.list();
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @RequiresPermission(PERMISSIONS.USER_INVITE)
  @Post('invite')
  invite(@Body() dto: InviteUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.svc.invite(dto, user.userId);
  }

  @Public()
  @Post('accept-invite')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.svc.acceptInvite(dto.token, dto.password);
  }
}
