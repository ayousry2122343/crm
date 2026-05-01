import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { PERMISSION_KEY } from './requires-permission.decorator';
import { PERMISSIONS } from './permissions.constants';

function makeCtx(user: any): ExecutionContext {
  const req: any = { user };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => () => {},
    getClass: () => function () {},
  } as any;
}

describe('PermissionGuard', () => {
  let reflector: Reflector;
  let prisma: any;
  let guard: PermissionGuard;

  beforeEach(() => {
    reflector = new Reflector();
    prisma = {
      userProfile: {
        findMany: jest.fn(),
      },
    };
    guard = new PermissionGuard(reflector, prisma);
  });

  it('passes through when no @RequiresPermission decorator', async () => {
    const ctx = makeCtx({ userId: 'u_1', workspaceId: 'ws_1' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('passes through when decorator returns empty array', async () => {
    const ctx = makeCtx({ userId: 'u_1', workspaceId: 'ws_1' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('allows when user has required permission via profile', async () => {
    const ctx = makeCtx({ userId: 'u_1', workspaceId: 'ws_1' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PERMISSIONS.PERSON_READ]);
    prisma.userProfile.findMany.mockResolvedValue([
      { profileId: 'p_1', profile: { permissions: [PERMISSIONS.PERSON_READ, PERMISSIONS.PERSON_WRITE] } },
    ]);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('denies when user lacks required permission', async () => {
    const ctx = makeCtx({ userId: 'u_1', workspaceId: 'ws_1' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PERMISSIONS.DEAL_DELETE]);
    prisma.userProfile.findMany.mockResolvedValue([
      { profileId: 'p_1', profile: { permissions: [PERMISSIONS.PERSON_READ] } },
    ]);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('denies when user has no profiles at all', async () => {
    const ctx = makeCtx({ userId: 'u_1', workspaceId: 'ws_1' });
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PERMISSIONS.PERSON_READ]);
    prisma.userProfile.findMany.mockResolvedValue([]);
    await expect(guard.canActivate(ctx)).rejects.toThrow(/missing permission/);
  });

  it('throws when no authenticated user on request', async () => {
    const ctx = makeCtx(undefined);
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PERMISSIONS.PERSON_READ]);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('attaches granted permissions Set + profileIds to request', async () => {
    const req: any = { user: { userId: 'u_1', workspaceId: 'ws_1' } };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({}), getNext: () => ({}) }),
      getHandler: () => () => {},
      getClass: () => function () {},
    } as any;
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PERMISSIONS.PERSON_READ]);
    prisma.userProfile.findMany.mockResolvedValue([
      { profileId: 'p_1', profile: { permissions: [PERMISSIONS.PERSON_READ] } },
      { profileId: 'p_2', profile: { permissions: [PERMISSIONS.DEAL_READ] } },
    ]);
    await guard.canActivate(ctx);
    expect(req.permissions instanceof Set).toBe(true);
    expect((req.permissions as Set<string>).has(PERMISSIONS.PERSON_READ)).toBe(true);
    expect((req.permissions as Set<string>).has(PERMISSIONS.DEAL_READ)).toBe(true);
    expect(req.profileIds).toEqual(['p_1', 'p_2']);
  });
});
