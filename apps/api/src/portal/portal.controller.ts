import { Controller, Get, Post, Patch, Body, Param, UseGuards, Req } from '@nestjs/common';
import { PortalService } from './portal.service';
import { UpdatePortalDto, PortalRegisterDto, PortalLoginDto } from './dto/portal.dto';
import { RequiresPermission } from '../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../core/rbac/permissions.constants';
import { PermissionGuard } from '../core/rbac/permission.guard';
import { Public } from '../core/auth/jwt.guard';

@Controller('portal')
export class PortalController {
  constructor(private readonly svc: PortalService) {}

  @Get('settings')
  @UseGuards(PermissionGuard)
  @RequiresPermission(PERMISSIONS.PORTAL_READ)
  getPortal() {
    return this.svc.getPortal();
  }

  @Patch('settings')
  @UseGuards(PermissionGuard)
  @RequiresPermission(PERMISSIONS.PORTAL_WRITE)
  updatePortal(@Body() dto: UpdatePortalDto) {
    return this.svc.upsertPortal(dto);
  }

  @Public()
  @Post(':workspaceId/register')
  register(@Param('workspaceId') workspaceId: string, @Body() dto: PortalRegisterDto) {
    return this.svc.register(workspaceId, dto);
  }

  @Public()
  @Post(':workspaceId/login')
  login(@Param('workspaceId') workspaceId: string, @Body() dto: PortalLoginDto) {
    return this.svc.login(workspaceId, dto);
  }

  @Public()
  @Get(':workspaceId/me/deals')
  getMyDeals(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    return this.svc.getMyDeals(workspaceId, req.portalUser?.personId ?? req.query?.personId);
  }

  @Public()
  @Get(':workspaceId/me/quotes')
  getMyQuotes(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    return this.svc.getMyQuotes(workspaceId, req.portalUser?.personId ?? req.query?.personId);
  }

  @Public()
  @Get(':workspaceId/me/activities')
  getMyActivities(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    return this.svc.getMyActivities(workspaceId, req.portalUser?.personId ?? req.query?.personId);
  }

  @Public()
  @Get(':workspaceId/me/profile')
  getMyProfile(@Param('workspaceId') workspaceId: string, @Req() req: any) {
    return this.svc.getPortalProfile(workspaceId, req.portalUser?.personId ?? req.query?.personId);
  }
}
