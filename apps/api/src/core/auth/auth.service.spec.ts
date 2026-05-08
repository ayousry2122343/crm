import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { EmailService } from '../email/email.service';

const emailMock = () => ({ send: jest.fn().mockResolvedValue({ messageId: 'm' }) });

describe('AuthService.signUp', () => {
  let service: AuthService;
  let prisma: any;
  let email: any;

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'test_access';
    process.env.JWT_REFRESH_SECRET = 'test_refresh';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '2592000';

    prisma = {
      $transaction: jest.fn(async (cb: any) =>
        cb({
          workspace: {
            create: jest.fn().mockResolvedValue({ id: 'ws_1', slug: 'acme-abc123', name: 'Acme' }),
          },
          user: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest
              .fn()
              .mockResolvedValue({ id: 'u_1', email: 'a@b.com', emailNormalized: 'a@b.com', fullName: 'A', workspaceId: 'ws_1' }),
          },
          profile: {
            create: jest.fn().mockResolvedValue({ id: 'p_admin' }),
          },
          userProfile: {
            create: jest.fn().mockResolvedValue({ id: 'up_1' }),
          },
        })
      ),
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt_1' }),
      },
    };
    email = emailMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        TenantContextService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('creates workspace + user and returns tokens', async () => {
    const result = await service.signUp({
      email: 'A@B.COM',
      password: 'hunter2!',
      fullName: 'Ahmed',
      workspaceName: 'Acme',
    });
    expect(result.user.id).toBe('u_1');
    expect(result.workspace.id).toBe('ws_1');
    expect(result.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(typeof result.refreshToken).toBe('string');
    expect(result.refreshToken.length).toBeGreaterThan(20);
  });

  it('signUp seeds default profiles (Admin, Sales Manager, Sales Rep) + assigns Admin to creator', async () => {
    const profileCreates: any[] = [];
    const userProfileCreates: any[] = [];
    prisma.$transaction.mockImplementationOnce(async (cb: any) =>
      cb({
        workspace: {
          create: jest.fn().mockResolvedValue({ id: 'ws_seed', slug: 'seed-co', name: 'SeedCo' }),
        },
        user: {
          create: jest.fn().mockResolvedValue({
            id: 'u_seed',
            email: 'a@b.com',
            emailNormalized: 'a@b.com',
            fullName: 'A',
            workspaceId: 'ws_seed',
          }),
        },
        profile: {
          create: jest.fn().mockImplementation(async (args: any) => {
            profileCreates.push(args.data);
            return { id: `p_${profileCreates.length}`, ...args.data };
          }),
        },
        userProfile: {
          create: jest.fn().mockImplementation(async (args: any) => {
            userProfileCreates.push(args.data);
            return { id: 'up_1', ...args.data };
          }),
        },
      })
    );
    await service.signUp({
      email: 'a@b.com',
      password: 'hunter2!',
      fullName: 'A',
      workspaceName: 'SeedCo',
    });
    const names = profileCreates.map((p) => p.name).sort();
    expect(names).toEqual(['Admin', 'Sales Manager', 'Sales Rep']);
    const adminProfile = profileCreates.find((p) => p.name === 'Admin');
    expect(adminProfile.isSystem).toBe(true);
    expect(adminProfile.permissions).toEqual(expect.arrayContaining(['workspace:admin', 'person:read']));
    expect(userProfileCreates.length).toBe(1);
    expect(userProfileCreates[0].userId).toBe('u_seed');
    expect(userProfileCreates[0].workspaceId).toBe('ws_seed');
    // The userProfile should reference the Admin profile id (first created → 'p_1')
    expect(userProfileCreates[0].profileId).toBe('p_1');
  });

  it('lowercases the email when normalising', async () => {
    await service.signUp({
      email: 'Mixed@Case.com',
      password: 'hunter2!',
      fullName: 'X',
      workspaceName: 'Y',
    });
    // The transaction callback was invoked with a tx; the user.create should have been called with emailNormalized lowercased.
    const txCall = prisma.$transaction.mock.calls[0][0];
    // We can't easily inspect the inner mock call after the fact because we constructed the tx in beforeEach. So we re-run with a custom tx mock:
    let normalisedEmailSeen = '';
    prisma.$transaction.mockImplementationOnce(async (cb: any) =>
      cb({
        workspace: {
          create: jest.fn().mockResolvedValue({ id: 'ws_2', slug: 'y-xx', name: 'Y' }),
        },
        user: {
          create: jest.fn().mockImplementation(async ({ data }: any) => {
            normalisedEmailSeen = data.emailNormalized;
            return { id: 'u_2', email: data.email, emailNormalized: data.emailNormalized, fullName: 'X', workspaceId: 'ws_2' };
          }),
        },
        profile: {
          create: jest.fn().mockResolvedValue({ id: 'p_admin' }),
        },
        userProfile: {
          create: jest.fn().mockResolvedValue({ id: 'up_1' }),
        },
      })
    );
    await service.signUp({
      email: 'AnotherCase@HOST.com',
      password: 'hunter2!',
      fullName: 'X',
      workspaceName: 'Z',
    });
    expect(normalisedEmailSeen).toBe('anothercase@host.com');
  });
});

