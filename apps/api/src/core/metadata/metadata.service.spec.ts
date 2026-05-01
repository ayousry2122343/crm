import { Test } from '@nestjs/testing';
import { MetadataService } from './metadata.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

describe('MetadataService', () => {
  let service: MetadataService;
  let prisma: any;
  let tenant: TenantContextService;

  beforeEach(async () => {
    prisma = { customFieldDef: { findMany: jest.fn().mockResolvedValue([]) } };
    tenant = new TenantContextService();
    const moduleRef = await Test.createTestingModule({
      providers: [
        MetadataService,
        { provide: PrismaService, useValue: prisma },
        { provide: TenantContextService, useValue: tenant },
      ],
    }).compile();
    service = moduleRef.get(MetadataService);
    await service.onModuleInit();
  });

  it('returns the Person entity merged with no custom fields when none exist', async () => {
    await tenant.run(
      { workspaceId: 'ws_1', profileIds: [], permissionKeys: new Set() },
      async () => {
        const meta = await service.getEntity('Person');
        expect(meta.entityType).toBe('Person');
        expect(meta.labelSingular.ar).toBe('جهة اتصال');
        expect(meta.fields.find((f) => f.key === 'fullName')).toBeDefined();
      },
    );
  });

  it('merges custom fields into the entity', async () => {
    prisma.customFieldDef.findMany.mockResolvedValueOnce([
      {
        id: 'cf_1',
        entityType: 'Person',
        key: 'industry',
        type: 'TEXT',
        label: { ar: 'الصناعة', en: 'Industry' },
        required: false,
        unique: false,
        indexed: true,
        default: null,
        options: null,
        validation: null,
        helpText: null,
        visibleToProfileIds: [],
        editableByProfileIds: [],
        formulaExpr: null,
        rollupConfig: null,
      },
    ]);
    await tenant.run(
      { workspaceId: 'ws_1', profileIds: [], permissionKeys: new Set() },
      async () => {
        const meta = await service.getEntity('Person');
        expect(meta.fields.find((f) => f.key === 'industry')).toBeDefined();
      },
    );
  });

  it('throws NotFound for unknown entityType', async () => {
    await tenant.run(
      { workspaceId: 'ws_1', profileIds: [], permissionKeys: new Set() },
      async () => {
        await expect(service.getEntity('NonExistent')).rejects.toThrow(/not found/i);
      },
    );
  });

  it('listEntities returns all built-in entities', async () => {
    await tenant.run(
      { workspaceId: 'ws_1', profileIds: [], permissionKeys: new Set() },
      async () => {
        const list = await service.listEntities();
        const types = list.map((e) => e.entityType);
        expect(types).toContain('Person');
        expect(types).toContain('Company');
        expect(types).toContain('Deal');
        expect(types).toContain('Activity');
      },
    );
  });
});
