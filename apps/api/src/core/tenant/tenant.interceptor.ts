import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TenantContextService } from './tenant-context.service';

/**
 * Wraps each request handler in `tenant.run()` so services that read
 * `tenant.getStore()` (e.g. PrismaService.tenantClient, AuditService) see the
 * authenticated user's workspaceId in AsyncLocalStorage. JwtAuthGuard runs
 * BEFORE this interceptor and populates `req.user`.
 */
@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly tenant: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as { userId: string; workspaceId: string } | undefined;
    if (!user) return next.handle();
    return new Observable((observer) => {
      this.tenant.run(
        {
          workspaceId: user.workspaceId,
          userId: user.userId,
          profileIds: req.profileIds ?? [],
          permissionKeys: req.permissions ?? new Set<string>(),
        },
        () => {
          next.handle().subscribe({
            next: (val) => observer.next(val),
            error: (err) => observer.error(err),
            complete: () => observer.complete(),
          });
        },
      );
    });
  }
}