describe('AuthService.login + refresh + logout', () => {
  let service: AuthService;
  let prisma: any;
  let email: any;

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'test_access';
    process.env.JWT_REFRESH_SECRET = 'test_refresh';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '2592000';

    prisma = {
      workspace: { findUnique: jest.fn() },
      user: { findFirst: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt_new' }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    email = emailMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        TenantContextService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('login returns tokens for valid credentials', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ id: 'ws_1', slug: 'acme', name: 'Acme' });
    // hash a real password so verifyPassword can succeed
    const argon2 = await import('argon2');
    const hash = await argon2.hash('hunter2!', { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    prisma.user.findFirst.mockResolvedValue({
      id: 'u_1',
      email: 'a@b.com',
      emailNormalized: 'a@b.com',
      fullName: 'A',
      workspaceId: 'ws_1',
      passwordHash: hash,
      status: 'ACTIVE',
    });
    const result = await service.login({ email: 'a@b.com', password: 'hunter2!', workspaceSlug: 'acme' });
    expect(result.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(typeof result.refreshToken).toBe('string');
    expect(result.user.id).toBe('u_1');
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u_1' }, data: { lastLoginAt: expect.any(Date) } });
  });

  it('login throws Unauthorized on bad password', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ id: 'ws_1', slug: 'acme', name: 'Acme' });
    const argon2 = await import('argon2');
    const hash = await argon2.hash('correct!', { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    prisma.user.findFirst.mockResolvedValue({
      id: 'u_1', email: 'a@b.com', emailNormalized: 'a@b.com', fullName: 'A',
      workspaceId: 'ws_1', passwordHash: hash, status: 'ACTIVE',
    });
    await expect(service.login({ email: 'a@b.com', password: 'wrong!', workspaceSlug: 'acme' })).rejects.toThrow(/invalid credentials/);
  });

  it('login throws Unauthorized on disabled user', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ id: 'ws_1', slug: 'acme', name: 'Acme' });
    const argon2 = await import('argon2');
    const hash = await argon2.hash('hunter2!', { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    prisma.user.findFirst.mockResolvedValue({
      id: 'u_1', email: 'a@b.com', emailNormalized: 'a@b.com', fullName: 'A',
      workspaceId: 'ws_1', passwordHash: hash, status: 'DISABLED',
    });
    await expect(service.login({ email: 'a@b.com', password: 'hunter2!', workspaceSlug: 'acme' })).rejects.toThrow(/disabled/);
  });

  it('login throws Unauthorized when workspace not found', async () => {
    prisma.workspace.findUnique.mockResolvedValue(null);
    await expect(service.login({ email: 'a@b.com', password: 'hunter2!', workspaceSlug: 'nope' })).rejects.toThrow(/invalid credentials/);
  });

  it('refresh rotates token and returns new pair', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt_1',
      userId: 'u_1',
      workspaceId: 'ws_1',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const result = await service.refresh({ refreshToken: 'sometoken' });
    expect(result.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(typeof result.refreshToken).toBe('string');
    expect(prisma.refreshToken.update).toHaveBeenCalledWith({
      where: { id: 'rt_1' },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('refresh throws when token revoked', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt_1', userId: 'u_1', workspaceId: 'ws_1',
      revokedAt: new Date(Date.now() - 1000), expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(service.refresh({ refreshToken: 'x' })).rejects.toThrow(/invalid refresh token/);
  });

  it('refresh throws when token expired', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      id: 'rt_1', userId: 'u_1', workspaceId: 'ws_1',
      revokedAt: null, expiresAt: new Date(Date.now() - 1000),
    });
    await expect(service.refresh({ refreshToken: 'x' })).rejects.toThrow(/invalid refresh token/);
  });

  it('logout marks the matching token revoked', async () => {
    const result = await service.logout('sometoken');
    expect(result.ok).toBe(true);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
  });
});

describe('AuthService.requestEmailVerification + confirmEmailVerification', () => {
  let service: AuthService;
  let prisma: any;
  let email: any;

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'test_access';
    process.env.APP_BASE_URL = 'http://localhost:5174';

    prisma = {
      emailVerificationToken: {
        create: jest.fn().mockResolvedValue({ id: 'evt_1' }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn(async (ops: any[]) => {
        // emulate $transaction([...]) — return the array of resolved promises
        return Promise.all(ops);
      }),
    };
    email = emailMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        TenantContextService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('requestEmailVerification creates a token and sends an email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u_1', email: 'a@b.com' });
    await service.requestEmailVerification('u_1', 'ws_1');
    expect(prisma.emailVerificationToken.create).toHaveBeenCalled();
    const createArgs = prisma.emailVerificationToken.create.mock.calls[0][0];
    expect(createArgs.data.userId).toBe('u_1');
    expect(createArgs.data.workspaceId).toBe('ws_1');
    expect(typeof createArgs.data.tokenHash).toBe('string');
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@b.com',
        subject: expect.stringContaining('Confirm'),
      })
    );
  });

  it('confirmEmailVerification throws on invalid token', async () => {
    prisma.emailVerificationToken.findUnique.mockResolvedValue(null);
    await expect(service.confirmEmailVerification('bad')).rejects.toThrow(UnauthorizedException);
  });

  it('confirmEmailVerification throws on expired token', async () => {
    prisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 'evt_1',
      userId: 'u_1',
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(service.confirmEmailVerification('expired')).rejects.toThrow(/invalid or expired/);
  });

  it('confirmEmailVerification consumes token and sets emailVerifiedAt', async () => {
    prisma.emailVerificationToken.findUnique.mockResolvedValue({
      id: 'evt_1',
      userId: 'u_1',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const result = await service.confirmEmailVerification('valid');
    expect(result.ok).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});

describe('AuthService.requestPasswordReset + confirmPasswordReset', () => {
  let service: AuthService;
  let prisma: any;
  let email: any;

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'test_access';
    process.env.APP_BASE_URL = 'http://localhost:5174';

    prisma = {
      workspace: { findUnique: jest.fn() },
      user: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      passwordResetToken: {
        create: jest.fn().mockResolvedValue({ id: 'prt_1' }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      refreshToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
    };
    email = emailMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        TenantContextService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('requestPasswordReset returns ok even if workspace not found (no enumeration)', async () => {
    prisma.workspace.findUnique.mockResolvedValue(null);
    const result = await service.requestPasswordReset('nope', 'a@b.com');
    expect(result.ok).toBe(true);
    expect(email.send).not.toHaveBeenCalled();
  });

  it('requestPasswordReset returns ok even if user not found (no enumeration)', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ id: 'ws_1', slug: 'acme', name: 'Acme' });
    prisma.user.findFirst.mockResolvedValue(null);
    const result = await service.requestPasswordReset('acme', 'missing@x.com');
    expect(result.ok).toBe(true);
    expect(email.send).not.toHaveBeenCalled();
  });

  it('requestPasswordReset creates token + sends email when user found', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ id: 'ws_1', slug: 'acme', name: 'Acme' });
    prisma.user.findFirst.mockResolvedValue({
      id: 'u_1',
      email: 'a@b.com',
      emailNormalized: 'a@b.com',
      workspaceId: 'ws_1',
    });
    const result = await service.requestPasswordReset('acme', 'a@b.com');
    expect(result.ok).toBe(true);
    expect(prisma.passwordResetToken.create).toHaveBeenCalled();
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'a@b.com',
        subject: expect.stringContaining('Password Reset'),
      })
    );
  });

  it('confirmPasswordReset throws on invalid token', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue(null);
    await expect(service.confirmPasswordReset('bad', 'newpass!!')).rejects.toThrow(UnauthorizedException);
  });

  it('confirmPasswordReset rotates password and revokes refresh tokens', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'prt_1',
      userId: 'u_1',
      consumedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    const result = await service.confirmPasswordReset('valid', 'newpass!!');
    expect(result.ok).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('confirmPasswordReset throws on expired token', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'prt_1',
      userId: 'u_1',
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(service.confirmPasswordReset('expired', 'newpass!!')).rejects.toThrow(/invalid or expired/);
  });

  it('confirmPasswordReset throws on already consumed token', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'prt_1',
      userId: 'u_1',
      consumedAt: new Date(Date.now() - 5000),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(service.confirmPasswordReset('consumed', 'newpass!!')).rejects.toThrow(/invalid or expired/);
  });
});

describe('AuthService edge-cases', () => {
  let service: AuthService;
  let prisma: any;
  let email: any;

  beforeEach(async () => {
    process.env.JWT_ACCESS_SECRET = 'test_access';
    process.env.JWT_REFRESH_SECRET = 'test_refresh';
    process.env.JWT_ACCESS_TTL = '900';
    process.env.JWT_REFRESH_TTL = '2592000';

    prisma = {
      workspace: { findUnique: jest.fn() },
      user: { findFirst: jest.fn(), update: jest.fn().mockResolvedValue({}) },
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt_new' }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    email = emailMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        TenantContextService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: email },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('login throws when user not found', async () => {
    prisma.workspace.findUnique.mockResolvedValue({ id: 'ws_1', slug: 'acme', name: 'Acme' });
    prisma.user.findFirst.mockResolvedValue(null);
    await expect(
      service.login({ email: 'nobody@test.com', password: 'x', workspaceSlug: 'acme' }),
    ).rejects.toThrow(/invalid credentials/);
  });

  it('refresh throws when token not found', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue(null);
    await expect(service.refresh({ refreshToken: 'missing' })).rejects.toThrow(/invalid refresh token/);
  });
});
