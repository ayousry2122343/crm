import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { TenantModule } from '../core/tenant/tenant.module';
import { PrismaModule } from './prisma.module';

describe('Prisma tenant scoping (integration — requires DATABASE_URL)', () => {
  let prisma: PrismaService;
  let tenant: TenantContextService;
  let ws1Id: string;
  let ws2Id: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TenantModule, PrismaModule],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    tenant = moduleRef.get(TenantContextService);
    await prisma.onModuleInit();

    const ws1 = await prisma.workspace.create({
      data: { slug: `tenant-test-1-${Date.now()}`, name: 'WS1' },
    });
    const ws2 = await prisma.workspace.create({
      data: { slug: `tenant-test-2-${Date.now()}`, name: 'WS2' },
    });
    ws1Id = ws1.id;
    ws2Id = ws2.id;

    const u1 = await prisma.user.create({
      data: {
        workspaceId: ws1Id,
        email: 'a@ws1.com',
        emailNormalized: 'a@ws1.com',
        fullName: 'A',
        passwordHash: 'x',
      },
    });
    const u2 = await prisma.user.create({
      data: {
        workspaceId: ws2Id,
        email: 'b@ws2.com',
        emailNormalized: 'b@ws2.com',
        fullName: 'B',
        passwordHash: 'y',
      },
    });
    user1Id = u1.id;
    user2Id = u2.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [user1Id, user2Id] } } });
    await prisma.workspace.deleteMany({ where: { id: { in: [ws1Id, ws2Id] } } });
    await prisma.onModuleDestroy();
  });

  it('tenantClient.user.findMany returns only ws1 users when context is ws1', async () => {
    await tenant.run(
      { workspaceId: ws1Id, profileIds: [], permissionKeys: new Set() },
      async () => {
        const users = await prisma.tenantClient.user.findMany();
        expect(users.every((u) => u.workspaceId === ws1Id)).toBe(true);
        expect(users.find((u) => u.id === user1Id)).toBeDefined();
        expect(users.find((u) => u.id === user2Id)).toBeUndefined();
      }
    );
  });

  it('tenantClient.user.findMany returns only ws2 users when context is ws2', async () => {
    await tenant.run(
      { workspaceId: ws2Id, profileIds: [], permissionKeys: new Set() },
      async () => {
        const users = await prisma.tenantClient.user.findMany();
        expect(users.every((u) => u.workspaceId === ws2Id)).toBe(true);
        expect(users.find((u) => u.id === user2Id)).toBeDefined();
        expect(users.find((u) => u.id === user1Id)).toBeUndefined();
      }
    );
  });

  it('bare prisma.user.findMany sees both workspaces (no scoping)', async () => {
    const all = await prisma.user.findMany({
      where: { id: { in: [user1Id, user2Id] } },
    });
    expect(all.length).toBe(2);
  });
});
