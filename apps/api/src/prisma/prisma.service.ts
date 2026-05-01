import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../core/tenant/tenant-context.service';

const TENANT_SCOPED_MODELS = new Set([
  'User',
  'Team',
  'RefreshToken',
  'EmailVerificationToken',
  'PasswordResetToken',
  'Role',
  'Profile',
  'UserRole',
  'UserProfile',
]);

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(private readonly tenant: TenantContextService) {
    super();
  }

  /**
   * Returns a tenant-scoped client extension that injects workspaceId into
   * queries and creates for tenant-scoped models. Use this from services
   * (e.g., `this.prisma.tenantClient.user.findMany(...)`) instead of the bare
   * client to enforce isolation.
   *
   * The bare `this.prisma.user.findMany(...)` bypasses scoping — only use
   * for system-level admin/seed operations.
   */
  get tenantClient() {
    const tenant = this.tenant;
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            if (!TENANT_SCOPED_MODELS.has(model)) return query(args);
            const ctx = tenant.getStore();
            if (!ctx) return query(args);
            const wsId = ctx.workspaceId;
            const a: any = args ?? {};
            switch (operation) {
              case 'findFirst':
              case 'findFirstOrThrow':
              case 'findMany':
              case 'findUnique':
              case 'findUniqueOrThrow':
              case 'count':
              case 'aggregate':
              case 'groupBy':
                a.where = { ...(a.where ?? {}), workspaceId: wsId };
                break;
              case 'create':
                a.data = { ...(a.data ?? {}), workspaceId: wsId };
                break;
              case 'createMany': {
                const data = Array.isArray(a.data) ? a.data : [a.data];
                a.data = data.map((d: any) => ({ ...d, workspaceId: wsId }));
                break;
              }
              case 'update':
              case 'updateMany':
              case 'delete':
              case 'deleteMany':
              case 'upsert':
                a.where = { ...(a.where ?? {}), workspaceId: wsId };
                if (operation === 'upsert') {
                  a.create = { ...(a.create ?? {}), workspaceId: wsId };
                }
                break;
            }
            return query(a);
          },
        },
      },
    });
  }

  async onModuleInit() {
    this.logger.log('connecting to database');
    await this.$connect();
  }

  async onModuleDestroy() {
    this.logger.log('disconnecting from database');
    await this.$disconnect();
  }
}
