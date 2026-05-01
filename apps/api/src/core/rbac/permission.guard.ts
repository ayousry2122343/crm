import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from './requires-permission.decorator';
import type { PermissionKey } from './permissions.constants';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<PermissionKey[]>(PERMISSION_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user as { userId: string; workspaceId: string } | undefined;
    if (!user) throw new ForbiddenException('not authenticated');

    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: user.userId },
      include: { profile: true },
    });
    const granted = new Set<string>(profiles.flatMap((up: any) => up.profile.permissions));
    const missing = required.filter((p) => !granted.has(p));
    if (missing.length > 0) {
      throw new ForbiddenException(`missing permission: ${missing.join(', ')}`);
    }

    // attach permission set + profileIds to req for downstream code
    req.permissions = granted;
    req.profileIds = profiles.map((up: any) => up.profileId);
    return true;
  }
}
