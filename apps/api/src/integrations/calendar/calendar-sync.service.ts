import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { AuditService } from '../../core/audit/audit.service';
import type { ICalendarProvider } from './calendar-provider.interface';
import { GoogleCalendarProvider } from './providers/google-calendar.provider';
import { MicrosoftCalendarProvider } from './providers/microsoft-calendar.provider';

@Injectable()
export class CalendarSyncService {
  private readonly providers: Record<string, ICalendarProvider>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
    private readonly audit: AuditService,
    private readonly googleProvider: GoogleCalendarProvider,
    private readonly microsoftProvider: MicrosoftCalendarProvider,
  ) {
    this.providers = {
      GOOGLE: this.googleProvider,
      MICROSOFT: this.microsoftProvider,
    };
  }

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  private currentUser(): string {
    return this.tenant.getStore()?.userId ?? '';
  }

  private getProvider(name: string): ICalendarProvider {
    const provider = this.providers[name];
    if (!provider) throw new BadRequestException(`Unsupported provider: ${name}`);
    return provider;
  }

  async getAuthUrl(provider: string, redirectUri: string) {
    const p = this.getProvider(provider);
    const state = Buffer.from(JSON.stringify({
      workspaceId: this.requireWs(),
      userId: this.currentUser(),
    })).toString('base64');
    return { url: p.getAuthUrl(redirectUri, state) };
  }

  async createAccount(dto: {
    provider: string;
    code: string;
    redirectUri: string;
    calendarId: string;
    emailAddress: string;
  }) {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();
    const provider = this.getProvider(dto.provider);
    const tokens = await provider.exchangeCode(dto.code, dto.redirectUri);

    const account = await this.prisma.calendarAccount.create({
      data: {
        workspaceId,
        userId,
        provider: dto.provider as any,
        emailAddress: dto.emailAddress,
        credentials: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt.toISOString(),
        },
        calendarId: dto.calendarId,
        syncEnabled: true,
        syncDirection: 'BOTH',
        syncState: 'IDLE',
      },
    });

    await this.audit.log({
      entityType: 'CalendarAccount',
      entityId: account.id,
      action: 'CREATE',
      newValue: { provider: dto.provider, emailAddress: dto.emailAddress },
    });

    return account;
  }

  async listAccounts() {
    const workspaceId = this.requireWs();
    const userId = this.currentUser();
    return this.prisma.calendarAccount.findMany({
      where: { workspaceId, userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async syncInbound(account: any) {
    const provider = this.getProvider(account.provider);
    const creds = account.credentials as any;

    let accessToken = creds.accessToken;
    if (new Date(creds.expiresAt) < new Date()) {
      const refreshed = await provider.refreshAccessToken(creds.refreshToken);
      accessToken = refreshed.accessToken;
      await this.prisma.calendarAccount.update({
        where: { id: account.id },
        data: {
          credentials: { ...creds, accessToken, expiresAt: refreshed.expiresAt.toISOString() },
        },
      });
    }

    const { events } = await provider.listEvents(accessToken, account.calendarId);

    for (const event of events) {
      const personId = event.attendees?.length
        ? await this.matchAttendee(account.workspaceId, event.attendees[0]!.email)
        : null;

      await this.prisma.calendarEvent.upsert({
        where: {
          calendarAccountId_externalId: {
            calendarAccountId: account.id,
            externalId: event.externalId,
          },
        },
        create: {
          workspaceId: account.workspaceId,
          calendarAccountId: account.id,
          externalId: event.externalId,
          title: event.title,
          description: event.description,
          startAt: new Date(event.startAt),
          endAt: new Date(event.endAt),
          location: event.location,
          attendees: event.attendees,
          personId,
          syncDirection: 'IN',
          lastSyncedAt: new Date(),
        },
        update: {
          title: event.title,
          description: event.description,
          startAt: new Date(event.startAt),
          endAt: new Date(event.endAt),
          location: event.location,
          attendees: event.attendees,
          personId,
          lastSyncedAt: new Date(),
        },
      });
    }

    await this.prisma.calendarAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date(), syncState: 'IDLE' },
    });
  }

  async syncOutbound(account: any) {
    const provider = this.getProvider(account.provider);
    const creds = account.credentials as any;

    const activities = await this.prisma.activity.findMany({
      where: {
        workspaceId: account.workspaceId,
        ownerId: account.userId,
        type: 'MEETING',
        startAt: { gte: new Date() },
      },
    });

    for (const activity of activities) {
      const existing = await this.prisma.calendarEvent.findFirst({
        where: { activityId: activity.id },
      });
      if (existing) continue;

      const created = await provider.createEvent(creds.accessToken, account.calendarId, {
        title: activity.subject,
        description: activity.description,
        startAt: activity.startAt.toISOString(),
        endAt: activity.endAt?.toISOString() ?? activity.startAt.toISOString(),
        attendees: [],
      });

      await this.prisma.calendarEvent.create({
        data: {
          workspaceId: account.workspaceId,
          calendarAccountId: account.id,
          externalId: created.externalId,
          title: activity.subject,
          startAt: activity.startAt,
          endAt: activity.endAt ?? activity.startAt,
          activityId: activity.id,
          syncDirection: 'OUT',
          lastSyncedAt: new Date(),
        },
      });
    }
  }

  async matchAttendee(workspaceId: string, email: string): Promise<string | null> {
    const person = await this.prisma.person.findFirst({
      where: {
        workspaceId,
        emailNormalized: email.toLowerCase(),
      },
    });
    return person?.id ?? null;
  }
}
