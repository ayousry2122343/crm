import { CalendarSyncService } from './calendar-sync.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

function makePrisma() {
  return {
    calendarAccount: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    calendarEvent: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    activity: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    person: {
      findFirst: jest.fn(),
    },
  };
}

function makeAudit() {
  return { log: jest.fn().mockResolvedValue(undefined) };
}

function makeGoogleProvider() {
  return {
    getAuthUrl: jest.fn().mockReturnValue('https://accounts.google.com/o/oauth2/auth?...'),
    exchangeCode: jest.fn().mockResolvedValue({
      accessToken: 'google_at',
      refreshToken: 'google_rt',
      expiresAt: new Date(Date.now() + 3600_000),
    }),
    refreshAccessToken: jest.fn().mockResolvedValue({
      accessToken: 'google_at_new',
      expiresAt: new Date(Date.now() + 3600_000),
    }),
    listEvents: jest.fn().mockResolvedValue({
      events: [
        {
          externalId: 'gcal_ev_1',
          title: 'Team Standup',
          startAt: '2026-06-01T09:00:00Z',
          endAt: '2026-06-01T09:30:00Z',
          attendees: [{ email: 'ahmed@test.com' }],
          updatedAt: '2026-05-30T10:00:00Z',
        },
      ],
      nextSyncToken: 'sync_tok_1',
    }),
    createEvent: jest.fn().mockResolvedValue({ externalId: 'gcal_new_1' }),
  };
}

function makeMicrosoftProvider() {
  return {
    getAuthUrl: jest.fn().mockReturnValue('https://login.microsoftonline.com/...'),
    exchangeCode: jest.fn().mockResolvedValue({
      accessToken: 'ms_at',
      refreshToken: 'ms_rt',
      expiresAt: new Date(Date.now() + 3600_000),
    }),
    listEvents: jest.fn().mockResolvedValue({ events: [], nextSyncToken: null }),
  };
}

function buildSvc() {
  const prisma = makePrisma();
  const tenant = new TenantContextService();
  const audit = makeAudit();
  const google = makeGoogleProvider();
  const microsoft = makeMicrosoftProvider();
  const svc = new CalendarSyncService(
    prisma as any,
    tenant,
    audit as any,
    google as any,
    microsoft as any,
  );
  return { svc, tenant, prisma, audit, google, microsoft };
}

const ctx = (workspaceId = 'ws_1', userId = 'u_1') => ({
  workspaceId,
  userId,
  profileIds: [] as string[],
  permissionKeys: new Set<string>(),
});

describe('CalendarSyncService', () => {
  describe('createAccount', () => {
    it('creates calendar account after OAuth exchange', async () => {
      const { svc, tenant, prisma, google } = buildSvc();
      prisma.calendarAccount.create.mockResolvedValue({
        id: 'ca_1',
        provider: 'GOOGLE',
        emailAddress: 'ahmed@test.com',
      });

      await tenant.run(ctx(), async () => {
        const result = await svc.createAccount({
          provider: 'GOOGLE',
          code: 'auth_code_123',
          redirectUri: 'http://localhost:3000/callback',
          calendarId: 'primary',
          emailAddress: 'ahmed@test.com',
        });
        expect(result.provider).toBe('GOOGLE');
      });

      expect(google.exchangeCode).toHaveBeenCalledWith('auth_code_123', 'http://localhost:3000/callback');
      expect(prisma.calendarAccount.create).toHaveBeenCalled();
    });
  });

  describe('listAccounts', () => {
    it('lists accounts for current user', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.calendarAccount.findMany.mockResolvedValue([
        { id: 'ca_1', provider: 'GOOGLE', emailAddress: 'ahmed@test.com' },
      ]);

      await tenant.run(ctx(), async () => {
        const result = await svc.listAccounts();
        expect(result).toHaveLength(1);
      });

      const where = prisma.calendarAccount.findMany.mock.calls[0]![0].where;
      expect(where.workspaceId).toBe('ws_1');
      expect(where.userId).toBe('u_1');
    });
  });

  describe('syncInbound', () => {
    it('upserts calendar events from external provider', async () => {
      const { svc, tenant, prisma, google } = buildSvc();
      const account = {
        id: 'ca_1',
        workspaceId: 'ws_1',
        userId: 'u_1',
        provider: 'GOOGLE',
        credentials: { accessToken: 'at', refreshToken: 'rt', expiresAt: new Date(Date.now() + 3600_000).toISOString() },
        calendarId: 'primary',
        syncDirection: 'BOTH',
      };
      prisma.calendarEvent.upsert.mockResolvedValue({ id: 'ce_1' });
      prisma.person.findFirst.mockResolvedValue({ id: 'p_1' });
      prisma.calendarAccount.update.mockResolvedValue({ ...account, lastSyncAt: new Date() });

      await tenant.run(ctx(), async () => {
        await svc.syncInbound(account as any);
      });

      expect(google.listEvents).toHaveBeenCalledWith('at', 'primary');
      expect(prisma.calendarEvent.upsert).toHaveBeenCalled();
    });
  });

  describe('syncOutbound', () => {
    it('creates external events for unlinked activities', async () => {
      const { svc, tenant, prisma, google } = buildSvc();
      const account = {
        id: 'ca_1',
        workspaceId: 'ws_1',
        userId: 'u_1',
        provider: 'GOOGLE',
        credentials: { accessToken: 'at', refreshToken: 'rt', expiresAt: new Date(Date.now() + 3600_000).toISOString() },
        calendarId: 'primary',
        syncDirection: 'BOTH',
      };
      prisma.activity.findMany.mockResolvedValue([
        {
          id: 'act_1',
          type: 'MEETING',
          subject: 'Client call',
          startAt: new Date(),
          endAt: new Date(Date.now() + 3600_000),
        },
      ]);
      prisma.calendarEvent.findFirst.mockResolvedValue(null);
      prisma.calendarEvent.create.mockResolvedValue({ id: 'ce_new' });

      await tenant.run(ctx(), async () => {
        await svc.syncOutbound(account as any);
      });

      expect(google.createEvent).toHaveBeenCalled();
      expect(prisma.calendarEvent.create).toHaveBeenCalled();
    });
  });

  describe('attendeeMatching', () => {
    it('matches attendee email to Person', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.person.findFirst.mockResolvedValue({ id: 'p_1', email: 'ahmed@test.com' });

      await tenant.run(ctx(), async () => {
        const personId = await svc.matchAttendee('ws_1', 'ahmed@test.com');
        expect(personId).toBe('p_1');
      });
    });

    it('returns null for unmatched email', async () => {
      const { svc, tenant, prisma } = buildSvc();
      prisma.person.findFirst.mockResolvedValue(null);

      await tenant.run(ctx(), async () => {
        const personId = await svc.matchAttendee('ws_1', 'unknown@test.com');
        expect(personId).toBeNull();
      });
    });
  });
});
