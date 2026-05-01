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
