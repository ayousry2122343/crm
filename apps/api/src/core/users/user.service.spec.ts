import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../email/email.service';
import { AuthService } from '../auth/auth.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: any;
  let audit: any;
  let email: any;
  let auth: any;
  let tenant: TenantContextService;

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'test_access';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '2592000';
    process.env.APP_BASE_URL = 'http://localhost:5174';

    prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
      },
      userInvite: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        create: jest
          .fn()
          .mockResolvedValue({ id: 'inv_1', email: 'a@b.com', expiresAt: new Date() }),
        update: jest.fn(),
      },
      userProfile: {
        create: jest.fn().mockResolvedValue({ id: 'up_1' }),
      },
      profile: {
        findFirst: jest.fn().mockResolvedValue({ id: 'p_rep' }),
      },
      workspace: {
        findUnique: jest.fn().mockResolvedValue({ id: 'ws_1', slug: 'acme', name: 'Acme' }),
      },
      $transaction: jest.fn(async (cb: any) => {
        if (typeof cb === 'function') {
          return cb({
            user: prisma.user,
            userInvite: prisma.userInvite,
            userProfile: prisma.userProfile,
            profile: prisma.profile,
          });
        }
        return Promise.all(cb);
      }),
    };
    audit = { log: jest.fn(), logUpdate: jest.fn() };
    email = { send: jest.fn().mockResolvedValue({ messageId: 'm' }) };
    auth = {
      signAccessToken: jest.fn().mockReturnValue('access.tok.x'),
      issueRefreshToken: jest.fn().mockResolvedValue('refresh-token-raw'),
    };
    tenant = new TenantContextService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenant },
        { provide: AuditService, useValue: audit },
        { provide: EmailService, useValue: email },
        { provide: AuthService, useValue: auth },
      ],
    }).compile();
    service = moduleRef.get(UserService);
  });

  function inWs<T>(fn: () => T) {
    return tenant.run(
      { workspaceId: 'ws_1', userId: 'inviter_1', profileIds: [], permissionKeys: new Set() },
      fn,
    );
  }

  describe('invite', () => {
    it('creates a UserInvite row and sends an email', async () => {
      await inWs(() =>
        service.invite({ email: 'NewBie@Example.com', fullName: 'Newbie' }, 'inviter_1'),
      );
      expect(prisma.userInvite.create).toHaveBeenCalled();
      const createArgs = prisma.userInvite.create.mock.calls[0][0];
      expect(createArgs.data.email).toBe('NewBie@Example.com');
      expect(createArgs.data.emailNormalized).toBe('newbie@example.com');
      expect(createArgs.data.fullName).toBe('Newbie');
      expect(createArgs.data.workspaceId).toBe('ws_1');
      expect(createArgs.data.invitedById).toBe('inviter_1');
      expect(typeof createArgs.data.tokenHash).toBe('string');
      expect(createArgs.data.tokenHash.length).toBeGreaterThan(20);
      const expiresAt: Date = createArgs.data.expiresAt;
      // Should be ~7 days in the future
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 24 * 60 * 60 * 1000);
      expect(email.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'NewBie@Example.com',
        }),
      );
    });

    it('throws Conflict if a user with that email already exists in the workspace', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'existing_u' });
      await inWs(async () => {
        await expect(
          service.invite({ email: 'existing@example.com', fullName: 'Existing' }, 'inviter_1'),
        ).rejects.toThrow(ConflictException);
      });
    });

    it('throws Conflict if a pending invite already exists', async () => {
      prisma.userInvite.findFirst.mockResolvedValue({ id: 'inv_existing', acceptedAt: null });
      await inWs(async () => {
        await expect(
          service.invite({ email: 'pending@example.com', fullName: 'Pending' }, 'inviter_1'),
        ).rejects.toThrow(ConflictException);
      });
    });
  });

  describe('acceptInvite', () => {
    it('accepts a valid token: creates User + signs tokens + marks invite acceptedAt', async () => {
      prisma.userInvite.findUnique.mockResolvedValue({
        id: 'inv_1',
        workspaceId: 'ws_1',
        email: 'newbie@example.com',
        emailNormalized: 'newbie@example.com',
        fullName: 'Newbie',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      prisma.user.create.mockResolvedValue({
        id: 'u_new',
        email: 'newbie@example.com',
        emailNormalized: 'newbie@example.com',
        fullName: 'Newbie',
        workspaceId: 'ws_1',
      });
      const result = await service.acceptInvite('rawtoken', 'newpass!!');
      expect(result.user.id).toBe('u_new');
      expect(result.accessToken).toBe('access.tok.x');
      expect(result.refreshToken).toBe('refresh-token-raw');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            workspaceId: 'ws_1',
            email: 'newbie@example.com',
            emailNormalized: 'newbie@example.com',
            fullName: 'Newbie',
            status: 'ACTIVE',
            emailVerifiedAt: expect.any(Date),
          }),
        }),
      );
      expect(prisma.userInvite.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv_1' },
          data: expect.objectContaining({ acceptedAt: expect.any(Date) }),
        }),
      );
    });

    it('throws Unauthorized when token is invalid/missing', async () => {
      prisma.userInvite.findUnique.mockResolvedValue(null);
      await expect(service.acceptInvite('bad', 'whatever!!')).rejects.toThrow(UnauthorizedException);
    });

    it('throws Unauthorized when invite already accepted', async () => {
      prisma.userInvite.findUnique.mockResolvedValue({
        id: 'inv_1',
        workspaceId: 'ws_1',
        email: 'a@b.com',
        emailNormalized: 'a@b.com',
        fullName: 'A',
        acceptedAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      await expect(service.acceptInvite('used', 'newpass!!')).rejects.toThrow(/expired/i);
    });

    it('throws Unauthorized when invite expired', async () => {
      prisma.userInvite.findUnique.mockResolvedValue({
        id: 'inv_1',
        workspaceId: 'ws_1',
        email: 'a@b.com',
        emailNormalized: 'a@b.com',
        fullName: 'A',
        acceptedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });
      await expect(service.acceptInvite('expired', 'newpass!!')).rejects.toThrow(/expired/i);
    });
  });

  describe('list', () => {
    it('returns active users + pending invites in the workspace', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u_1', email: 'a@b.com', fullName: 'A', status: 'ACTIVE' },
      ]);
      prisma.userInvite.findMany.mockResolvedValue([
        { id: 'inv_1', email: 'b@c.com', fullName: 'B', acceptedAt: null, expiresAt: new Date() },
      ]);
      const result = await inWs(() => service.list());
      expect(result.members.length).toBe(1);
      expect(result.invites.length).toBe(1);
    });
  });
});
