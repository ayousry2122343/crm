import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

describe('AuthService.signUp', () => {
  let service: AuthService;
  let prisma: any;

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
        })
      ),
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: 'rt_1' }),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        TenantContextService,
        { provide: PrismaService, useValue: prisma },
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

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        TenantContextService,
        { provide: PrismaService, useValue: prisma },
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
