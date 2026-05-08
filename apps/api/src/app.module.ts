import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
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
import { ListsModule } from './crm/lists/lists.module';
import { SearchModule } from './crm/search/search.module';
import { PipelineModule } from './crm/pipelines/pipeline.module';
import { DealModule } from './crm/deals/deal.module';
import { ActivityModule } from './crm/activities/activity.module';
import { WonLostReasonModule } from './crm/won-lost-reasons/won-lost-reason.module';
import { OutboundEmailModule } from './integrations/email/outbound-email.module';
import { FormModule } from './crm/forms/form.module';
import { WorkflowModule } from './automation/workflow/workflow.module';
import { WebhookModule } from './automation/webhooks/webhook.module';
import { ValidationModule } from './automation/validation/validation.module';
import { ReportsModule } from './reports/report.module';
import { AIModule } from './ai/ai.module';
import { ProductModule } from './crm/products/product.module';
import { PricebookModule } from './crm/pricebooks/pricebook.module';
import { QuoteModule } from './crm/quotes/quote.module';
import { CampaignModule } from './crm/campaigns/campaign.module';
import { SequenceModule } from './crm/sequences/sequence.module';
import { EmailSyncModule } from './integrations/email-sync/email-sync.module';
import { PortalModule } from './portal/portal.module';
import { BlogModule } from './crm/blogs/blog.module';
import { AttachmentModule } from './crm/attachments/attachment.module';
import { ImportExportModule } from './crm/import-export/import-export.module';
import { NotificationModule } from './notifications/notification.module';
import { CommentModule } from './comments/comment.module';
import { ForecastModule } from './crm/forecasts/forecast.module';
import { GoalModule } from './crm/goals/goal.module';
import { ScoringModule } from './crm/scoring/scoring.module';
import { TicketModule } from './crm/tickets/ticket.module';
import { JwtAuthGuard } from './core/auth/jwt.guard';
import { TenantInterceptor } from './core/tenant/tenant.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get('REDIS_HOST', 'localhost'),
          port: cfg.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
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
    ListsModule,
    SearchModule,
    PipelineModule,
    DealModule,
    ActivityModule,
    WonLostReasonModule,
    OutboundEmailModule,
    FormModule,
    WorkflowModule,
    WebhookModule,
    ValidationModule,
    ReportsModule,
    AIModule,
    ProductModule,
    PricebookModule,
    QuoteModule,
    CampaignModule,
    SequenceModule,
    EmailSyncModule,
    PortalModule,
    BlogModule,
    AttachmentModule,
    ImportExportModule,
    NotificationModule,
    CommentModule,
    ForecastModule,
    GoalModule,
    ScoringModule,
    TicketModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
  ],
})
export class AppModule {}
