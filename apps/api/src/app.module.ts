import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { TenantModule } from './core/tenant/tenant.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './core/auth/auth.module';
import { EmailModule } from './core/email/email.module';
import { RbacModule } from './core/rbac/rbac.module';
import { AuditModule } from './core/audit/audit.module';
import { CustomFieldModule } from './core/custom-fields/custom-field.module';
import { MetadataModule } from './core/metadata/metadata.module';
import { WorkspaceModule } from './core/workspaces/workspace.module';
import { UserModule } from './core/users/user.module';
import { PeopleModule } from './crm/people/people.module';
import { TagsModule } from './crm/tags/tags.module';
import { JwtAuthGuard } from './core/auth/jwt.guard';
import { TenantInterceptor } from './core/tenant/tenant.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        level: process.env.LOG_LEVEL ?? 'info',
      },
    }),
    TenantModule,
    PrismaModule,
    EmailModule,
    AuthModule,
    RbacModule,
    AuditModule,
    CustomFieldModule,
    MetadataModule,
    WorkspaceModule,
    UserModule,
    PeopleModule,
    TagsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
