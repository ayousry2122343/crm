import { ExecutionContext, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { TenantContextService } from '../tenant/tenant-context.service';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector, private readonly tenant: TenantContextService) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(err: any, user: TUser, _info: any, context: ExecutionContext): TUser {
    if (err || !user) throw err || new UnauthorizedException();
    const req = context.switchToHttp().getRequest();
    req.user = user;
    // Set tenant context for the rest of this request flow.
    // We can't run the rest of the chain inside als.run from here without an interceptor;
    // expose tenant data via req for now so downstream code can opt-in.
    const u = user as unknown as { workspaceId: string; userId: string };
    req.tenantContext = {
      workspaceId: u.workspaceId,
      userId: u.userId,
      profileIds: [] as string[],
      permissionKeys: new Set<string>(),
    };
    return user;
  }
}
