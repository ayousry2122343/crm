import { Test } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { TenantModule } from '../../core/tenant/tenant.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SearchService } from './search.service';

describe('SearchService (integration — requires DATABASE_URL)', () => {
  let prisma: PrismaService;
  let tenant: TenantContextService;
  let svc: SearchService;
  let workspaceId: string;
  let p1Id: string;
  let p2Id: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TenantModule, PrismaModule],
      providers: [SearchService],
    }).compile();
    prisma = moduleRef.get(PrismaService);
    tenant = moduleRef.get(TenantContextService);
    svc = moduleRef.get(SearchService);
    await prisma.onModuleInit();

    const ws = await prisma.workspace.create({
      data: { slug: `search-test-${Date.now()}`, name: 'SearchWS' },
    });
    workspaceId = ws.id;

    const p1 = await prisma.person.create({
      data: {
        workspaceId,
        firstName: 'Ahmed',
        lastName: 'Yousry',
        fullName: 'Ahmed Yousry',
        email: 'ahmed.yousry@example.com',
        emailNormalized: 'ahmed.yousry@example.com',
      },
    });
    const p2 = await prisma.person.create({
      data: {
        workspaceId,
        firstName: 'Sara',
        lastName: 'Mahmoud',
        fullName: 'Sara Mahmoud',
        email: 'sara.m@example.com',
        emailNormalized: 'sara.m@example.com',
      },
    });
    p1Id = p1.id;
    p2Id = p2.id;
  });

  afterAll(async () => {
    await prisma.person.deleteMany({ where: { id: { in: [p1Id, p2Id] } } });
    await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    await prisma.onModuleDestroy();
  });

  it('returns empty items for empty query', async () => {
    await tenant.run(
      { workspaceId, profileIds: [], permissionKeys: new Set() },
      async () => {
        const r = await svc.search('   ');
        expect(r.items).toEqual([]);
      },
    );
  });

  it('finds Person by fullName via FTS', async () => {
    await tenant.run(
      { workspaceId, profileIds: [], permissionKeys: new Set() },
      async () => {
        const r = await svc.search('Ahmed');
        expect(r.items.find((i: any) => i.id === p1Id)).toBeDefined();
        expect(r.items.find((i: any) => i.id === p2Id)).toBeUndefined();
      },
    );
  });

  it('finds Person by email tokens', async () => {
    await tenant.run(
      { workspaceId, profileIds: [], permissionKeys: new Set() },
      async () => {
        const r = await svc.search('sara.m');
        expect(r.items.find((i: any) => i.id === p2Id)).toBeDefined();
      },
    );
  });

  it('does not bleed across workspaces', async () => {
    await tenant.run(
      { workspaceId: 'OTHER_WS', profileIds: [], permissionKeys: new Set() },
      async () => {
        const r = await svc.search('Ahmed');
        expect(r.items.find((i: any) => i.id === p1Id)).toBeUndefined();
      },
    );
  });
});
